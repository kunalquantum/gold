-- Phase 9: Light Bridge — consensual cross-user connections with WhatsApp handoff,
-- and constellation rosters with shared WhatsApp group links.
--
-- Design notes:
--   • This app never talks to the WhatsApp API directly. Instead, it brokers a
--     CONSENT FLOW: A requests to connect → B accepts/declines → only after
--     mutual acceptance do both sides' WhatsApp numbers (if provided) get
--     written to the row, each by their own owner. The client then offers a
--     wa.me deep link with a warm, pre-crafted introduction message.
--   • Both new tables require Supabase Auth — guests (anon role) cannot use
--     Light Bridge or post group links, consistent with the rest of the app's
--     "guests are local-only" model.

-- ─── 1. connections ────────────────────────────────────────────────────────────

create table if not exists public.connections (
  id          uuid primary key default gen_random_uuid(),
  from_id     text not null,
  to_id       text not null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  from_name   text not null,
  from_color  text not null,
  to_name     text not null,
  from_message text not null default '',
  from_whatsapp text,
  to_whatsapp   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (from_id, to_id)
);

create index if not exists connections_to_id_idx   on public.connections (to_id);
create index if not exists connections_from_id_idx on public.connections (from_id);

grant select, insert, update on public.connections to authenticated;

alter table public.connections enable row level security;

drop policy if exists "see my connections" on public.connections;
create policy "see my connections"
  on public.connections
  for select
  to authenticated
  using (auth.uid()::text = from_id or auth.uid()::text = to_id);

drop policy if exists "send connection request" on public.connections;
create policy "send connection request"
  on public.connections
  for insert
  to authenticated
  with check (auth.uid()::text = from_id and status = 'pending');

drop policy if exists "respond to my connections" on public.connections;
create policy "respond to my connections"
  on public.connections
  for update
  to authenticated
  using (auth.uid()::text = from_id or auth.uid()::text = to_id)
  with check (auth.uid()::text = from_id or auth.uid()::text = to_id);

alter publication supabase_realtime add table public.connections;

-- ─── 2. constellation_links ─────────────────────────────────────────────────────
-- One crowd-sourced WhatsApp group invite link per constellation. Anyone who has
-- joined can post or update the link (e.g. when an old invite expires).

create table if not exists public.constellation_links (
  id           text primary key,            -- constellation id, e.g. 'artists'
  whatsapp_url text,
  updated_by   text,
  updated_at   timestamptz not null default now()
);

grant select on public.constellation_links to anon, authenticated;
grant insert, update on public.constellation_links to authenticated;

alter table public.constellation_links enable row level security;

drop policy if exists "public read constellation links" on public.constellation_links;
create policy "public read constellation links"
  on public.constellation_links
  for select
  to anon, authenticated
  using (true);

drop policy if exists "members share constellation links" on public.constellation_links;
create policy "members share constellation links"
  on public.constellation_links
  for all
  to authenticated
  using (true)
  with check (auth.uid()::text = updated_by);
