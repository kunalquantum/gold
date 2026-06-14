-- Bulletproof public-read setup for universe_public.
--
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- This is idempotent and safe to re-run any number of times.
--
-- Why this exists: migration 0005 included an UPDATE that could fail under
-- triggers or other transient conditions and partially apply. This migration
-- does ONLY the policy work — no data touches — so every statement is
-- guaranteed to either succeed or hard-fail visibly (no silent partial state).

-- ─── 1. Make sure RLS is on. ─────────────────────────────────────────────────
alter table public.universe_public enable row level security;

-- ─── 2. Make sure roles have table-level SELECT. ─────────────────────────────
-- RLS gates row visibility, but if the role lacks SELECT entirely, no row is
-- ever returned regardless of policy.
grant select                       on public.universe_public to anon;
grant select, insert, update, delete on public.universe_public to authenticated;

-- ─── 3. Drop every existing select policy on the table. ──────────────────────
-- Avoids leftovers from earlier migrations shadowing the new one.
do $$
declare pol record;
begin
  for pol in
    select polname from pg_policy
    where polrelid = 'public.universe_public'::regclass
  loop
    execute format('drop policy if exists %I on public.universe_public', pol.polname);
  end loop;
end $$;

-- ─── 4. Re-create both policies clean. ───────────────────────────────────────
create policy "public read"
  on public.universe_public
  for select
  to anon, authenticated
  using (true);

create policy "owners manage their public universe"
  on public.universe_public
  for all
  to authenticated
  using  (id = auth.uid()::text)
  with check (id = auth.uid()::text);

-- ─── 5. Sanity check — print the policy list so you can verify it ran. ───────
-- After running, the Results pane should show 2 rows.
select polname, polcmd, polroles::regrole[]
  from pg_policy
  where polrelid = 'public.universe_public'::regclass;
