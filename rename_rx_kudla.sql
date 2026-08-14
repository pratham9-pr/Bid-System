-- =============================================================================
-- RENAME TEAM 4 TO 'RX KUDLA' & INITIALIZE 40,000 FC PURSE
-- =============================================================================
-- Run this in your Supabase SQL Editor.

-- 1. Configure Team 4: RX KUDLA
UPDATE public.teams
SET team_name = 'RX KUDLA',
    owner_name = 'TBD',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id IN ('delta_phantoms', 'TEAM_DELTA', '4');

-- 2. Ensure all 4 teams have 40,000 FC starting purse
UPDATE public.teams
SET fire_coin_balance = 40000
WHERE fire_coin_balance != 40000;

NOTIFY pgrst, 'reload schema';
