-- =============================================================================
-- RESET ALL TEAM PURSES TO 40,000 FIRE COINS & LOCK PERMANENT CAPTAINS
-- =============================================================================
-- Run this in your Supabase SQL Editor to instantly update the live database.

-- 1. Reset all team balances to 40,000 FC
UPDATE public.teams
SET fire_coin_balance = 40000,
    last_bid_time = NULL;

-- 2. Lock Permanent Captains (0 FC, Slot 1)
-- Power Hawks Captain
UPDATE public.players
SET is_captain = true,
    role = 'IGL',
    status = 'sold',
    sold_to_team_id = 'alpha_wolves',
    current_highest_bidder = 'alpha_wolves',
    current_highest_bidder_name = 'POWER HAWKS',
    sold_price = 0,
    current_bid = 0
WHERE in_game_name ILIKE '%NX4%' OR name ILIKE '%NX4%' OR id = 'CAP_NX4_SILENT';

-- Team Vortex Captain
UPDATE public.players
SET is_captain = true,
    role = 'IGL',
    status = 'sold',
    sold_to_team_id = 'beta_strikers',
    current_highest_bidder = 'beta_strikers',
    current_highest_bidder_name = 'TEAM VORTEX',
    sold_price = 0,
    current_bid = 0
WHERE in_game_name ILIKE '%MOKSHII%' OR name ILIKE '%MOKSHII%' OR id = 'CAP_MOKSHII_FF';

-- 3. Reset all other players to upcoming with 0 sold price
UPDATE public.players
SET status = 'upcoming',
    sold_to_team_id = NULL,
    sold_price = 0,
    current_highest_bidder = NULL,
    current_highest_bidder_name = NULL,
    current_bid = base_price
WHERE is_captain = false
  AND NOT (in_game_name ILIKE '%NX4%' OR in_game_name ILIKE '%MOKSHII%');

-- 4. Reset auction stage
UPDATE public.auction_state
SET active_player_id = NULL,
    auction_paused = false,
    is_revealed = false,
    bidding_open = false,
    status = 'idle',
    current_bid = 0,
    highest_bidder_team_id = NULL;

NOTIFY pgrst, 'reload schema';
