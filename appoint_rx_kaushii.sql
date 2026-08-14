-- =============================================================================
--  APPOINT RX KAUSHII AS PERMANENT CAPTAIN FOR RX KUDLA
-- =============================================================================

-- 1. Ensure RX KUDLA team exists, has 40,000 FC purse, and owner is RX KAUSHII
INSERT INTO public.teams (id, team_name, owner_name, owner_email, fire_coin_balance)
VALUES ('delta_phantoms', 'RX KUDLA', 'RX KAUSHII', 'delta@freefire.auction', 40000)
ON CONFLICT (id) DO UPDATE
SET team_name = 'RX KUDLA',
    owner_name = 'RX KAUSHII',
    fire_coin_balance = 40000,
    last_bid_time = NULL;

-- 2. Update alias row TEAM_DELTA if present
UPDATE public.teams
SET team_name = 'RX KUDLA',
    owner_name = 'RX KAUSHII',
    fire_coin_balance = 40000,
    last_bid_time = NULL
WHERE id = 'TEAM_DELTA';

-- 3. Lock RX KAUSHII as Permanent Captain (IGL) with 0 FC cost
INSERT INTO public.players (
    id,
    in_game_name,
    name,
    base_price,
    max_limit,
    role,
    is_captain,
    status,
    current_bid,
    sold_price,
    sold_to_team_id,
    current_highest_bidder,
    current_highest_bidder_name,
    photo_url
)
VALUES (
    'CAP_RX_KAUSHII',
    'RX KAUSHII',
    'RX KAUSHII',
    0,
    40000,
    'IGL',
    true,
    'sold',
    0,
    0,
    'delta_phantoms',
    'delta_phantoms',
    'RX KUDLA',
    '/players/default.jpg'
)
ON CONFLICT (id) DO UPDATE
SET in_game_name = 'RX KAUSHII',
    name = 'RX KAUSHII',
    role = 'IGL',
    is_captain = true,
    status = 'sold',
    current_bid = 0,
    sold_price = 0,
    sold_to_team_id = 'delta_phantoms',
    current_highest_bidder = 'delta_phantoms',
    current_highest_bidder_name = 'RX KUDLA';

-- 4. If any other row exists with the name 'RX KAUSHII', mark as locked captain
UPDATE public.players
SET is_captain = true,
    role = 'IGL',
    status = 'sold',
    sold_to_team_id = 'delta_phantoms',
    current_highest_bidder = 'delta_phantoms',
    current_highest_bidder_name = 'RX KUDLA',
    current_bid = 0,
    sold_price = 0
WHERE LOWER(in_game_name) IN ('rx kaushii', 'kaushii', 'rx_kaushii')
   OR LOWER(name) IN ('rx kaushii', 'kaushii', 'rx_kaushii');
