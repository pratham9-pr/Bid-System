// ─── FRANCHISE CAPTAINS & ROSTER ALLOCATION SPECIFICATION ──────────────────
// All franchise slots start empty/unassigned by default.
// Captains are dynamically appointed by the Host from the UI.
// Once appointed, a captain occupies Slot 1 (and ONLY Slot 1) as locked IGL.
// Slots 2, 3, 4 are strictly for auction-drafted players (sold via bidding with price > 0).

export const MAX_ROSTER_SIZE   = 4; // Total 4 players per team (1 Captain + 3 Drafted)
export const MAX_AUCTION_SLOTS = 3; // Max 3 players can be acquired via bidding

export const FRANCHISE_CAPTAINS = {};

/**
 * Returns null by default — captains must be explicitly appointed by host.
 */
export function getCaptainForTeam(teamId) {
  return null;
}

/**
 * Returns full 4-slot roster for a franchise team:
 * [0]: Captain (Appointed by host in database) - Role: IGL, Locked (or null if unassigned)
 * [1..3]: Sold/Drafted players (or null if empty/available slot)
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
    };
  }

  const cleanTeamId = String(teamId).toLowerCase().trim();

  // 1. Deduplicate all incoming player objects by unique ID
  const uniquePlayersMap = new Map();
  for (const p of allPlayers || []) {
    if (p && p.id && !uniquePlayersMap.has(String(p.id))) {
      uniquePlayersMap.set(String(p.id), p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  // 2. Check if a captain is explicitly appointed in database for this franchise
  const appointedCaptain = uniquePlayers.find(
    (p) =>
      p.is_captain === true &&
      (String(p.sold_to_team_id || '').toLowerCase() === cleanTeamId ||
        String(p.current_highest_bidder || '').toLowerCase() === cleanTeamId)
  );

  const captain = appointedCaptain
    ? {
        ...appointedCaptain,
        role: appointedCaptain.role || 'IGL',
        is_captain: true,
        is_locked: true,
      }
    : null;

  const captainId = captain?.id ? String(captain.id) : null;
  const captainName = (captain?.in_game_name || captain?.name || '').toLowerCase().trim();

  // 3. Drafted players (players legitimately sold in auction with price > 0, excluding captain)
  const seenDraftedIds = new Set();
  const teamSold = [];

  for (const p of uniquePlayers) {
    const isSoldToThisTeam =
      (p.status === 'sold' || p.status === 'active') &&
      (String(p.sold_to_team_id || '').toLowerCase() === cleanTeamId ||
        String(p.current_highest_bidder || '').toLowerCase() === cleanTeamId);

    const isExplicitCaptain = p.is_captain === true;
    const hasAuctionPrice = (p.current_bid > 0 || p.sold_price > 0);

    // Only include real drafted players (non-captains with auction price > 0)
    if (isSoldToThisTeam && !isExplicitCaptain && hasAuctionPrice && p.role !== 'IGL') {
      const pid = String(p.id);
      const pname = (p.in_game_name || p.name || '').toLowerCase().trim();

      // Ensure captain is never duplicated into draft slots
      if (pid !== captainId && (!captainName || pname !== captainName) && !seenDraftedIds.has(pid)) {
        seenDraftedIds.add(pid);
        teamSold.push(p);
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
    captain: captain || null,
    auctionedPlayers: cappedSold,
    slots,
    totalCount: (captain ? 1 : 0) + cappedSold.length,
    remainingSlots: Math.max(0, MAX_AUCTION_SLOTS - cappedSold.length),
    isFull: cappedSold.length >= MAX_AUCTION_SLOTS && Boolean(captain),
  };
}

/**
 * Checks if a team has filled all 3 auction slots (meaning 4/4 full).
 */
export function isTeamRosterFull(teamId, allPlayers = []) {
  const cleanTeamId = String(teamId).toLowerCase().trim();
  const seenDraftedIds = new Set();
  for (const p of allPlayers || []) {
    if (
      p &&
      p.status === 'sold' &&
      !p.is_captain &&
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
