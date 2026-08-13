import { supabase } from '../config/supabase';

// ─── GLOBAL AUCTION CONSTRAINTS ───────────────────────────────────────────────
export const MAX_BID_LIMIT = 30000;       // 30,000 FC max global auto-sell cap
export const DEFAULT_TEAM_PURSE = 50000;  // 50,000 FC default starting team purse

// ─── Safe type helpers ────────────────────────────────────────────────────────
// Guarantee a clean integer — returns 0 for null / undefined / NaN
const safeInt   = (v, fallback = 0) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n; };
// Guarantee a clean float — returns 0 for null / undefined / NaN
const safeNum   = (v, fallback = 0) => { const n = Number(v);       return isNaN(n) ? fallback : n; };
// Guarantee a non-empty string — returns null otherwise
const safeStr   = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
// auction_state always has id = 1 (integer) — never pass "current"
const STATE_ROW = 1;

// ─────────────────────────────────────────────────────────────────────────────
//  PLACE BID (Atomic Transaction RPC with 30,000 FC Max Cap Auto-Sell)
// ─────────────────────────────────────────────────────────────────────────────
export async function placeBid(playerId, teamId, bidAmount) {
  try {
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
    //    auction_state.id is INTEGER = 1, never pass the string "current"
    const { error: stateError } = await supabase
      .from('auction_state')
      .update({
        active_player_id:      pId,
        is_revealed:           false,
        bidding_open:          false,
        status:                'idle',
        current_bid:           safeNum(player?.current_bid ?? player?.base_price, 0),
        max_bid_limit:         MAX_BID_LIMIT,
        highest_bidder_team_id: null,
      })
      .eq('id', STATE_ROW);

    if (stateError) {
      console.warn('auction_state update notice:', stateError.message);
    }

    return { success: true, playerName: player?.name || player?.in_game_name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Reveal Player on Stage (triggers 3D flip — bidding stays locked until host opens floor) ───
export async function revealPlayer() {
  try {
    const response = await supabase
      .from('auction_state')
      .update({
        is_revealed:  true,
        bidding_open: false,   // floor stays locked; host must click "Start Bidding"
        status:       'revealed',
      })
      .eq('id', STATE_ROW);

    console.log('Reveal payload sent:', response);

    if (response.error) return { success: false, error: response.error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Open Bidding Floor (host explicitly allows bids after reveal) ─────────────
export async function startBidding() {
  try {
    const { error } = await supabase
      .from('auction_state')
      .update({ bidding_open: true, status: 'bidding' })
      .eq('id', STATE_ROW);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Close Bidding Floor (host locks bids mid-session if needed) ───────────────
export async function closeBidding() {
  try {
    const { error } = await supabase
      .from('auction_state')
      .update({ bidding_open: false, status: 'revealed' })
      .eq('id', STATE_ROW);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function hidePlayer() {
  try {
    const { error } = await supabase
      .from('auction_state')
      .update({ is_revealed: false, status: 'idle' })
      .eq('id', STATE_ROW);

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
      await supabase.from('auction_state').update({ status: 'sold' }).eq('id', STATE_ROW);
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
    await supabase
      .from('auction_state')
      .update({
        status:                 'sold',
        bidding_open:           false,
        is_revealed:            true,
        highest_bidder_team_id: tId,
        current_bid:            sellPrice,
      })
      .eq('id', STATE_ROW);

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
      await supabase
        .from('auction_state')
        .update({ active_player_id: null, status: 'idle' })
        .eq('id', STATE_ROW);
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

    await supabase
      .from('auction_state')
      .update({ status: newStatus, auction_paused: !isCurrentlyPaused })
      .eq('id', STATE_ROW);

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

    // 1. Clear any prior captain for this team
    await supabase
      .from('players')
      .update({
        is_captain:                  false,
        status:                      'upcoming',
        current_highest_bidder:      null,
        current_highest_bidder_name: null,
        sold_to_team_id:             null,
      })
      .or(`current_highest_bidder.eq.${tId},sold_to_team_id.eq.${tId}`)
      .eq('is_captain', true);

    // 2. Appoint new captain: role='IGL', is_captain=true, status='sold', locked into team
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update({
        is_captain:                  true,
        role:                        'IGL',
        status:                      'sold',
        current_highest_bidder:      tId,
        current_highest_bidder_name: tName,
        sold_to_team_id:             tId,
        current_bid:                 0,
        sold_price:                  0,
      })
      .eq('id', pId)
      .select()
      .single();

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
    const { error } = await supabase
      .from('players')
      .update({
        is_captain:                  false,
        status:                      'upcoming',
        current_highest_bidder:      null,
        current_highest_bidder_name: null,
        sold_to_team_id:             null,
      })
      .eq('id', pId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
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
