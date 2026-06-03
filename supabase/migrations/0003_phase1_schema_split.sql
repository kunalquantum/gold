-- Phase 1: Schema split — private data secured, public data world-readable.
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- What changes:
--   1. universes table becomes owner-only (auth.uid() = id).
--      Nobody can snoop on lights, messages, people photos, or memories any more.
--   2. universe_public table is created. It holds a sanitized, visual-only
--      snapshot of each citizen: orbits + colours (no content), public
--      milestones/signals only, nebulas/dreams fully shared.
--   3. Existing universes rows are backfilled into universe_public.
--   4. Realtime is wired to universe_public so the live world still works.

-- ─── 1. Fix universes RLS ─────────────────────────────────────────────────────

drop policy if exists "anon full access (temporary)" on public.universes;

create policy "owners manage their own universe"
  on public.universes
  for all
  to authenticated
  using  (id = auth.uid()::text)
  with check (id = auth.uid()::text);

-- ─── 2. universe_public table ────────────────────────────────────────────────

create table if not exists public.universe_public (
  id          text primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

grant select on public.universe_public to anon, authenticated;
grant insert, update, delete on public.universe_public to authenticated;

alter table public.universe_public enable row level security;

-- Anyone (including anonymous) can read the public world.
drop policy if exists "public read" on public.universe_public;
create policy "public read"
  on public.universe_public
  for select
  to anon, authenticated
  using (true);

-- Only the authenticated owner can write their own row.
drop policy if exists "owners manage their public universe" on public.universe_public;
create policy "owners manage their public universe"
  on public.universe_public
  for all
  to authenticated
  using  (id = auth.uid()::text)
  with check (id = auth.uid()::text);

-- ─── 3. Backfill existing users ───────────────────────────────────────────────
-- Sanitises existing universes rows into universe_public on first run.
-- Strips: people.photo, lights.content/media/sender/receiver, private signals.

insert into public.universe_public (id, data, updated_at)
select
  u.id,
  jsonb_build_object(
    'user', u.data->'user',
    'people', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',           p->>'id',
          'name',         p->>'name',
          'relationship', p->>'relationship',
          'orbit',        p->'orbit',
          'createdAt',    p->'createdAt'
        )
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(u.data->'people', '[]'::jsonb)) p
    ),
    'lights', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id',           l->>'id',
          'senderId',     '',
          'receiverId',   '',
          'type',         'text',
          'content',      '',
          'sealed',       l->'sealed',
          'opened',       false,
          'createdAt',    0,
          'orbitPosition', l->'orbitPosition',
          'color',        l->>'color',
          'form',         l->>'form'
        )
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(u.data->'lights', '[]'::jsonb)) l
    ),
    'milestones', (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from jsonb_array_elements(coalesce(u.data->'milestones', '[]'::jsonb)) m
      where (m->>'isPublic')::boolean = true
    ),
    'nebulas',        coalesce(u.data->'nebulas',        '[]'::jsonb),
    'artifacts',      coalesce(u.data->'artifacts',      '[]'::jsonb),
    'dreams',         coalesce(u.data->'dreams',         '[]'::jsonb),
    'fragments',      coalesce(u.data->'fragments',      '[]'::jsonb),
    'wisdom',         coalesce(u.data->'wisdom',         '[]'::jsonb),
    'signals', (
      select coalesce(jsonb_agg(s), '[]'::jsonb)
      from jsonb_array_elements(coalesce(u.data->'signals', '[]'::jsonb)) s
      where s->>'visibility' = 'public'
    ),
    'constellations', coalesce(u.data->'constellations', '[]'::jsonb)
  ),
  u.updated_at
from public.universes u
on conflict (id) do nothing;

-- ─── 4. Enable realtime on public table ───────────────────────────────────────

alter publication supabase_realtime add table public.universe_public;
