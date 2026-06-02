-- Universe — cloud sync schema (Phase: Supabase bridge)
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- The app stores each universe as one JSON document, addressed by a stable
-- client-generated id. This matches the local-first repository exactly, so the
-- whole app syncs with zero UI changes.

create table if not exists public.universes (
  id          text primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- PostgREST (the API layer) talks to Postgres as the `anon` role with the
-- publishable key. Grant it access to this table.
grant all on public.universes to anon, authenticated;

alter table public.universes enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️  TEMPORARY POLICY — no authentication yet.
--
-- This lets ANY holder of the publishable key read/write this table. The
-- publishable key ships in the browser bundle, so treat the data as effectively
-- public for now. Fine for development; NOT safe for real users.
--
-- Before launch, add Supabase Auth and replace the policy below with the
-- auth-scoped one at the bottom of this file.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "anon full access (temporary)" on public.universes;
create policy "anon full access (temporary)"
  on public.universes
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURE VERSION (enable once Supabase Auth is wired up):
--
--   1. Change the table's `id` to `uuid` and default it to auth.uid(), or add a
--      `user_id uuid references auth.users default auth.uid()` column.
--   2. In the client, set the repository's owner id to the authenticated user.
--   3. Replace the temporary policy with:
--
--   drop policy if exists "anon full access (temporary)" on public.universes;
--   create policy "owners manage their own universe"
--     on public.universes
--     for all
--     to authenticated
--     using  (id = auth.uid()::text)
--     with check (id = auth.uid()::text);
-- ─────────────────────────────────────────────────────────────────────────────
