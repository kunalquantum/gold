-- Phase 2: Paginated world load — index for efficient keyset ordering.
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- loadWorld() now fetches in pages of 50 ordered by updated_at DESC.
-- Without this index, each page scan hits the full table.

create index if not exists universe_public_updated_at_idx
  on public.universe_public (updated_at desc, id desc);
