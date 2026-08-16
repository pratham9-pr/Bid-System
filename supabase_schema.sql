-- =============================================================================
--  FREE FIRE AUCTION LEAGUE — SUPABASE DATABASE SCHEMA & RPC FUNCTIONS
-- =============================================================================
--  Run this entire script in your Supabase Dashboard:
--  SQL Editor -> "New query" -> Paste -> Click "Run"
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL UNIQUE,
    fire_coin_balance BIGINT NOT NULL DEFAULT 50000 CHECK (fire_coin_balance >= 0),
    last_bid_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY DEFAULT ('P_' || substr(md5(random()::text), 1, 6)),
    name TEXT,
    in_game_name TEXT NOT NULL,
    base_price BIGINT NOT NULL CHECK (base_price > 0),
    max_limit BIGINT NOT NULL CHECK (max_limit > base_price),
    role TEXT CHECK (role IN ('Rusher', 'Sniper', 'IGL', 'Supporter')),
    photo_url TEXT,
    custom_card_url TEXT,
    image_url TEXT,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    sold_to_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    sold_price BIGINT DEFAULT 0,
    current_bid BIGINT NOT NULL,
    current_highest_bidder TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    current_highest_bidder_name TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'sold', 'unsold')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Auction State Table (Single row representing active auction state)
CREATE TABLE IF NOT EXISTS public.auction_state (
    id TEXT PRIMARY KEY DEFAULT 'current',
    active_player_id TEXT REFERENCES public.players(id) ON DELETE SET NULL,
    auction_paused BOOLEAN NOT NULL DEFAULT FALSE,
    is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    bidding_open BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'idle',
    current_bid BIGINT NOT NULL DEFAULT 0,
    highest_bidder_team_id TEXT,
    max_bid_limit BIGINT NOT NULL DEFAULT 30000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure default single auction state row exists
INSERT INTO public.auction_state (id, active_player_id, auction_paused)
VALUES ('current', NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;

-- Allow public read on all auction tables
CREATE POLICY "Allow public read on teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read on players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public read on auction_state" ON public.auction_state FOR SELECT USING (true);

-- Allow authenticated / service writes (or manage via RPCs)
CREATE POLICY "Allow all actions on teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions on players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions on auction_state" ON public.auction_state FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable Realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;

-- 7. Storage Bucket for Player Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player_photos', 'player_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read for player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player_photos');

CREATE POLICY "Allow upload for player photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player_photos');

CREATE POLICY "Allow update for player photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player_photos');

-- =============================================================================
--  ATOMIC RPC FUNCTIONS (PostgreSQL Transactions)
-- =============================================================================

-- A. PLACE BID (Concurrency-Safe Transaction with Cooldown & Auto-Sell)
CREATE OR REPLACE FUNCTION public.place_bid(
    p_player_id TEXT,
    p_team_id TEXT,
    p_bid_amount BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player RECORD;
    v_team RECORD;
    v_state RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_cooldown_elapsed DOUBLE PRECISION;
BEGIN
    -- Check global auction state (resilient row ID resolution)
    SELECT * INTO v_state FROM public.auction_state LIMIT 1 FOR UPDATE;
    IF v_state.auction_paused THEN
        RETURN jsonb_build_object('success', false, 'error', 'AUCTION_PAUSED');
    END IF;

    IF v_state.bidding_open IS NOT NULL AND NOT v_state.bidding_open THEN
        RETURN jsonb_build_object('success', false, 'error', 'FLOOR_LOCKED');
    END IF;

    -- Lock player row
    SELECT * INTO v_player FROM public.players WHERE id::text = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    IF v_player.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player is not in an active auction.');
    END IF;

    -- Lock team row
    SELECT * INTO v_team FROM public.teams WHERE id::text = p_team_id OR id::text ILIKE p_team_id LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Team not found');
    END IF;

    -- 1. Check 3-second cooldown
    IF v_team.last_bid_time IS NOT NULL THEN
        v_cooldown_elapsed := EXTRACT(EPOCH FROM (v_now - v_team.last_bid_time));
        IF v_cooldown_elapsed < 3.0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'COOLDOWN_ACTIVE:' || ROUND((3.0 - v_cooldown_elapsed)::numeric, 1)
            );
        END IF;
    END IF;

    -- 2. Validate bid amount
    IF p_bid_amount <= v_player.current_bid AND v_player.current_highest_bidder IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bid must be strictly higher than current bid (₣' || v_player.current_bid || ').');
    END IF;

    IF p_bid_amount < v_player.base_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bid cannot be lower than base price (₣' || v_player.base_price || ').');
    END IF;

    -- 3. Check team wallet balance
    IF v_team.fire_coin_balance < p_bid_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient Fire Coins. Balance: ₣' || v_team.fire_coin_balance);
    END IF;

    -- 4. Auto-sell if bid >= max_limit OR bid >= 30000 (Global Max Cap)
    IF p_bid_amount >= v_player.max_limit OR p_bid_amount >= 30000 THEN
        IF p_bid_amount > 30000 THEN
            p_bid_amount := 30000;
        END IF;

        -- Mark as sold and deduct balance immediately
        UPDATE public.players
        SET status = 'sold',
            current_bid = p_bid_amount,
            sold_price = p_bid_amount,
            sold_to_team_id = v_team.id,
            current_highest_bidder = v_team.id,
            current_highest_bidder_name = v_team.team_name
        WHERE id::text = p_player_id;

        UPDATE public.teams
        SET fire_coin_balance = fire_coin_balance - p_bid_amount,
            last_bid_time = v_now
        WHERE id = v_team.id;

        UPDATE public.auction_state
        SET status = 'sold',
            bidding_open = false,
            current_bid = p_bid_amount,
            highest_bidder_team_id = v_team.id,
            updated_at = v_now
        WHERE id = v_state.id;

        RETURN jsonb_build_object(
            'success', true,
            'auto_sold', true,
            'message', 'Max limit reached! Player auto-sold to ' || v_team.team_name || ' for ₣' || p_bid_amount
        );
    ELSE
        -- Normal bid increment
        UPDATE public.players
        SET current_bid = p_bid_amount,
            current_highest_bidder = v_team.id,
            current_highest_bidder_name = v_team.team_name
        WHERE id::text = p_player_id;

        UPDATE public.teams
        SET last_bid_time = v_now
        WHERE id = v_team.id;

        UPDATE public.auction_state
        SET current_bid = p_bid_amount,
            highest_bidder_team_id = v_team.id,
            updated_at = v_now
        WHERE id = v_state.id;

        RETURN jsonb_build_object('success', true, 'auto_sold', false);
    END IF;
END;
$$;

-- B. SET PLAYER ACTIVE
CREATE OR REPLACE FUNCTION public.set_player_active(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set target player active
    UPDATE public.players
    SET status = 'active'
    WHERE id::text = p_player_id;

    -- Update auction state
    UPDATE public.auction_state
    SET active_player_id = p_player_id,
        auction_paused = false,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.auction_state LIMIT 1);

    RETURN jsonb_build_object('success', true);
END;
$$;

-- C. FORCE PLAYER SOLD
CREATE OR REPLACE FUNCTION public.force_player_sold(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player RECORD;
    v_team RECORD;
BEGIN
    SELECT * INTO v_player FROM public.players WHERE id::text = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    IF v_player.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player is not currently active');
    END IF;

    IF v_player.current_highest_bidder IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No bids placed yet.');
    END IF;

    SELECT * INTO v_team FROM public.teams WHERE id::text = v_player.current_highest_bidder OR id::text ILIKE v_player.current_highest_bidder LIMIT 1 FOR UPDATE;

    -- Deduct balance & mark sold
    UPDATE public.teams
    SET fire_coin_balance = fire_coin_balance - v_player.current_bid
    WHERE id = v_team.id;

    UPDATE public.players
    SET status = 'sold',
        sold_price = v_player.current_bid,
        sold_to_team_id = v_team.id
    WHERE id::text = p_player_id;

    UPDATE public.auction_state
    SET status = 'sold',
        bidding_open = false,
        current_bid = v_player.current_bid,
        highest_bidder_team_id = v_team.id,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.auction_state LIMIT 1);

    RETURN jsonb_build_object('success', true);
END;
$$;

-- D. MARK UNSOLD
CREATE OR REPLACE FUNCTION public.mark_unsold(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player RECORD;
BEGIN
    SELECT * INTO v_player FROM public.players WHERE id::text = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    UPDATE public.players
    SET status = 'unsold',
        current_bid = base_price,
        current_highest_bidder = NULL,
        current_highest_bidder_name = NULL,
        sold_to_team_id = NULL,
        sold_price = 0
    WHERE id::text = p_player_id;

    UPDATE public.auction_state
    SET active_player_id = NULL,
        status = 'idle',
        bidding_open = false,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.auction_state LIMIT 1);

    RETURN jsonb_build_object('success', true);
END;
$$;

-- E. TOGGLE AUCTION PAUSE
CREATE OR REPLACE FUNCTION public.toggle_auction_pause()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_paused BOOLEAN;
BEGIN
    UPDATE public.auction_state
    SET auction_paused = NOT auction_paused,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM public.auction_state LIMIT 1)
    RETURNING auction_paused INTO v_new_paused;

    RETURN jsonb_build_object('success', true, 'auction_paused', v_new_paused);
END;
$$;

-- F. ACTIVATE NEXT PLAYER
CREATE OR REPLACE FUNCTION public.activate_next_player()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next RECORD;
BEGIN
    -- Look for upcoming first, then unsold
    SELECT * INTO v_next
    FROM public.players
    WHERE status = 'upcoming'
    ORDER BY in_game_name ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        SELECT * INTO v_next
        FROM public.players
        WHERE status = 'unsold'
        ORDER BY in_game_name ASC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No upcoming or unsold players in queue.');
    END IF;

    -- Activate the selected player
    UPDATE public.players
    SET status = 'active',
        current_bid = base_price,
        current_highest_bidder = NULL,
        current_highest_bidder_name = NULL
    WHERE id = v_next.id;

    UPDATE public.auction_state
    SET active_player_id = v_next.id,
        auction_paused = false,
        updated_at = NOW()
    WHERE id = 'current';

    RETURN jsonb_build_object('success', true, 'playerName', v_next.in_game_name);
END;
$$;

-- G. RESET PLAYER
CREATE OR REPLACE FUNCTION public.reset_player(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.players
    SET status = 'upcoming',
        current_bid = base_price,
        current_highest_bidder = NULL,
        current_highest_bidder_name = NULL
    WHERE id::text = p_player_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- H. SEED DATABASE FUNCTION
CREATE OR REPLACE FUNCTION public.seed_auction_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Seed Teams
    INSERT INTO public.teams (id, team_name, owner_name, owner_email, fire_coin_balance, last_bid_time)
    VALUES
        ('TEAM_ALPHA', 'POWER HAWKS',  'NX4 SILENT', 'alpha@freefire.auction', 40000, NULL),
        ('TEAM_BETA',  'TEAM VORTEX',  'MOKSHII FF', 'beta@freefire.auction',  40000, NULL),
        ('TEAM_GAMMA', 'Abyssal Ebon', 'invincible', 'gamma@freefire.auction', 40000, NULL),
        ('TEAM_DELTA', 'RX KUDLA',     'RX KAUSHII', 'delta@freefire.auction', 40000, NULL)
    ON CONFLICT (id) DO UPDATE
    SET team_name = EXCLUDED.team_name,
        owner_name = EXCLUDED.owner_name,
        owner_email = EXCLUDED.owner_email,
        fire_coin_balance = 40000,
        last_bid_time = NULL;

    -- Seed Players (Captains strictly pre-assigned; other players upcoming in bidding pool)
    INSERT INTO public.players (id, in_game_name, name, base_price, max_limit, role, is_captain, current_bid, current_highest_bidder, current_highest_bidder_name, sold_to_team_id, sold_price, status)
    VALUES
        -- Permanent Captains
        ('CAP_NX4_SILENT',  'NX4 SILENT',  'NX4 SILENT',  0, 40000, 'IGL', true, 0, 'alpha_wolves',  'POWER HAWKS',  'alpha_wolves',  0, 'sold'),
        ('CAP_MOKSHII_FF',  'MOKSHII FF',  'MOKSHII FF',  0, 40000, 'IGL', true, 0, 'beta_strikers',  'TEAM VORTEX',  'beta_strikers',  0, 'sold'),
        ('CAP_INVINCIBLE',  'invincible',  'invincible',  0, 40000, 'IGL', true, 0, 'gamma_reapers', 'Abyssal Ebon', 'gamma_reapers', 0, 'sold'),
        ('CAP_RX_KAUSHII',  'RX KAUSHII',  'RX KAUSHII',  0, 40000, 'IGL', true, 0, 'delta_phantoms', 'RX KUDLA',     'delta_phantoms', 0, 'sold'),

        -- General Auction Pool Players
        ('P001', 'SK_Sabir',     'SK Sabir',     5000, 20000, 'Rusher',    false, 5000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P002', 'Jonty_Gaming', 'Jonty Gaming', 4000, 15000, 'Sniper',    false, 4000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P003', 'XoticBoy',     'Xotic Boy',     6000, 25000, 'Rusher',    false, 6000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P004', 'TotalGaming',  'Total Gaming',  3000, 12000, 'Supporter', false, 3000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P005', 'Gyan_Sujan',   'Gyan Sujan',   7000, 28000, 'Rusher',    false, 7000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P006', 'Sudip_Sarkar', 'Sudip Sarkar', 4500, 18000, 'Sniper',    false, 4500, NULL, NULL, NULL, 0, 'upcoming'),
        ('P007', 'Dyland_PROS',  'Dyland PROS',  8000, 30000, 'Supporter', false, 8000, NULL, NULL, NULL, 0, 'upcoming'),
        ('P008', 'Loud_Babi',    'Loud Babi',    5500, 22000, 'Supporter', false, 5500, NULL, NULL, NULL, 0, 'upcoming'),
        ('P009', 'Abhi_Gamer',   'ABHI GAMER',   5000, 20000, 'Rusher',    false, 5000, NULL, NULL, NULL, 0, 'upcoming')
    ON CONFLICT (id) DO UPDATE
    SET in_game_name = EXCLUDED.in_game_name,
        name = EXCLUDED.name,
        base_price = EXCLUDED.base_price,
        max_limit = EXCLUDED.max_limit,
        role = EXCLUDED.role,
        is_captain = EXCLUDED.is_captain,
        current_bid = EXCLUDED.current_bid,
        current_highest_bidder = EXCLUDED.current_highest_bidder,
        current_highest_bidder_name = EXCLUDED.current_highest_bidder_name,
        sold_to_team_id = EXCLUDED.sold_to_team_id,
        sold_price = EXCLUDED.sold_price,
        status = EXCLUDED.status;

    -- Reset Auction State
    UPDATE public.auction_state
    SET active_player_id = NULL,
        auction_paused = false,
        is_revealed = false,
        bidding_open = false,
        status = 'idle',
        current_bid = 0,
        highest_bidder_team_id = NULL,
        updated_at = NOW()
    WHERE id = 'current';

    RETURN jsonb_build_object('success', true, 'message', 'Seeded 4 teams and 8 players successfully.');
END;
$$;

-- Run initial seed automatically
SELECT public.seed_auction_data();
