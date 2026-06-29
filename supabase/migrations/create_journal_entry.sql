-- =====================================================================
-- create_journal_entry  —  atomic write path for one journal entry
--
-- Writes, in a single transaction:
--   entries (parent) -> journal_entries (1:1 detail)
--   + find-or-create rows in people / actions / emotions / topics
--   + link rows in entry_people / entry_actions / entry_emotions / entry_topics
--
-- Call it AS the logged-in user (it reads auth.uid() itself).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. DEDUP GUARANTEE
-- One row per (user, name) per dimension — case-insensitive, and ignoring
-- soft-deleted rows. This is the constraint that makes "Sarah" exactly ONE
-- person across every entry, which is what makes correlation possible.
-- (Partial index: a previously soft-deleted name can be re-created fresh.)
-- ---------------------------------------------------------------------
create unique index if not exists people_user_lower_name_uniq
  on public.people  (user_id, lower(name)) where deleted_at is null;

create unique index if not exists actions_user_lower_name_uniq
  on public.actions (user_id, lower(name)) where deleted_at is null;

create unique index if not exists emotions_user_lower_name_uniq
  on public.emotions (user_id, lower(name)) where deleted_at is null;


-- ---------------------------------------------------------------------
-- 2. THE FUNCTION
-- ---------------------------------------------------------------------

-- Drop the old 6-arg overload first; CREATE OR REPLACE only replaces an
-- identical signature and would otherwise leave a stale overload in place.
drop function if exists public.create_journal_entry(
  text, text, jsonb, jsonb, jsonb, text
);

create or replace function public.create_journal_entry(
  p_text           text,
  p_summary        text  default null,
  p_people         jsonb default '[]'::jsonb,   -- [{ "name", "roles":[...] }]
  p_actions        jsonb default '[]'::jsonb,   -- [{ "name" }]
  p_emotions       jsonb default '[]'::jsonb,   -- [{ "name","valence","toward_person" }]
  p_topics         jsonb default '[]'::jsonb,   -- [{ "name" }]
  p_prompt_version text  default 'v1'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_source     constant text := 'llm';      -- tag rows as model-generated
  v_user       uuid := auth.uid();
  v_entry_id   uuid;
  v_person     jsonb;
  v_action     jsonb;
  v_emotion    jsonb;
  v_topic      jsonb;
  v_name       text;
  v_id         uuid;
  v_roles      text[];
  v_target     uuid;
  v_people_map jsonb := '{}'::jsonb;         -- lower(name) -> person_id (for emotion targets)
begin
  -- SECURITY DEFINER runs as the table owner and bypasses RLS, so THIS
  -- function is the gatekeeper: we trust only auth.uid(), and we stamp it
  -- onto every row. A caller cannot write data under someone else's id.
  if v_user is null then
    raise exception 'create_journal_entry: no authenticated user';
  end if;

  if not public.has_advanced_access() then
    raise exception 'create_journal_entry: advanced access required';
  end if;

  if p_text is null or btrim(p_text) = '' then
    raise exception 'create_journal_entry: text is required';
  end if;

  -- ---- parent + detail rows ----
  insert into public.entries (user_id, kind)
  values (v_user, 'journal')
  returning id into v_entry_id;

  insert into public.journal_entries
    (entry_id, user_id, text, summary, extraction_status, extracted_at, prompt_version)
  values
    (v_entry_id, v_user, p_text, nullif(btrim(p_summary), ''),
     'complete', now(), p_prompt_version);

  -- ---- people ----
  for v_person in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_people) = 'array' then p_people else '[]'::jsonb end
    ) as t(value)
  loop
    v_name := btrim(v_person->>'name');
    continue when v_name is null or v_name = '';

    -- find-or-create: insert, but if the name already exists just bump
    -- last_seen_at. DO UPDATE (not DO NOTHING) so RETURNING always gives us id.
    insert into public.people (user_id, name, source, last_seen_at)
    values (v_user, v_name, c_source, now())
    on conflict (user_id, (lower(name))) where deleted_at is null
      do update set last_seen_at = now()
    returning id into v_id;

    -- roles from the model, else fall back to the column's 'mentioned' default
    v_roles := coalesce(
      (select array_agg(r) from jsonb_array_elements_text(v_person->'roles') as r),
      array['mentioned']
    );

    insert into public.entry_people (entry_id, person_id, user_id, roles, source)
    values (v_entry_id, v_id, v_user, v_roles, c_source)
    on conflict (entry_id, person_id) do nothing;

    v_people_map := v_people_map || jsonb_build_object(lower(v_name), v_id::text);
  end loop;

  -- ---- actions ----
  for v_action in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_actions) = 'array' then p_actions else '[]'::jsonb end
    ) as t(value)
  loop
    v_name := btrim(v_action->>'name');
    continue when v_name is null or v_name = '';

    insert into public.actions (user_id, name, source, last_seen_at)
    values (v_user, v_name, c_source, now())
    on conflict (user_id, (lower(name))) where deleted_at is null
      do update set last_seen_at = now()
    returning id into v_id;

    insert into public.entry_actions (entry_id, action_id, user_id, source)
    values (v_entry_id, v_id, v_user, c_source)
    on conflict (entry_id, action_id) do nothing;
  end loop;

  -- ---- emotions ----
  for v_emotion in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_emotions) = 'array' then p_emotions else '[]'::jsonb end
    ) as t(value)
  loop
    v_name := btrim(v_emotion->>'name');
    continue when v_name is null or v_name = '';

    insert into public.emotions (user_id, name, valence, source, last_seen_at)
    values (
      v_user, v_name,
      -- model sends valence as -1.0..1.0; store as smallint -1 / 0 / 1.
      round((v_emotion->>'valence')::numeric)::smallint,
      c_source, now()
    )
    on conflict (user_id, (lower(name))) where deleted_at is null
      do update set last_seen_at = now()
    returning id into v_id;

    -- resolve the optional target person via the map built in the people loop
    v_target := nullif(v_people_map->>lower(btrim(v_emotion->>'toward_person')), '')::uuid;

    insert into public.entry_emotions
      (entry_id, emotion_id, user_id, target_person_id, source)
    values (v_entry_id, v_id, v_user, v_target, c_source)
    on conflict (entry_id, emotion_id) do nothing;  -- one emotion per entry (composite PK)
  end loop;

  -- ---- topics ----
  for v_topic in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_topics) = 'array' then p_topics else '[]'::jsonb end
    ) as t(value)
  loop
    v_name := btrim(v_topic->>'name');
    continue when v_name is null or v_name = '';

    insert into public.topics (user_id, name, source, last_seen_at)
    values (v_user, v_name, c_source, now())
    on conflict (user_id, (lower(name))) where deleted_at is null
      do update set last_seen_at = now()
    returning id into v_id;

    insert into public.entry_topics (entry_id, topic_id, user_id, source)
    values (v_entry_id, v_id, v_user, c_source)
    on conflict (entry_id, topic_id) do nothing;
  end loop;

  return v_entry_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. Allow logged-in users to call it.
-- ---------------------------------------------------------------------
grant execute on function public.create_journal_entry(
  text, text, jsonb, jsonb, jsonb, jsonb, text
) to authenticated;
