// ─── PERMANENT FRANCHISE CAPTAINS & ROSTER ALLOCATION ──────────────────────
// Team 1: 'POWER HAWKS' -> Permanent Captain: 'NX4 SILENT' (IGL)
// Team 2: 'TEAM VORTEX' -> Permanent Captain: 'MOKSHII FF' (IGL)
// Teams 3 & 4: 'PENDING' -> Locked / Disabled (No captains required)
// Each active team has 1 Captain + 3 Auction Draft Slots = 4 Total Players

export const MAX_ROSTER_SIZE   = 4; // 1 Captain + 3 Drafted Players
export const MAX_AUCTION_SLOTS = 3; // Max 3 players acquired via auction bidding

export const PERMANENT_CAPTAINS = {
  alpha_wolves: {
    id: 'CAP_NX4_SILENT',
    name: 'NX4 SILENT',
    in_game_name: 'NX4 SILENT',
    role: 'IGL',
    photo_url: '/players/default.jpg',
    custom_card_url: null,
    image_url: null,
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    sold_price: 0,
    team_id: 'alpha_wolves',
    team_name: 'POWER HAWKS',
    title: 'POWER HAWKS Captain (IGL)',
  },
  beta_strikers: {
    id: 'CAP_MOKSHII_FF',
    name: 'MOKSHII FF',
    in_game_name: 'MOKSHII FF',
    role: 'IGL',
    photo_url: '/players/default.jpg',
    custom_card_url: null,
    image_url: null,
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    sold_price: 0,
    team_id: 'beta_strikers',
    team_name: 'TEAM VORTEX',
    title: 'TEAM VORTEX Captain (IGL)',
  },
  gamma_reapers: null,
  delta_phantoms: null,
};

export const FRANCHISE_CAPTAINS = PERMANENT_CAPTAINS;

/**
 * Returns the permanent captain object for a given team ID or alias.
 * Returns null for PENDING teams (no captain required).
 */
export function getCaptainForTeam(teamId) {
  if (!teamId) return null;
  const cleanId = String(teamId).toLowerCase().trim();

  if (
    cleanId === 'alpha_wolves' ||
    cleanId === 'team_alpha' ||
    cleanId === 'power_hawks' ||
    cleanId === 'power hawks' ||
    cleanId === 'alpha'
  ) {
    return PERMANENT_CAPTAINS.alpha_wolves;
  }

  if (
    cleanId === 'beta_strikers' ||
    cleanId === 'team_beta' ||
    cleanId === 'team_vortex' ||
    cleanId === 'team vortex' ||
    cleanId === 'beta' ||
    cleanId === 'vortex'
  ) {
    return PERMANENT_CAPTAINS.beta_strikers;
  }

  return null;
}

/**
 * Checks if a player name matches one of the permanent captains.
 */
export function isPermanentCaptainName(name) {
  if (!name) return false;
  const clean = String(name).toLowerCase().trim();
  return (
    clean === 'nx4 silent' ||
    clean === 'nx4' ||
    clean === 'silent' ||
    clean === 'mokshii ff' ||
    clean === 'mokshii'
  );
}

/**
 * Returns full 4-slot roster for a franchise team:
 * [0]: Permanent Captain (NX4 SILENT / MOKSHII FF) or null for Pending teams
 * [1..3]: Legitimate Auction Drafted Players (sold with price > 0)
 */
export function getTeamFullRoster(teamId, allPlayers = []) {
  if (!teamId) {
    return {
      captain: null,
      auctionedPlayers: [],
      slots: [null, null, null, null],
      totalCount: 0,
      remainingSlots: 3,
      isFull: false,
      isPendingTeam: false,
    };
  }

  const cleanTeamId = String(teamId).toLowerCase().trim();
  const isPending =
    cleanTeamId === 'gamma_reapers' ||
    cleanTeamId === 'delta_phantoms' ||
    cleanTeamId === 'team_gamma' ||
    cleanTeamId === 'team_delta';

  // Deduplicate all incoming player objects by unique ID
  const uniquePlayersMap = new Map();
  for (const p of allPlayers || []) {
    if (p && p.id && !uniquePlayersMap.has(String(p.id))) {
      uniquePlayersMap.set(String(p.id), p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  // 1. Resolve Captain: Permanent hardcoded captain + any DB photo/details attached
  const baseCaptain = getCaptainForTeam(cleanTeamId);
  let captain = null;

  if (baseCaptain) {
    // Look for matching DB player row if exists to inherit photo/custom card
    const dbMatch = uniquePlayers.find((p) => {
      const pName = (p.in_game_name || p.name || '').toLowerCase().trim();
      const capName = baseCaptain.name.toLowerCase().trim();
      return pName === capName || p.id === baseCaptain.id;
    });

    captain = {
      ...baseCaptain,
      ...(dbMatch
        ? {
            id: dbMatch.id,
            photo_url: dbMatch.photo_url || dbMatch.custom_card_url || baseCaptain.photo_url,
            custom_card_url: dbMatch.custom_card_url || null,
            image_url: dbMatch.image_url || null,
          }
        : {}),
      is_captain: true,
      is_locked: true,
      role: 'IGL',
      status: 'captain',
    };
  }

  const captainId = captain?.id ? String(captain.id) : null;
  const captainName = (captain?.in_game_name || captain?.name || '').toLowerCase().trim();

  // 2. Drafted players (strictly auctioned non-captains sold with bid price > 0)
  const seenDraftedIds = new Set();
  const teamSold = [];

  if (!isPending) {
    for (const p of uniquePlayers) {
      if (!p) continue;
      const isSoldToThisTeam =
        (p.status === 'sold' || p.status === 'active') &&
        (String(p.sold_to_team_id || '').toLowerCase() === cleanTeamId ||
          String(p.current_highest_bidder || '').toLowerCase() === cleanTeamId);

      const isCaptainPlayer =
        p.is_captain === true ||
        isPermanentCaptainName(p.in_game_name || p.name) ||
        p.id === captainId;

      const hasValidAuctionPrice = (p.current_bid > 0 || p.sold_price > 0);

      // Only real drafted auction players
      if (isSoldToThisTeam && !isCaptainPlayer && hasValidAuctionPrice && p.role !== 'IGL') {
        const pid = String(p.id);
        const pname = (p.in_game_name || p.name || '').toLowerCase().trim();

        if (pid !== captainId && (!captainName || pname !== captainName) && !seenDraftedIds.has(pid)) {
          seenDraftedIds.add(pid);
          teamSold.push(p);
        }
      }
    }
  }

  // At most MAX_AUCTION_SLOTS (3) auction slots
  const cappedSold = teamSold.slice(0, MAX_AUCTION_SLOTS);

  const slots = [
    captain || null,
    cappedSold[0] || null,
    cappedSold[1] || null,
    cappedSold[2] || null,
  ];

  return {
    captain,
    auctionedPlayers: cappedSold,
    slots,
    totalCount: (captain ? 1 : 0) + cappedSold.length,
    remainingSlots: isPending ? 0 : Math.max(0, MAX_AUCTION_SLOTS - cappedSold.length),
    isFull: !isPending && cappedSold.length >= MAX_AUCTION_SLOTS,
    isPendingTeam: isPending,
  };
}

/**
 * Checks if a team has filled all 3 auction slots (meaning 4/4 full).
 */
export function isTeamRosterFull(teamId, allPlayers = []) {
  const cleanTeamId = String(teamId).toLowerCase().trim();
  const isPending =
    cleanTeamId === 'gamma_reapers' ||
    cleanTeamId === 'delta_phantoms' ||
    cleanTeamId === 'team_gamma' ||
    cleanTeamId === 'team_delta';

  if (isPending) return true;

  const seenDraftedIds = new Set();
  for (const p of allPlayers || []) {
    if (
      p &&
      p.status === 'sold' &&
      !p.is_captain &&
      !isPermanentCaptainName(p.in_game_name || p.name) &&
      p.role !== 'IGL' &&
      ((p.current_bid ?? 0) > 0 || (p.sold_price ?? 0) > 0) &&
      (String(p.sold_to_team_id || '').toLowerCase() === cleanTeamId ||
        String(p.current_highest_bidder || '').toLowerCase() === cleanTeamId)
    ) {
      seenDraftedIds.add(String(p.id));
    }
  }
  return seenDraftedIds.size >= MAX_AUCTION_SLOTS;
}
