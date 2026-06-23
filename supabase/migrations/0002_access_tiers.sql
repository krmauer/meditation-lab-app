-- =====================================================================
-- 0002_access_tiers.sql
-- Per-user access tier ('free' | 'advanced'); gates journal features at
-- the database level. PANAS stays open to everyone.
-- =====================================================================

-- 1. profiles: table already exists — just add the tier column --------
alter table public.profiles
  add column if not exists tier text not null default 'free'
    check (tier in ('free','advanced'));

alter table public.profiles enable row level security;

-- A user may READ their own profile (the app needs this to draw the UI).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

-- Deliberately NO insert/update/delete policy for users:
--   => any attempt by a user to change their own tier is denied by RLS.
--   => rows are created by the trigger below; tier is set from the dashboard
--      (Table Editor runs as service role and bypasses RLS).

-- 2. auto-create a 'free' profile on signup ---------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tier)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill any existing users
insert into public.profiles (id, tier)
select id, 'free' from auth.users
on conflict (id) do nothing;

-- 3. entitlement check used by RLS and the RPC ------------------------
create or replace function public.has_advanced_access()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select tier = 'advanced' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.has_advanced_access() from public;
grant execute on function public.has_advanced_access() to authenticated;

-- 4a. gate leaf journal tables (entirely advanced-only) ---------------
-- RESTRICTIVE policies are AND-ed with the existing "owns the row" policies.
-- Net rule on each table: owns the row AND has advanced access.
do $$
declare t text;
begin
  foreach t in array array[
    'journal_entries','people','actions','emotions',
    'entry_people','entry_actions','entry_emotions'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_requires_advanced', t);
    execute format($f$
      create policy %I on public.%I
        as restrictive for all
        using (public.has_advanced_access())
        with check (public.has_advanced_access());
    $f$, t || '_requires_advanced', t);
  end loop;
end $$;

-- 4b. entries supertable: gate only the journal rows ------------------
-- PANAS rows (kind <> 'journal') stay open to free users.
drop policy if exists entries_journal_requires_advanced on public.entries;
create policy entries_journal_requires_advanced
  on public.entries
  as restrictive for all
  using (kind <> 'journal' or public.has_advanced_access())
  with check (kind <> 'journal' or public.has_advanced_access());
