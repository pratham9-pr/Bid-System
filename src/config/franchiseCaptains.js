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

/** Permanent Franchise Captains Definition (Dynamic) */
export const PERMANENT_CAPTAINS = {};

/** Returns true if given name matches any permanent captain */
export function isPermanentCaptainName(name) {
  if (!name) return false;
  const clean = String(name).toLowerCase().trim();
  return Object.values(PERMANENT_CAPTAINS).some(c => c.name?.toLowerCase() === clean);
}

/** Returns the captain configuration for a team */
export function getCaptainForTeam(teamId) {
  if (!teamId) return null;
  return PERMANENT_CAPTAINS[teamId] || null;
}

/** Robust Helper to check if a player belongs to a given team ID */
export function isPlayerAssignedToTeam(player, targetTeamId) {
  if (!player || !targetTeamId) return false;
  const tId = String(targetTeamId).toLowerCase().trim();
  const pSoldTo = String(player.sold_to_team_id || player.team_id || '').toLowerCase().trim();
  const pHighest = String(player.current_highest_bidder || '').toLowerCase().trim();

  return pSoldTo === tId || pHighest === tId;
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
