-- =====================================================================
-- 0004_topics.sql
-- Adds the "topics" dimension (subjects of thought / live preoccupations)
-- as a structural twin of actions / entry_actions.
--
-- Intentional structural difference from actions:
--   • no `category` column — domain grouping is deferred out of scope
--
-- Safe to re-run: all statements are guarded (IF NOT EXISTS / OR REPLACE).
-- =====================================================================


-- ---- 1. topics table -----------------------------------------------
create table if not exists public.topics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  source       text not null default 'user'
                 check (source = any(array['user','llm','llm_confirmed'])),
  confidence   numeric check (confidence >= 0 and confidence <= 1),
  last_seen_at timestamptz default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create unique index if not exists topics_user_lower_name_uniq
  on public.topics (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists topics_user_name_unique
  on public.topics (user_id, lower(trim(both from name)))
  where deleted_at is null;

create index if not exists topics_user_recent
  on public.topics (user_id, last_seen_at desc)
  where deleted_at is null;

create or replace trigger topics_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();


-- ---- 2. entry_topics bridge table ----------------------------------
create table if not exists public.entry_topics (
  entry_id   uuid not null references public.entries(id)  on delete cascade,
  topic_id   uuid not null references public.topics(id)   on delete cascade,
  user_id    uuid not null,
  source     text not null default 'user'
               check (source = any(array['user','llm','llm_confirmed'])),
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  primary key (entry_id, topic_id)
);

create index if not exists entry_topics_topic on public.entry_topics (topic_id);
create index if not exists entry_topics_entry on public.entry_topics (entry_id);
create index if not exists entry_topics_user  on public.entry_topics (user_id);

create or replace trigger entry_topics_set_user_id
  before insert on public.entry_topics
  for each row execute function public.junction_set_user_id();

create or replace function public.bump_topic_last_seen()
returns trigger
language plpgsql
as $$
begin
  update public.topics set last_seen_at = now() where id = new.topic_id;
  return new;
end;
$$;

create or replace trigger entry_topics_bump_last_seen
  after insert on public.entry_topics
  for each row execute function public.bump_topic_last_seen();


-- ---- 3. RLS --------------------------------------------------------
alter table public.topics       enable row level security;
alter table public.entry_topics enable row level security;

drop policy if exists "users manage own topics" on public.topics;
create policy "users manage own topics"
  on public.topics for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists topics_requires_advanced on public.topics;
create policy topics_requires_advanced
  on public.topics as restrictive for all
  using (public.has_advanced_access())
  with check (public.has_advanced_access());

drop policy if exists "users manage own entry_topics" on public.entry_topics;
create policy "users manage own entry_topics"
  on public.entry_topics for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists entry_topics_requires_advanced on public.entry_topics;
create policy entry_topics_requires_advanced
  on public.entry_topics as restrictive for all
  using (public.has_advanced_access())
  with check (public.has_advanced_access());


-- ---- 4. Grants -----------------------------------------------------
-- anon / authenticated / service_role / postgres receive ALL via Supabase
-- default privileges on new public-schema tables — no explicit grant needed.
-- analyst_ro is a custom role with no auto-grant.
grant select on public.topics       to analyst_ro;
grant select on public.entry_topics to analyst_ro;
