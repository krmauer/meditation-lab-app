-- =====================================================================
-- 0003_alerts.sql
-- The single source of truth for every insight surfaced to a user.
--
-- BOTH the behavioral detectors (Project A) and the population stats
-- feature (Project B) write rows here. The bell, the /insights feed, and
-- (later) push notifications all READ from here. One table = one system.
--
-- WRITE PATH:  only the service-role orchestrator inserts rows.
--              (No user INSERT policy exists, so user inserts are denied.)
-- READ PATH:   a user reads their own rows, gated by advanced tier.
-- UPDATE PATH: a user may touch ONLY read_at / dismissed_at on their own
--              rows — enforced at the column level, not just by policy.
--
-- Safe to re-run: every statement is guarded.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. THE TABLE
-- ---------------------------------------------------------------------
create table if not exists public.alerts (
  id            uuid primary key default gen_random_uuid(),

  user_id       uuid not null
                  references auth.users (id) on delete cascade,

  -- which detector produced this row. the FRONTEND uses this to choose
  -- which alert card component to render (mirrors the backend registry).
  detector_key  text not null,

  -- what the alert is ABOUT. polymorphic: a person / action / emotion.
  -- nullable because not every future detector is tied to one subject.
  subject_type  text
                  check (subject_type in ('person','action','emotion')),
  subject_id    uuid,                       -- intentionally NO foreign key:
                                            -- it can point at three
                                            -- different tables, so a single
                                            -- FK can't express it.

  -- the anti-spam fingerprint. see the partial unique index in section 2.
  dedupe_key    text not null,

  -- flexible per-detector evidence: window dates, means, sample sizes,
  -- copy variables. jsonb because the shape differs by detector.
  -- not-null default so the frontend never has to null-check it.
  payload       jsonb not null default '{}'::jsonb,

  -- null read_at  => unread  => contributes to the bell count.
  read_at       timestamptz,

  -- set when the USER dismisses it, OR when auto-resolve clears it once
  -- the underlying condition recovers. this is what frees the dedupe slot.
  dismissed_at  timestamptz,

  created_at    timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. THE DEDUPE KEYSTONE  (the most important line in this file)
-- A user can have at most ONE live (un-dismissed) alert per dedupe_key.
--
-- The nightly job re-detects the same condition every night; this index
-- silently collapses repeat inserts (via `on conflict do nothing` in the
-- orchestrator) so the feed never gets spammed.
--
-- PARTIAL (`where dismissed_at is null`): the rule only governs LIVE rows.
-- Once an alert is dismissed/auto-resolved it vacates the slot, so the
-- SAME condition recurring later can fire a fresh alert. This is what makes
-- "fire on the transition, not the state" actually work across time.
--
-- NOTE: index name must stay `alerts_user_dedupe_live_uniq` to match what
-- is already live in Supabase — renaming it would make `db push` create a
-- second, redundant unique index.
-- ---------------------------------------------------------------------
create unique index if not exists alerts_user_dedupe_live_uniq
  on public.alerts (user_id, dedupe_key)
  where dismissed_at is null;

-- feed ordering: newest first, scoped per user.
create index if not exists alerts_user_created_idx
  on public.alerts (user_id, created_at desc);

-- bell count: cheap lookup of a user's unread, un-dismissed rows.
-- (Item 12's bell badge reads exactly this shape.)
create index if not exists alerts_user_unread_idx
  on public.alerts (user_id)
  where read_at is null and dismissed_at is null;


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- Net effect for an app user: (owns the row) AND (has advanced access).
-- The service role bypasses all of this and is the only writer.
-- ---------------------------------------------------------------------
alter table public.alerts enable row level security;

-- 3a. READ own rows. The feed relies on this — RLS auto-scopes every
--     query, so the frontend never writes `where user_id = ...` itself.
drop policy if exists alerts_select_own on public.alerts;
create policy alerts_select_own
  on public.alerts for select
  using (auth.uid() = user_id);

-- 3b. UPDATE own rows. PERMISSIVE half of the update path. The COLUMN-LEVEL
--     grant in section 4 is what actually limits this to read_at /
--     dismissed_at — a policy alone can't restrict *which columns* change.
drop policy if exists alerts_update_own on public.alerts;
create policy alerts_update_own
  on public.alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3c. Deliberately NO insert/delete policy for users:
--       => user INSERT / DELETE attempts are denied by RLS.
--       => rows are written only by the service-role orchestrator,
--          which bypasses RLS entirely.

-- 3d. Advanced-tier gate. RESTRICTIVE policies are AND-ed with the
--     permissive ones above, so a free user gets ZERO rows even via a
--     direct API call. Mirrors the pattern in 0002_access_tiers.sql.
drop policy if exists alerts_requires_advanced on public.alerts;
create policy alerts_requires_advanced
  on public.alerts
  as restrictive for all
  using (public.has_advanced_access())
  with check (public.has_advanced_access());


-- ---------------------------------------------------------------------
-- 4. GRANTS  (defense-in-depth at the column level)
-- CRITICAL: Supabase grants ALL on new public-schema tables to anon and
-- authenticated by DEFAULT. Grants are additive, so a narrow column grant
-- layered on top of that broad grant does NOTHING. We must REVOKE ALL
-- first, then hand back exactly what the app needs.
--
-- End state for `authenticated`: SELECT (all columns, RLS-scoped) plus
-- UPDATE on read_at / dismissed_at ONLY. No INSERT/DELETE/TRUNCATE — writes
-- are service-role only. A user cannot rewrite payload, detector_key, etc.,
-- because Postgres refuses at the column boundary, before RLS even runs.
-- `service_role` is untouched (it has its own grants + bypasses RLS), so the
-- orchestrator's nightly inserts still work. `anon` gets nothing.
-- ---------------------------------------------------------------------
revoke all on public.alerts from authenticated;
revoke all on public.alerts from anon;

grant select on public.alerts to authenticated;
grant update (read_at, dismissed_at) on public.alerts to authenticated;