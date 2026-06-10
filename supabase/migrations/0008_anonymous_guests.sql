-- Phase 10: Guests as stars.
--
-- The app now signs guests in with Supabase anonymous auth, so they get a real
-- auth.uid() and their universe passes the existing RLS on universes /
-- universe_public — every guest appears as a star in the shared galaxy.
--
-- Requires two dashboard settings (Authentication → Providers / Settings):
--   1. Enable "Anonymous sign-ins"
--   2. Enable the Google provider (Client ID + Secret from Google Cloud Console)
--
-- No schema change is needed for guest stars. This migration only tightens the
-- Light Bridge: exchanging WhatsApp numbers stays reserved for permanent
-- accounts, enforced here at the database level (the UI gates it too).

drop policy if exists "send connection request" on public.connections;
create policy "send connection request"
  on public.connections
  for insert
  to authenticated
  with check (
    from_id = auth.uid()::text
    and status = 'pending'
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

drop policy if exists "respond to my connections" on public.connections;
create policy "respond to my connections"
  on public.connections
  for update
  to authenticated
  using (
    (from_id = auth.uid()::text or to_id = auth.uid()::text)
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );
