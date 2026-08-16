-- =============================================================================
--  DEMONS REIGN AUCTION LEAGUE — COMPLETE FACTORY RESET SQL SCRIPT
-- =============================================================================
--  Execute in Supabase Dashboard: SQL Editor -> Paste -> Click "Run"
-- =============================================================================

BEGIN;

-- 1. CLEAR ACTIVE AUCTION STATE
UPDATE public.auction_state
SET active_player_id        = NULL,
    status                  = 'idle',
    is_revealed             = FALSE,
    bidding_open            = FALSE,
    auction_paused          = FALSE,
    current_bid             = 0,
    max_bid_limit           = 30000,
    highest_bidder_team_id  = NULL,
    updated_at              = NOW()
WHERE id IS NOT NULL;

-- 2. NUKE THE PLAYERS, BIDS & TRANSACTION TABLES (Wipe all data)
DELETE FROM public.players;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bids') THEN
        EXECUTE 'DELETE FROM public.bids;';
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
        EXECUTE 'DELETE FROM public.transactions;';
    END IF;
END $$;

-- 3. RESET ALL 4 FRANCHISE TEAMS (Purses back to 40,000 FC, clear captain & timestamps)
UPDATE public.teams
SET fire_coin_balance = 40000,
    last_bid_time     = NULL;

-- Guarantee clean upsert for all 4 franchise teams
INSERT INTO public.teams (id, team_name, owner_name, owner_email, fire_coin_balance, last_bid_time)
VALUES
    ('alpha_wolves',   'POWER HAWKS',   'NX4 SILENT',   'alpha@wolves.ff',   40000, NULL),
    ('beta_strikers',  'TEAM VORTEX',   'MOKSHII FF',   'beta@strikers.ff',  40000, NULL),
    ('gamma_reapers',  'Abyssal Ebon',  'invincible',   'gamma@reapers.ff',  40000, NULL),
    ('delta_phantoms', 'RX KUDLA',      'RX KAUSHII',   'delta@phantoms.ff', 40000, NULL)
ON CONFLICT (id) DO UPDATE
SET team_name         = EXCLUDED.team_name,
    owner_name        = EXCLUDED.owner_name,
    owner_email       = EXCLUDED.owner_email,
    fire_coin_balance = 40000,
    last_bid_time     = NULL;

COMMIT;
