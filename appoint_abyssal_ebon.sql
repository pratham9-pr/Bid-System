-- =============================================================================
-- APPOINT ABYSSAL EBON & HARDCODE CAPTAIN 'invincible' (40,000 FC BASELINE)
-- =============================================================================
-- Run this in your Supabase SQL Editor.

-- 1. Configure Team 3: Abyssal Ebon
UPDATE public.teams
SET team_name = 'Abyssal Ebon',
    owner_name = 'invincible',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id IN ('gamma_reapers', 'TEAM_GAMMA', '3');

-- 2. Configure Team 1 (POWER HAWKS) & Team 2 (TEAM VORTEX)
UPDATE public.teams
SET team_name = 'POWER HAWKS',
    owner_name = 'NX4 SILENT',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id IN ('alpha_wolves', 'TEAM_ALPHA', '1');

UPDATE public.teams
SET team_name = 'TEAM VORTEX',
    owner_name = 'MOKSHII FF',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id IN ('beta_strikers', 'TEAM_BETA', '2');

UPDATE public.teams
SET team_name = 'PENDING',
    owner_name = 'TBD',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id IN ('delta_phantoms', 'TEAM_DELTA', '4');

-- 3. Lock Captains in Players table
-- Abyssal Ebon Captain: invincible
INSERT INTO public.players (id, in_game_name, name, base_price, max_limit, role, is_captain, current_bid, current_highest_bidder, current_highest_bidder_name, sold_to_team_id, sold_price, status)
VALUES ('CAP_INVINCIBLE', 'invincible', 'invincible', 0, 40000, 'IGL', true, 0, 'gamma_reapers', 'Abyssal Ebon', 'gamma_reapers', 0, 'sold')
ON CONFLICT (id) DO UPDATE
SET in_game_name = 'invincible',
    name = 'invincible',
    role = 'IGL',
    is_captain = true,
    sold_to_team_id = 'gamma_reapers',
    current_highest_bidder = 'gamma_reapers',
    current_highest_bidder_name = 'Abyssal Ebon',
    sold_price = 0,
    current_bid = 0,
    status = 'sold';

-- Power Hawks Captain: NX4 SILENT
INSERT INTO public.players (id, in_game_name, name, base_price, max_limit, role, is_captain, current_bid, current_highest_bidder, current_highest_bidder_name, sold_to_team_id, sold_price, status)
VALUES ('CAP_NX4_SILENT', 'NX4 SILENT', 'NX4 SILENT', 0, 40000, 'IGL', true, 0, 'alpha_wolves', 'POWER HAWKS', 'alpha_wolves', 0, 'sold')
ON CONFLICT (id) DO UPDATE
SET in_game_name = 'NX4 SILENT',
    name = 'NX4 SILENT',
    role = 'IGL',
    is_captain = true,
    sold_to_team_id = 'alpha_wolves',
    current_highest_bidder = 'alpha_wolves',
    current_highest_bidder_name = 'POWER HAWKS',
    sold_price = 0,
    current_bid = 0,
    status = 'sold';

-- Team Vortex Captain: MOKSHII FF
INSERT INTO public.players (id, in_game_name, name, base_price, max_limit, role, is_captain, current_bid, current_highest_bidder, current_highest_bidder_name, sold_to_team_id, sold_price, status)
VALUES ('CAP_MOKSHII_FF', 'MOKSHII FF', 'MOKSHII FF', 0, 40000, 'IGL', true, 0, 'beta_strikers', 'TEAM VORTEX', 'beta_strikers', 0, 'sold')
ON CONFLICT (id) DO UPDATE
SET in_game_name = 'MOKSHII FF',
    name = 'MOKSHII FF',
    role = 'IGL',
    is_captain = true,
    sold_to_team_id = 'beta_strikers',
    current_highest_bidder = 'beta_strikers',
    current_highest_bidder_name = 'TEAM VORTEX',
    sold_price = 0,
    current_bid = 0,
    status = 'sold';

-- 4. Reset general auction pool players
UPDATE public.players
SET status = 'upcoming',
    sold_to_team_id = NULL,
    sold_price = 0,
    current_highest_bidder = NULL,
    current_highest_bidder_name = NULL,
    current_bid = base_price
WHERE is_captain = false
  AND NOT (in_game_name ILIKE '%NX4%' OR in_game_name ILIKE '%MOKSHII%' OR in_game_name ILIKE '%invincible%');

-- 5. Reset auction stage
UPDATE public.auction_state
SET active_player_id = NULL,
    auction_paused = false,
    is_revealed = false,
    bidding_open = false,
    status = 'idle',
    current_bid = 0,
    highest_bidder_team_id = NULL;

NOTIFY pgrst, 'reload schema';
