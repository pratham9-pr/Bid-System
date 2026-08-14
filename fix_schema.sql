-- =============================================================================
--  FIX SUPABASE SCHEMA — ADD MISSING COLUMNS & RELOAD SCHEMA CACHE
-- =============================================================================
--  Copy and run this entire script in Supabase Dashboard:
--  SQL Editor -> "New query" -> Paste -> Click "Run"
-- =============================================================================

-- 1. Add missing columns to 'players' table
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_to_team_id TEXT,
  ADD COLUMN IF NOT EXISTS sold_price BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_card_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Add missing columns to 'auction_state' table
ALTER TABLE public.auction_state
  ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bidding_open BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS current_bid BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highest_bidder_team_id TEXT,
  ADD COLUMN IF NOT EXISTS max_bid_limit BIGINT DEFAULT 30000;

-- 3. Populate default values for existing rows
UPDATE public.players
SET is_captain = false
WHERE is_captain IS NULL;

-- 4. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
