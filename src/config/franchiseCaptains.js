// =============================================================================
//  FRANCHISE CAPTAINS & ROSTER MANAGEMENT CONFIGURATION
// =============================================================================
// Each active team has a 4-player roster capacity and 40,000 FC starting purse.
// Slot 1: Team Captain (Permanent / Appointed)
// Slots 2–4: Auction Drafted Players (sold for FC > 0 during live bidding)
// =============================================================================

import { TEAMS_CONFIG } from './teamsConfig';

export const MAX_ROSTER_SIZE = 4;
export const MAX_AUCTION_SLOTS = 3;

/** Permanent Franchise Captains Definition */
export const PERMANENT_CAPTAINS = {
  alpha_wolves: {
    name: 'NX4 SILENT',
    in_game_name: 'NX4 SILENT',
    role: 'IGL',
    base_price: 0,
    current_bid: 0,
    sold_price: 0,
    max_limit: 30000,
    photo_url: '/power-hawks.png',
    custom_card_url: '/power-hawks.png',
    image_url: '/power-hawks.png',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    team_id: 'alpha_wolves',
    team_name: 'POWER HAWKS',
  },
  beta_strikers: {
    name: 'MOKSHII FF',
    in_game_name: 'MOKSHII FF',
    role: 'IGL',
    base_price: 0,
    current_bid: 0,
    sold_price: 0,
    max_limit: 30000,
    photo_url: '/team-vortex.png',
    custom_card_url: '/team-vortex.png',
    image_url: '/team-vortex.png',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    team_id: 'beta_strikers',
    team_name: 'TEAM VORTEX',
  },
  gamma_reapers: {
    name: 'invincible',
    in_game_name: 'invincible',
    role: 'IGL',
    base_price: 0,
    current_bid: 0,
    sold_price: 0,
    max_limit: 30000,
    photo_url: '/abyssal-ebon.png',
    custom_card_url: '/abyssal-ebon.png',
    image_url: '/abyssal-ebon.png',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    team_id: 'gamma_reapers',
    team_name: 'ABYSSAL EBON',
  },
  delta_phantoms: {
    name: 'RX KAUSHII',
    in_game_name: 'RX KAUSHII',
    role: 'IGL',
    base_price: 0,
    current_bid: 0,
    sold_price: 0,
    max_limit: 30000,
    photo_url: '/rx-kudla.png',
    custom_card_url: '/rx-kudla.png',
    image_url: '/rx-kudla.png',
    is_captain: true,
    is_locked: true,
    status: 'captain',
    team_id: 'delta_phantoms',
    team_name: 'RX KUDLA',
  },
};

/** Returns true if given name matches any permanent captain */
export function isPermanentCaptainName(name) {
  if (!name) return false;
  const clean = String(name).toLowerCase().trim();
  return (
    clean === 'nx4 silent' ||
    clean === 'mokshii ff' ||
    clean === 'invincible' ||
    clean === 'rx kaushii' ||
    clean === 'nx4_silent' ||
    clean === 'mokshii_ff' ||
    clean === 'rx_kaushii'
  );
}

/** Returns the captain configuration for a team */
export function getCaptainForTeam(teamId) {
  if (!teamId) return null;
  const clean = String(teamId).toLowerCase().trim();
  if (clean === 'alpha_wolves' || clean === 'team_alpha' || clean === 'alpha' || clean === '1' || clean === 'power hawks' || clean === 'power_hawks') {
    return PERMANENT_CAPTAINS.alpha_wolves;
  }
  if (clean === 'beta_strikers' || clean === 'team_beta' || clean === 'beta' || clean === '2' || clean === 'team vortex' || clean === 'team_vortex' || clean === 'vortex') {
    return PERMANENT_CAPTAINS.beta_strikers;
  }
  if (
    clean === 'gamma_reapers' ||
    clean === 'team_gamma' ||
    clean === 'gamma' ||
    clean === '3' ||
    clean === 'abyssal ebon' ||
    clean === 'abyssal_ebon' ||
    clean === 'abyssal' ||
    clean === 'ebon'
  ) {
    return PERMANENT_CAPTAINS.gamma_reapers;
  }
  if (
    clean === 'delta_phantoms' ||
    clean === 'team_delta' ||
    clean === 'delta' ||
    clean === '4' ||
    clean === 'rx kudla' ||
    clean === 'rx_kudla' ||
    clean === 'rx' ||
    clean === 'kudla'
  ) {
    return PERMANENT_CAPTAINS.delta_phantoms;
  }
  return null;
}

/** Robust Helper to check if a player belongs to a given team ID (handles aliases, integers, case insensitivity) */
export function isPlayerAssignedToTeam(player, targetTeamId) {
  if (!player || !targetTeamId) return false;
  const tId = String(targetTeamId).toLowerCase().trim();
  const config = TEAMS_CONFIG.find(c => c.id === tId || c.aliases?.includes(tId));

  const validKeys = new Set(
    [
      tId,
      config?.id,
      ...(config?.aliases || []),
      config?.name?.toLowerCase(),
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().trim())
  );

  const pSoldTo = String(player.sold_to_team_id || player.team_id || '').toLowerCase().trim();
  const pHighest = String(player.current_highest_bidder || '').toLowerCase().trim();

  return (pSoldTo && validKeys.has(pSoldTo)) || (pHighest && validKeys.has(pHighest));
}

/**
 * Returns full 4-slot roster for a franchise team:
 * [0]: Permanent Captain (or null if unassigned)
 * [1..3]: Legitimate Auction Drafted Players (sold with status: 'sold')
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

  // Deduplicate all incoming player objects by unique ID
  const uniquePlayersMap = new Map();
  for (const p of allPlayers || []) {
    if (p && p.id && !uniquePlayersMap.has(String(p.id))) {
      uniquePlayersMap.set(String(p.id), p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  // 1. Resolve Captain: Strictly derive from active database records
  const baseCaptain = getCaptainForTeam(cleanTeamId);
  let captain = null;

  const dbMatch = uniquePlayers.find((p) => {
    if (!p) return false;
    const pName = (p.in_game_name || p.name || '').toLowerCase().trim();
    const capName = baseCaptain?.name?.toLowerCase().trim();
    const capInGame = (baseCaptain?.in_game_name || '').toLowerCase().trim();
    const isMatchingName = (capName && pName === capName) || (capInGame && pName === capInGame) || (p.id === baseCaptain?.id);
    const isAssigned = isPlayerAssignedToTeam(p, cleanTeamId);

    return (p.is_captain === true && isAssigned) || (isMatchingName && isAssigned);
  });

  if (dbMatch) {
    captain = {
      ...(baseCaptain || {}),
      ...dbMatch,
      id: dbMatch.id,
      photo_url: dbMatch.photo_url || dbMatch.custom_card_url || baseCaptain?.photo_url,
      custom_card_url: dbMatch.custom_card_url || null,
      image_url: dbMatch.image_url || null,
      is_captain: true,
      is_locked: true,
      role: 'IGL',
      status: 'captain',
    };
  }

  const captainId = captain?.id ? String(captain.id) : null;
  const captainName = (captain?.in_game_name || captain?.name || '').toLowerCase().trim();

  // 2. Drafted players (strictly auctioned non-captains with status === 'sold')
  const seenDraftedIds = new Set();
  const teamSold = [];

  for (const p of uniquePlayers) {
    if (!p) continue;
    const isSold = p.status === 'sold';
    const isAssigned = isPlayerAssignedToTeam(p, cleanTeamId);

    const isCaptainPlayer =
      p.is_captain === true ||
      isPermanentCaptainName(p.in_game_name || p.name) ||
      (captainId && String(p.id) === captainId);

    if (isSold && isAssigned && !isCaptainPlayer) {
      const pid = String(p.id);
      const pname = (p.in_game_name || p.name || '').toLowerCase().trim();

      if ((!captainId || pid !== captainId) && (!captainName || pname !== captainName) && !seenDraftedIds.has(pid)) {
        seenDraftedIds.add(pid);
        teamSold.push(p);
      }
    }
  }

  // Max draft capacity:
  // If captain is present: 1 captain + max 3 drafted = 4 slots total
  // If no captain: max 4 drafted = 4 slots total
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
