-- Cleanup: correct realtime subscription and harden universe_public write policy.
--
-- What this fixes:
--   1. Migration 0002 added `universes` (the private table) to the realtime
--      publication. The app only subscribes to `universe_public` changes, so this
--      generates unnecessary traffic. Remove it.
--   2. Migration 0005 re-created the "public read" SELECT policy on
--      universe_public but did not re-create the write policy. This migration
--      re-asserts it idempotently so the table is always self-consistent after
--      any future policy audit or re-run.

-- ─── 1. Remove private universes table from realtime ─────────────────────────
-- Safe no-op if the table was already removed.
do $$
begin
  alter publication supabase_realtime drop table public.universes;
exception when undefined_table or invalid_parameter_value then
  null; -- not in the publication — nothing to do
end;
$$;

-- ─── 2. Ensure authenticated owners can write their own universe_public row ───
drop policy if exists "owners manage their public universe" on public.universe_public;
create policy "owners manage their public universe"
  on public.universe_public
  for all
  to authenticated
  using  (id = auth.uid()::text)
  with check (id = auth.uid()::text);
