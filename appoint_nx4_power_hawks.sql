-- =============================================================================
--  APPOINT 'NX4 SILENT' AS CAPTAIN & REMOVE 'ABHI GAMER' FROM POWER HAWKS
-- =============================================================================

-- 1. Remove ABHI GAMER from POWER HAWKS and restore to upcoming auction pool
UPDATE public.players
SET status = 'upcoming',
    is_captain = false,
    sold_to_team_id = null,
    sold_price = 0,
    current_highest_bidder = null,
    current_highest_bidder_name = null,
    current_bid = COALESCE(base_price, 5000)
WHERE in_game_name ILIKE '%ABHI GAMER%' 
   OR name ILIKE '%ABHI GAMER%'
   OR in_game_name ILIKE '%ABHI%';

-- 2. Appoint and lock NX4 SILENT as Captain for POWER HAWKS
UPDATE public.players
SET status = 'sold',
    is_captain = true,
    role = 'IGL',
    sold_to_team_id = 'alpha_wolves',
    current_highest_bidder = 'alpha_wolves',
    current_highest_bidder_name = 'POWER HAWKS',
    current_bid = 0,
    sold_price = 0
WHERE in_game_name ILIKE '%NX4 SILENT%' 
   OR name ILIKE '%NX4 SILENT%'
   OR in_game_name ILIKE '%NX4%';

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Verification check
SELECT id, in_game_name, role, status, is_captain, sold_to_team_id 
FROM public.players 
WHERE in_game_name ILIKE '%ABHI%' OR in_game_name ILIKE '%NX4%';
