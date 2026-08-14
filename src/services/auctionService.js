import { supabase } from '../config/supabase';

// ─── GLOBAL AUCTION CONSTRAINTS ───────────────────────────────────────────────
export const MAX_BID_LIMIT       = 30000; // 30,000 FC global auto-sell cap (hard ceiling)
export const DEFAULT_TEAM_PURSE  = 30000; // 30,000 FC starting team purse
export const MIN_BASE_PRICE      = 3000;  // Lowest possible player base price — used in max-bid formula

/**
 * Computes the maximum a team is ALLOWED to bid on the current player,
 * preventing soft-locks where a team spends so much they can't afford
 * the mandatory minimum bids for remaining open auction slots.
 *
 * Formula: remainingPurse - (MIN_BASE_PRICE × (remainingEmptySlots - 1))
 *
 * @param {number} remainingPurse     - Team's current fire_coin_balance
 * @param {number} remainingEmptySlots - How many auction draft slots are still open (1–3)
 * @returns {number} Maximum allowed bid amount (floored at 0)
 */
export function computeMaxAllowedBid(remainingPurse, remainingEmptySlots) {
  if (!remainingPurse || remainingPurse <= 0) return 0;
  const slotsAfterThis = Math.max(0, (remainingEmptySlots || 1) - 1);
  const reserved = MIN_BASE_PRICE * slotsAfterThis;
  const maxAllowed = Math.max(0, remainingPurse - reserved);
  // Also respect the global hard cap
  return Math.min(maxAllowed, MAX_BID_LIMIT);
}

// ─── Safe type helpers ────────────────────────────────────────────────────────
// Guarantee a clean integer — returns 0 for null / undefined / NaN
const safeInt   = (v, fallback = 0) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n; };
// Guarantee a clean float — returns 0 for null / undefined / NaN
const safeNum   = (v, fallback = 0) => { const n = Number(v);       return isNaN(n) ? fallback : n; };
// Guarantee a non-empty string — returns null otherwise
const safeStr   = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
// auction_state always has id = 1 (integer) — never pass "current"
const STATE_ROW = 1;

export function isActiveFranchise(teamId) {
  if (!teamId) return false;
  const clean = String(teamId).toLowerCase().trim();
  return (
    clean === 'alpha_wolves' ||
    clean === 'team_alpha' ||
    clean === 'power_hawks' ||
    clean === 'power hawks' ||
    clean === 'alpha' ||
    clean === 'beta_strikers' ||
    clean === 'team_beta' ||
    clean === 'team_vortex' ||
    clean === 'team vortex' ||
    clean === 'beta' ||
    clean === 'vortex'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLACE BID (Atomic Transaction RPC with 30,000 FC Max Cap Auto-Sell)
// ─────────────────────────────────────────────────────────────────────────────
export async function placeBid(playerId, teamId, bidAmount) {
  try {
    if (!isActiveFranchise(teamId)) {
      return {
        success: false,
        error: 'Only active franchises (POWER HAWKS and TEAM VORTEX) can participate in bidding.',
      };
    }

    const numericBid = Math.min(MAX_BID_LIMIT, safeNum(bidAmount));

    const { data, error } = await supabase.rpc('place_bid', {
      p_player_id:  String(playerId),
      p_team_id:    String(teamId),
      p_bid_amount: numericBid,
    });

    if (error) return { success: false, error: error.message };
    return data;
  } catch (err) {
    return { success: false, error: err.message || 'Network error placing bid' };
  }
}

// ─── Safe auction_state updater ─────────────────────────────────────────────
// Dynamically resolves singleton row ID (whether 1, 'current', or UUID)
async function safeUpdateAuctionState(payload) {
  try {
    // 1. Get the existing row ID from auction_state
    const { data: existingRows } = await supabase
      .from('auction_state')
      .select('id')
      .limit(1);

    const existingRow = existingRows && existingRows[0];

    if (!existingRow) {
      // If table has no rows, create the row
      const { data: inserted, error: insertErr } = await supabase
        .from('auction_state')
        .insert({ id: 1, ...payload })
        .select()
        .maybeSingle();

      if (insertErr) {
        await supabase.from('auction_state').insert({ id: 'current', ...payload });
      }
      return { data: inserted, error: null };
    }

    const rowId = existingRow.id;

    // 2. Perform the update targeting the actual row ID
    let { data, error } = await supabase
      .from('auction_state')
      .update(payload)
      .eq('id', rowId)
      .select();

    // 3. If schema cache column error, strip optional columns and retry
    if (error && error.message && (error.message.includes('bidding_open') || error.message.includes('is_revealed') || error.message.includes('schema cache'))) {
      console.warn('auction_state column missing, retrying with core columns:', error.message);
      const cleanPayload = { ...payload };
      delete cleanPayload.bidding_open;
      delete cleanPayload.is_revealed;
      const retryRes = await supabase
        .from('auction_state')
        .update(cleanPayload)
        .eq('id', rowId)
        .select();
      data = retryRes.data;
      error = retryRes.error;
    }

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HOST LIFECYCLE CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

export async function setPlayerActive(playerId) {
  try {
    const pId = String(playerId);

    // 1. Fetch player to retrieve current_bid / base_price
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', pId)
      .maybeSingle();

    // 2. Set target player status to 'active'
    await supabase
      .from('players')
      .update({ status: 'active' })
      .eq('id', pId);

    // 3. Reset any other active players to upcoming
    await supabase
      .from('players')
      .update({ status: 'upcoming' })
      .neq('id', pId)
      .eq('status', 'active');

    // 4. Update auction_state: queue player but keep unrevealed & bidding locked
    const { error: stateError } = await safeUpdateAuctionState({
      active_player_id:      pId,
      is_revealed:           false,
      bidding_open:          false,
      status:                'idle',
      current_bid:           safeNum(player?.current_bid ?? player?.base_price, 0),
      max_bid_limit:         MAX_BID_LIMIT,
      highest_bidder_team_id: null,
    });

    if (stateError) {
      console.warn('auction_state update notice:', stateError.message);
    }

    return { success: true, playerName: player?.name || player?.in_game_name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Reveal Player on Stage (triggers 3D flip — bidding stays locked until host opens floor) ───
export async function revealPlayer(playerId) {
  try {
    let pId = playerId ? String(playerId) : null;
    let player = null;

    if (pId) {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('id', pId)
        .maybeSingle();
      player = data;
    } else {
      // 1. Check current active player in auction_state
      const { data: stateRows } = await supabase
        .from('auction_state')
        .select('active_player_id')
        .limit(1);

      const stateData = stateRows && stateRows[0];

      if (stateData?.active_player_id) {
        pId = String(stateData.active_player_id);
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('id', pId)
          .maybeSingle();
        player = data;
      } else {
        // Fallback: If no player staged, pull upcoming players and find the first non-captain
        const { data: nextPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('status', 'upcoming')
          .order('in_game_name', { ascending: true })
          .limit(10);

        const eligible = (nextPlayers || []).find((p) => !p.is_captain);
        if (eligible) {
          pId = String(eligible.id);
          player = eligible;
        }
      }
    }

    if (pId) {
      if (player?.is_captain) {
        return { success: false, error: 'Captains cannot be staged for bidding.' };
      }

      // Mark target player active in players table
      await supabase
        .from('players')
        .update({ status: 'active' })
        .eq('id', pId);

      // Reset any other active players back to upcoming
      await supabase
        .from('players')
        .update({ status: 'upcoming' })
        .neq('id', pId)
        .eq('status', 'active');
    }

    // Update auction_state with is_revealed: true
    const payload = {
      is_revealed:  true,
      bidding_open: false,   // floor stays locked; host clicks "Start Bidding" to open
      status:       'revealed',
    };

    if (pId) {
      payload.active_player_id = pId;
      payload.current_bid      = safeNum(player?.current_bid ?? player?.base_price, 0);
      payload.max_bid_limit    = MAX_BID_LIMIT;
    }

    const { error: stateError } = await safeUpdateAuctionState(payload);

    if (stateError) return { success: false, error: stateError.message };
    return { success: true, playerName: player?.in_game_name || player?.name || 'Player' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Open Bidding Floor (host explicitly allows bids after reveal) ─────────────
export async function startBidding() {
  try {
    const { error } = await safeUpdateAuctionState({ bidding_open: true, status: 'bidding' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Close Bidding Floor (host locks bids mid-session if needed) ───────────────
export async function closeBidding() {
  try {
    const { error } = await safeUpdateAuctionState({ bidding_open: false, status: 'revealed' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function hidePlayer() {
  try {
    const { error } = await safeUpdateAuctionState({ is_revealed: false, status: 'idle' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function forcePlayerSold(playerId) {
  try {
    const pId = String(playerId);
    const { data, error } = await supabase.rpc('force_player_sold', {
      p_player_id: pId,
    });
    if (error) {
      // Direct fallback — use integer id, never the string "current"
      await supabase.from('players').update({ status: 'sold' }).eq('id', pId);
      await safeUpdateAuctionState({ status: 'sold' });
      return { success: true };
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL SELL TO TEAM (Host Override — assigns player to chosen franchise)
// ─────────────────────────────────────────────────────────────────────────────
export async function manualSellToTeam(playerId, teamId, teamName, price) {
  try {
    const pId      = String(playerId);
    const tId      = String(teamId);             // teams.id is TEXT/UUID — keep as string
    const tName    = String(teamName || tId);
    const givenPrice = safeNum(price, 0);

    // 1. Fetch player for fallback price
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', pId)
      .maybeSingle();

    if (!player) return { success: false, error: 'Player not found.' };

    // Sell price priority: provided price → current_bid → base_price
    const sellPrice = givenPrice > 0
      ? givenPrice
      : safeNum(player.current_bid, 0) > 0
        ? safeNum(player.current_bid, 0)
        : safeNum(player.base_price, 0);

    // 2. Mark player as sold to the selected team
    const { error: playerError } = await supabase
      .from('players')
      .update({
        status:                      'sold',
        sold_to_team_id:             tId,
        current_highest_bidder:      tId,
        current_highest_bidder_name: tName,
        current_bid:                 sellPrice,
        sold_price:                  sellPrice,
      })
      .eq('id', pId);

    if (playerError) return { success: false, error: playerError.message };

    // 3. Update auction_state row 1 (integer)
    await safeUpdateAuctionState({
      status:                 'sold',
      bidding_open:           false,
      is_revealed:            true,
      highest_bidder_team_id: tId,
      current_bid:            sellPrice,
    });

    // 4. Deduct sell price from winning team's balance
    const { data: teamData } = await supabase
      .from('teams')
      .select('fire_coin_balance')
      .eq('id', tId)
      .maybeSingle();

    if (teamData && typeof teamData.fire_coin_balance === 'number') {
      const newBalance = Math.max(0, teamData.fire_coin_balance - sellPrice);
      await supabase
        .from('teams')
        .update({ fire_coin_balance: newBalance })
        .eq('id', tId);
    }

    return {
      success:    true,
      playerName: player.in_game_name || player.name,
      teamName:   tName,
      sellPrice,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function markUnsold(playerId) {
  try {
    const pId = String(playerId);
    const { data, error } = await supabase.rpc('mark_unsold', {
      p_player_id: pId,
    });
    if (error) {
      // Direct fallback — integer id only
      await supabase.from('players').update({ status: 'unsold' }).eq('id', pId);
      await safeUpdateAuctionState({ active_player_id: null, status: 'idle' });
      return { success: true };
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function toggleAuctionPause() {
  try {
    const { data: stateData } = await supabase
      .from('auction_state')
      .select('*')
      .eq('id', STATE_ROW)
      .maybeSingle();

    const isCurrentlyPaused = stateData?.status === 'paused' || stateData?.auction_paused === true;
    const newStatus = isCurrentlyPaused ? 'bidding' : 'paused';

    await safeUpdateAuctionState({ status: newStatus, auction_paused: !isCurrentlyPaused });

    try {
      await supabase.rpc('toggle_auction_pause');
    } catch (e) {}

    return { success: true, auction_paused: !isCurrentlyPaused };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function activateNextPlayer() {
  try {
    const { data, error } = await supabase.rpc('activate_next_player');
    if (!error && data?.success) return data;

    // Fallback: Query next upcoming player directly
    const { data: nextPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('status', 'upcoming')
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextPlayer) {
      return await setPlayerActive(nextPlayer.id);
    }
    return { success: false, error: 'No upcoming players in queue.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function resetPlayer(playerId) {
  try {
    const pId = String(playerId);
    const { data, error } = await supabase.rpc('reset_player', {
      p_player_id: pId,
    });
    if (error) {
      await supabase.from('players').update({ status: 'upcoming' }).eq('id', pId);
      return { success: true };
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADD PLAYER (Upload custom card / photo to Supabase Storage + Insert row)
// ─────────────────────────────────────────────────────────────────────────────
export async function addPlayer({
  name,
  in_game_name,
  base_price,
  max_limit,
  role,
  photo_file,
  custom_card_file,
  photo_url: directPhotoUrl,
  custom_card_url: directCardUrl,
}) {
  try {
    const cleanName     = (name || in_game_name || '').trim();
    const basePrice     = safeNum(base_price, 0);
    const maxLimit      = safeNum(max_limit, MAX_BID_LIMIT) || MAX_BID_LIMIT;
    let photo_url       = directPhotoUrl || directCardUrl || null;
    let custom_card_url = directCardUrl  || directPhotoUrl || null;

    // 1. Upload custom card image / photo file if provided
    const fileToUpload = custom_card_file || photo_file;
    if (fileToUpload && typeof fileToUpload !== 'string') {
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `cards/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        console.warn('Storage upload warning:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('player_photos')
          .getPublicUrl(uploadData.path);
        custom_card_url = publicUrlData?.publicUrl || null;
        photo_url       = custom_card_url;
      }
    }

    // 2. Insert Player row matching exact schema
    const payload = {
      name:                        cleanName,
      in_game_name:                cleanName,
      base_price:                  basePrice,
      max_limit:                   maxLimit,
      role:                        safeStr(role),
      photo_url,
      custom_card_url,
      image_url:                   custom_card_url || photo_url,
      current_bid:                 basePrice,
      current_highest_bidder:      null,
      current_highest_bidder_name: null,
      status:                      'upcoming',
    };

    const { data, error } = await supabase
      .from('players')
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, playerId: data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEAM AUTH LOOKUP
// ─────────────────────────────────────────────────────────────────────────────
export async function getTeamById(teamId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', String(teamId))
    .single();

  return error ? null : data;
}

// ─── Safe player updater (handles missing is_captain column gracefully) ──────────
async function safeUpdatePlayer(playerId, payload) {
  const pId = String(playerId);
  let { data, error } = await supabase
    .from('players')
    .update(payload)
    .eq('id', pId)
    .select()
    .maybeSingle();

  // If column error (e.g. is_captain missing in schema cache), strip is_captain and retry
  if (error && error.message && error.message.includes('is_captain')) {
    console.warn('players table missing is_captain column, retrying with core columns:', error.message);
    const cleanPayload = { ...payload };
    delete cleanPayload.is_captain;
    const retryRes = await supabase
      .from('players')
      .update(cleanPayload)
      .eq('id', pId)
      .select()
      .maybeSingle();
    data = retryRes.data;
    error = retryRes.error;
  }

  return { data, error };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAPTAIN APPOINTMENT (Host Control)
//  Appoints player as franchise Captain, sets role to IGL, locks into team roster
// ─────────────────────────────────────────────────────────────────────────────
export async function appointTeamCaptain(playerId, teamId, teamName) {
  try {
    const pId  = String(playerId);
    const tId  = String(teamId);

    let tName = String(teamName || '').trim();
    if (!tName) {
      const { data: tData } = await supabase
        .from('teams')
        .select('name, team_name')
        .eq('id', tId)
        .maybeSingle();
      tName = tData?.name || tData?.team_name || tId;
    }

    // 1. Release any prior captain of this team so they return to the auction pool
    try {
      const { data: priorPlayers } = await supabase
        .from('players')
        .select('id, is_captain, role, current_bid')
        .or(`sold_to_team_id.eq.${tId},current_highest_bidder.eq.${tId}`)
        .neq('id', pId);

      if (priorPlayers && priorPlayers.length > 0) {
        for (const prev of priorPlayers) {
          // Release prior captains (0-bid / IGL)
          if (prev.is_captain || prev.role === 'IGL' || prev.current_bid === 0) {
            await safeUpdatePlayer(prev.id, {
              is_captain:                  false,
              status:                      'upcoming',
              current_highest_bidder:      null,
              current_highest_bidder_name: null,
              sold_to_team_id:             null,
              sold_price:                  0,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Prior captain reset warning:', e);
    }

    // 2. Appoint new captain: role='IGL', is_captain=true, status='sold', locked into team
    const appointPayload = {
      is_captain:                  true,
      role:                        'IGL',
      status:                      'sold',
      current_highest_bidder:      tId,
      current_highest_bidder_name: tName,
      sold_to_team_id:             tId,
      current_bid:                 0,
      sold_price:                  0,
    };

    const { data: updatedPlayer, error } = await safeUpdatePlayer(pId, appointPayload);

    if (error) {
      console.error('Appoint captain error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, player: updatedPlayer };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removeTeamCaptain(playerId) {
  try {
    const pId = String(playerId);
    const { error } = await safeUpdatePlayer(pId, {
      is_captain:                  false,
      status:                      'upcoming',
      current_highest_bidder:      null,
      current_highest_bidder_name: null,
      sold_to_team_id:             null,
      sold_price:                  0,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function removePlayerFromRoster(playerId) {
  return removeTeamCaptain(playerId);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLEAR ALL ROSTERS & CAPTAINS (Empty all slots & restore purses)
// ─────────────────────────────────────────────────────────────────────────────
export async function resetAllRostersAndCaptains() {
  try {
    // 1. Fetch all players to reset their bids to their own base_price
    const { data: allP } = await supabase.from('players').select('id, in_game_name, name, base_price');

    if (allP && allP.length > 0) {
      for (const p of allP) {
        const pName = (p.in_game_name || p.name || '').toLowerCase().trim();
        const isNx4 = pName.includes('nx4') || pName.includes('silent') || p.id === 'CAP_NX4_SILENT';
        const isMokshii = pName.includes('mokshii') || p.id === 'CAP_MOKSHII_FF';

        if (isNx4) {
          // Lock NX4 SILENT as Permanent Captain for POWER HAWKS
          await safeUpdatePlayer(p.id, {
            status:                      'sold',
            is_captain:                  true,
            role:                        'IGL',
            sold_to_team_id:             'alpha_wolves',
            current_highest_bidder:      'alpha_wolves',
            current_highest_bidder_name: 'POWER HAWKS',
            sold_price:                  0,
            current_bid:                 0,
          });
        } else if (isMokshii) {
          // Lock MOKSHII FF as Permanent Captain for TEAM VORTEX
          await safeUpdatePlayer(p.id, {
            status:                      'sold',
            is_captain:                  true,
            role:                        'IGL',
            sold_to_team_id:             'beta_strikers',
            current_highest_bidder:      'beta_strikers',
            current_highest_bidder_name: 'TEAM VORTEX',
            sold_price:                  0,
            current_bid:                 0,
          });
        } else {
          // General Auction Pool Player
          await safeUpdatePlayer(p.id, {
            status:                      'upcoming',
            is_captain:                  false,
            sold_to_team_id:             null,
            sold_price:                  0,
            current_highest_bidder:      null,
            current_highest_bidder_name: null,
            current_bid:                 p.base_price || 0,
          });
        }
      }
    }

    // 2. Reset team balances to default purse (30,000 FC)
    await supabase.from('teams').update({
      fire_coin_balance: DEFAULT_TEAM_PURSE,
      last_bid_time:     null,
    }).neq('id', '___NEVER_MATCH___');

    // 3. Reset auction state
    await safeUpdateAuctionState({
      active_player_id:        null,
      is_revealed:             false,
      bidding_open:            false,
      status:                  'idle',
      current_bid:             0,
      highest_bidder_team_id:  null,
      auction_paused:          false,
    });

    return { success: true };
  } catch (err) {
    console.error('Reset all rosters error:', err);
    return { success: false, error: err.message || 'Failed to reset rosters' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DATABASE SEED
// ─────────────────────────────────────────────────────────────────────────────
export async function seedDatabase() {
  try {
    const { data, error } = await supabase.rpc('seed_auction_data');
    if (error) return { success: false, error: error.message };
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
