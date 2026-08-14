// ─── FRANCHISE CAPTAINS & ROSTER ALLOCATION SPECIFICATION ──────────────────
// Each franchise team has 1 pre-allocated, locked Captain (Slot 1)
// Plus 3 remaining draftable/auctionable slots (Slots 2, 3, 4) -> 4 Total Players

export const MAX_ROSTER_SIZE = 4;     // Total 4 players per team
export const MAX_AUCTION_SLOTS = 3;   // Max 3 players can be acquired via bidding

export const FRANCHISE_CAPTAINS = {
  alpha_wolves: {
    id: 'captain_alpha_wolves',
    name: 'Abhi Gamer',
    in_game_name: 'Abhi Gamer',
    role: 'IGL',
    photo_url: '/players/abhi_gamer.jpg.jpeg',
    custom_card_url: '/players/abhi_gamer.jpg.jpeg',
    image_url: '/players/abhi_gamer.jpg.jpeg',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    team_id: 'alpha_wolves',
    team_name: 'POWER HAWKS',
    title: 'POWER HAWKS Captain',
  },
  beta_strikers: {
    id: 'captain_beta_strikers',
    name: 'Gauthuu',
    in_game_name: 'Gauthuu',
    role: 'IGL',
    photo_url: '/players/gauthuu.jpg.jpeg',
    custom_card_url: '/players/gauthuu.jpg.jpeg',
    image_url: '/players/gauthuu.jpg.jpeg',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    team_id: 'beta_strikers',
    team_name: 'TEAM VORTEX',
    title: 'TEAM VORTEX Captain',
  },
  gamma_reapers: {
    id: 'captain_gamma_reapers',
    name: 'Invincible',
    in_game_name: 'Invincible',
    role: 'IGL',
    photo_url: '/players/invincible.jpg.jpeg',
    custom_card_url: '/players/invincible.jpg.jpeg',
    image_url: '/players/invincible.jpg.jpeg',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    team_id: 'gamma_reapers',
    team_name: 'PENDING',
    title: 'PENDING Team Captain',
  },
  delta_phantoms: {
    id: 'captain_delta_phantoms',
    name: 'Nxt Sharuu',
    in_game_name: 'Nxt Sharuu',
    role: 'IGL',
    photo_url: '/players/nxt_sharuu.jpg.jpeg',
    custom_card_url: '/players/nxt_sharuu.jpg.jpeg',
    image_url: '/players/nxt_sharuu.jpg.jpeg',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    team_id: 'delta_phantoms',
    team_name: 'PENDING',
    title: 'PENDING Team Captain',
  },
};

/**
 * Returns the default designated captain for a given team ID.
 */
export function getCaptainForTeam(teamId) {
  if (!teamId) return null;
  const cleanId = String(teamId).toLowerCase().trim();
  return FRANCHISE_CAPTAINS[cleanId] || {
    id: `captain_${cleanId}`,
    name: 'Team Captain',
    in_game_name: 'Team Captain',
    role: 'IGL',
    photo_url: '/players/default.jpg',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    team_id: cleanId,
    title: 'Franchise Captain',
  };
}

/**
 * Returns full 4-slot roster for a franchise team:
 * [0]: Captain (Appointed in database OR pre-allocated default) - Role: IGL, Locked
 * [1..3]: Sold/Drafted players or null (Available Auction Slot)
 */
export function getTeamFullRoster(teamId, allPlayers = []) {
  if (!teamId) {
    return { captain: null, auctionedPlayers: [], slots: [null, null, null, null], totalCount: 0, remainingSlots: 3, isFull: false };
  }

  const cleanTeamId = String(teamId).toLowerCase().trim();

  // 1. Check if a captain is appointed in Supabase for this franchise
  const appointedCaptain = (allPlayers || []).find(
    (p) =>
      p.is_captain === true &&
      (p.sold_to_team_id === cleanTeamId || p.current_highest_bidder === cleanTeamId)
  );

  // 2. Resolve captain (appointed player or fallback default)
  const captain = appointedCaptain
    ? {
        ...appointedCaptain,
        role: appointedCaptain.role || 'IGL',
        is_captain: true,
        is_locked: true,
      }
    : getCaptainForTeam(cleanTeamId);

  // 3. Drafted players (players sold to this team excluding the captain)
  const teamSold = (allPlayers || []).filter(
    (p) =>
      p.status === 'sold' &&
      !p.is_captain &&
      (p.sold_to_team_id === cleanTeamId || p.current_highest_bidder === cleanTeamId) &&
      p.id !== captain?.id
  );

  const slots = [
    captain,
    teamSold[0] || null,
    teamSold[1] || null,
    teamSold[2] || null,
  ];

  return {
    captain,
    auctionedPlayers: teamSold,
    slots,
    totalCount: (captain ? 1 : 0) + teamSold.length,
    remainingSlots: Math.max(0, MAX_AUCTION_SLOTS - teamSold.length),
    isFull: teamSold.length >= MAX_AUCTION_SLOTS,
  };
}

/**
 * Checks if a team has filled all 3 auction slots (meaning 4/4 full).
 */
export function isTeamRosterFull(teamId, allPlayers = []) {
  const cleanTeamId = String(teamId).toLowerCase().trim();
  const teamSold = (allPlayers || []).filter(
    (p) =>
      p.status === 'sold' &&
      !p.is_captain &&
      (p.sold_to_team_id === cleanTeamId || p.current_highest_bidder === cleanTeamId)
  );
  return teamSold.length >= MAX_AUCTION_SLOTS;
}
