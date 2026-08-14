-- =============================================================================
--  COMPLETE ROSTER & CAPTAIN RESET — EMPTY ALL SLOTS
-- =============================================================================
--  Run this query in Supabase SQL Editor:
--  1. Empties all team rosters & captain assignments
--  2. Sets all players to 'upcoming' so host can appoint captains from UI
--  3. Resets all franchise purses to 30,000 FC
-- =============================================================================

-- 1. Reset all players to upcoming & unassigned
UPDATE public.players
SET status = 'upcoming',
    is_captain = false,
    sold_to_team_id = null,
    sold_price = 0,
    current_highest_bidder = null,
    current_highest_bidder_name = null,
    current_bid = base_price;

-- 2. Reset auction state
UPDATE public.auction_state
SET active_player_id = null,
    is_revealed = false,
    bidding_open = false,
    status = 'idle',
    current_bid = 0,
    highest_bidder_team_id = null,
    auction_paused = false;

-- 3. Reset team purses to 30,000 FC
UPDATE public.teams
SET fire_coin_balance = 30000,
    last_bid_time = null;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 5. Verification check
SELECT id, in_game_name, status, is_captain, sold_to_team_id FROM public.players ORDER BY in_game_name;
