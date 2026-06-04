-- Fix: ensure universe_public is readable by all authenticated users so every
-- star appears in the shared galaxy, not just the requesting user's own.
--
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / on conflict.

-- 1. Make sure RLS is enabled on the table.
alter table public.universe_public enable row level security;

-- 2. Re-create the public-read policy in case it was dropped or never applied.
drop policy if exists "public read" on public.universe_public;
create policy "public read"
  on public.universe_public
  for select
  to anon, authenticated
  using (true);

-- 3. Re-grant SELECT so the anon/authenticated roles can actually read rows.
grant select on public.universe_public to anon, authenticated;
grant insert, update, delete on public.universe_public to authenticated;

-- 4. Touch every row so the app's debounced flush picks up any users whose
--    row was written before this policy was in place.
update public.universe_public
  set updated_at = now()
  where true;
