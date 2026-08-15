// ─── PERMANENT FRANCHISE CAPTAINS & ROSTER ALLOCATION ──────────────────────
// Team 1: 'POWER HAWKS'  -> Permanent Captain: 'NX4 SILENT' (IGL)
// Team 2: 'TEAM VORTEX'  -> Permanent Captain: 'MOKSHII FF' (IGL)
// Team 3: 'Abyssal Ebon' -> Permanent Captain: 'invincible' (IGL)
// Team 4: 'RX KUDLA'     -> Active Franchise (Captain unassigned / Open roster)
// Each active team has a 4-player roster capacity and 40,000 FC starting purse

export const MAX_ROSTER_SIZE   = 4; // 4 Total Players
export const MAX_AUCTION_SLOTS = 4; // Up to 4 players acquired via auction / draft

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
  gamma_reapers: {
    id: 'CAP_INVINCIBLE',
    name: 'invincible',
    in_game_name: 'invincible',
    role: 'IGL',
    photo_url: '/players/default.jpg',
    custom_card_url: null,
    image_url: null,
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    sold_price: 0,
    team_id: 'gamma_reapers',
    team_name: 'Abyssal Ebon',
    title: 'Abyssal Ebon Captain (IGL)',
  },
  delta_phantoms: {
    id: 'CAP_RX_KAUSHII',
    name: 'RX KAUSHII',
    in_game_name: 'RX KAUSHII',
    role: 'IGL',
    photo_url: '/players/default.jpg',
    custom_card_url: null,
    image_url: null,
    is_captain: true,
    is_locked: true,
    status: 'captain',
    current_bid: 0,
    sold_price: 0,
    team_id: 'delta_phantoms',
    team_name: 'RX KUDLA',
    title: 'RX KUDLA Captain (IGL)',
  },
};

export const FRANCHISE_CAPTAINS = PERMANENT_CAPTAINS;

/**
 * Returns the permanent captain object for a given team ID or alias.
 * Returns null if no captain assigned yet.
 */
export function getCaptainForTeam(teamId) {
  if (!teamId) return null;
  const cleanId = String(teamId).toLowerCase().trim();

  if (
    cleanId.includes('alpha') ||
    cleanId.includes('power') ||
    cleanId.includes('hawks') ||
    cleanId === '1'
  ) {
    return PERMANENT_CAPTAINS.alpha_wolves;
  }

  if (
    cleanId.includes('beta') ||
    cleanId.includes('vortex') ||
    cleanId.includes('strikers') ||
    cleanId === '2'
  ) {
    return PERMANENT_CAPTAINS.beta_strikers;
  }

  if (
    cleanId.includes('gamma') ||
    cleanId.includes('abyssal') ||
    cleanId.includes('ebon') ||
    cleanId.includes('reapers') ||
    cleanId === '3'
  ) {
    return PERMANENT_CAPTAINS.gamma_reapers;
  }

  if (
    cleanId.includes('delta') ||
    cleanId.includes('kudla') ||
    cleanId.includes('rx') ||
    cleanId.includes('phantoms') ||
    cleanId === '4'
  ) {
    return PERMANENT_CAPTAINS.delta_phantoms;
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
    clean.includes('nx4') ||
    clean.includes('silent') ||
    clean.includes('mokshii') ||
    clean.includes('invincible') ||
    clean.includes('kaushii') ||
    clean.includes('kaushi') ||
    clean.includes('rx kaushi') ||
    clean.includes('rx kaushii')
  );
}

/**
 * Returns full 4-slot roster for a franchise team:
 * [0]: Permanent Captain (or null if unassigned)
 * [1..3]: Legitimate Auction Drafted Players (sold with price > 0)
 */
export function getTeamFullRoster(teamId, allPlayers = []) {
  if (!teamId) {
    return {
      captain: null,
      auctionedPlayers: [],
      slots: [null, null, null, null],
      totalCount: 0,
      remainingSlots: 4,
      isFull: false,
      isPendingTeam: false,
    };
  }

  const cleanTeamId = String(teamId).toLowerCase().trim();
  const isPending = false; // All 4 teams are active franchises!

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
      const capInGame = (baseCaptain.in_game_name || '').toLowerCase().trim();
      return (
        pName === capName ||
        pName === capInGame ||
        (capName.includes('kaush') && pName.includes('kaush')) ||
        p.id === baseCaptain.id ||
        (p.is_captain && (String(p.sold_to_team_id).toLowerCase() === cleanTeamId || String(p.current_highest_bidder).toLowerCase() === cleanTeamId))
      );
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
  } else {
    // Fallback: look in database players for an appointed captain for this team
    const dbCaptain = uniquePlayers.find(
      (p) =>
        (p.is_captain === true || isPermanentCaptainName(p.in_game_name || p.name)) &&
        (String(p.sold_to_team_id || '').toLowerCase() === cleanTeamId ||
          String(p.current_highest_bidder || '').toLowerCase() === cleanTeamId)
    );
    if (dbCaptain) {
      captain = {
        ...dbCaptain,
        is_captain: true,
        is_locked: true,
        role: 'IGL',
        status: 'captain',
      };
    }
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
        p.status === 'sold' &&
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

  // Max draft capacity depends on whether a pre-assigned captain is present
  // If captain is present (Teams 1, 2, 3): 1 captain + max 3 drafted = 4 total (starts with 3 open slots)
  // If no captain (RX KUDLA): 0 captain + max 4 drafted = 4 total (starts with 4 open slots)
  const maxDraftAllowed = captain ? 3 : 4;
  const cappedSold = teamSold.slice(0, maxDraftAllowed);

  let slots;
  if (captain) {
    slots = [
      captain,
      cappedSold[0] || null,
      cappedSold[1] || null,
      cappedSold[2] || null,
    ];
  } else {
    slots = [
      cappedSold[0] || null,
      cappedSold[1] || null,
      cappedSold[2] || null,
      cappedSold[3] || null,
    ];
  }

  const totalCount = (captain ? 1 : 0) + cappedSold.length;
  const remainingSlots = Math.max(0, 4 - totalCount);
  const isFull = totalCount >= 4;

  return {
    captain,
    auctionedPlayers: cappedSold,
    slots,
    totalCount,
    remainingSlots,
    isFull,
    isPendingTeam: false,
  };
}

/**
 * Checks if a team has filled all 4 roster slots.
 */
export function isTeamRosterFull(teamId, allPlayers = []) {
  const { isFull } = getTeamFullRoster(teamId, allPlayers);
  return isFull;
}
