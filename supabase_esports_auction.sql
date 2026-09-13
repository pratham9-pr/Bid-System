-- =============================================================================
--  DEMONS REIGN ESPORTS AUCTION PLATFORM — IDEMPOTENT SUPABASE SCHEMA
-- =============================================================================
--  Safe to execute multiple times in Supabase SQL Editor.
-- =============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL UNIQUE,
    owner_name TEXT NOT NULL,
    budget BIGINT NOT NULL DEFAULT 40000,
    remaining_budget BIGINT NOT NULL DEFAULT 40000,
    access_pin VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column alterations in case table already exists with legacy columns
DO $$
BEGIN
    -- remaining_budget
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'remaining_budget'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN remaining_budget BIGINT NOT NULL DEFAULT 40000;
    END IF;

    -- access_pin
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'access_pin'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN access_pin VARCHAR(6);
    END IF;

    -- budget
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'budget'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN budget BIGINT NOT NULL DEFAULT 40000;
    END IF;
END $$;

-- 3. AUCTION STATE TABLE (Singleton record with id = 1)
CREATE TABLE IF NOT EXISTS public.auction_state (
    id INT PRIMARY KEY CONSTRAINT auction_state_singleton_check CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'idle' CONSTRAINT auction_state_status_check CHECK (status IN ('idle', 'bidding', 'paused', 'sold', 'unsold')),
    current_player_name TEXT,
    current_player_role TEXT,
    base_bid BIGINT NOT NULL DEFAULT 1000,
    current_bid BIGINT NOT NULL DEFAULT 0,
    highest_bidder_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    bid_increment BIGINT NOT NULL DEFAULT 500,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column checks in case auction_state already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auction_state' AND column_name = 'current_player_name') THEN
        ALTER TABLE public.auction_state ADD COLUMN current_player_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auction_state' AND column_name = 'current_player_role') THEN
        ALTER TABLE public.auction_state ADD COLUMN current_player_role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auction_state' AND column_name = 'base_bid') THEN
        ALTER TABLE public.auction_state ADD COLUMN base_bid BIGINT NOT NULL DEFAULT 1000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auction_state' AND column_name = 'bid_increment') THEN
        ALTER TABLE public.auction_state ADD COLUMN bid_increment BIGINT NOT NULL DEFAULT 500;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auction_state' AND column_name = 'highest_bidder_id') THEN
        ALTER TABLE public.auction_state ADD COLUMN highest_bidder_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. INSERT / ENSURE SINGLETON RECORD (id = 1)
INSERT INTO public.auction_state (
    id,
    status,
    current_player_name,
    current_player_role,
    base_bid,
    current_bid,
    highest_bidder_id,
    bid_increment,
    updated_at
)
VALUES (
    1,
    'idle',
    NULL,
    NULL,
    1000,
    0,
    NULL,
    500,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. ROW LEVEL SECURITY (RLS) & PERMISSIVE POLICIES
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;

-- Permissive policies for teams
DROP POLICY IF EXISTS "Allow public read access on teams" ON public.teams;
CREATE POLICY "Allow public read access on teams"
    ON public.teams FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow public insert access on teams" ON public.teams;
CREATE POLICY "Allow public insert access on teams"
    ON public.teams FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on teams" ON public.teams;
CREATE POLICY "Allow public update access on teams"
    ON public.teams FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on teams" ON public.teams;
CREATE POLICY "Allow public delete access on teams"
    ON public.teams FOR DELETE
    TO anon, authenticated
    USING (true);

-- Permissive policies for auction_state
DROP POLICY IF EXISTS "Allow public read access on auction_state" ON public.auction_state;
CREATE POLICY "Allow public read access on auction_state"
    ON public.auction_state FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow public insert access on auction_state" ON public.auction_state;
CREATE POLICY "Allow public insert access on auction_state"
    ON public.auction_state FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on auction_state" ON public.auction_state;
CREATE POLICY "Allow public update access on auction_state"
    ON public.auction_state FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
