-- Universe — enable realtime for the shared world.
-- Run after 0001_universes.sql. This lets every client receive live updates
-- when anyone joins or changes their universe (Supabase Realtime).

alter publication supabase_realtime add table public.universes;

-- Realtime delivers change events; the row data itself is still read through the
-- normal RLS policy, so no extra permissions are needed.
