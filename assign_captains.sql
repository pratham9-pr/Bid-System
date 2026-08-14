-- ─── CAPTAIN INITIALIZATION SCRIPT ──────────────────────────────────────────
-- Locks 'NX4 SILENT' as Captain for 'POWER HAWKS' (alpha_wolves / TEAM_ALPHA)
-- Locks 'MOKSHII FF' as Captain for 'TEAM VORTEX' (beta_strikers / TEAM_BETA)
-- Clears all captain assignments for the 2 PENDING teams
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure NX4 SILENT exists and is locked to POWER HAWKS
INSERT INTO public.players (
    id, in_game_name, name, base_price, max_limit, role,
    current_bid, current_highest_bidder, current_highest_bidder_name,
    sold_to_team_id, sold_price, status, is_captain
)
VALUES (
    'CAP_POWER_HAWKS', 'NX4 SILENT', 'NX4 SILENT', 0, 30000, 'IGL',
    0, 'alpha_wolves', 'POWER HAWKS',
    'alpha_wolves', 0, 'sold', true
)
ON CONFLICT (id) DO UPDATE SET
    in_game_name = 'NX4 SILENT',
    name = 'NX4 SILENT',
    role = 'IGL',
    is_captain = true,
    status = 'sold',
    sold_to_team_id = 'alpha_wolves',
    current_highest_bidder = 'alpha_wolves',
    current_highest_bidder_name = 'POWER HAWKS',
    current_bid = 0;

-- 2. Ensure MOKSHII FF exists and is locked to TEAM VORTEX
INSERT INTO public.players (
    id, in_game_name, name, base_price, max_limit, role,
    current_bid, current_highest_bidder, current_highest_bidder_name,
    sold_to_team_id, sold_price, status, is_captain
)
VALUES (
    'CAP_TEAM_VORTEX', 'MOKSHII FF', 'MOKSHII FF', 0, 30000, 'IGL',
    0, 'beta_strikers', 'TEAM VORTEX',
    'beta_strikers', 0, 'sold', true
)
ON CONFLICT (id) DO UPDATE SET
    in_game_name = 'MOKSHII FF',
    name = 'MOKSHII FF',
    role = 'IGL',
    is_captain = true,
    status = 'sold',
    sold_to_team_id = 'beta_strikers',
    current_highest_bidder = 'beta_strikers',
    current_highest_bidder_name = 'TEAM VORTEX',
    current_bid = 0;

-- 3. Clear any legacy captain assignments for Gamma & Delta / Pending teams
UPDATE public.players
SET is_captain = false,
    sold_to_team_id = null,
    current_highest_bidder = null,
    current_highest_bidder_name = null,
    status = 'upcoming'
WHERE (sold_to_team_id IN ('gamma_reapers', 'delta_phantoms', 'TEAM_GAMMA', 'TEAM_DELTA') OR
       current_highest_bidder IN ('gamma_reapers', 'delta_phantoms', 'TEAM_GAMMA', 'TEAM_DELTA'))
  AND is_captain = true;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
