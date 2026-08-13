import { supabase } from '../config/supabase';

// ─── GLOBAL AUCTION CONSTRAINTS ───────────────────────────────────────────────
export const MAX_BID_LIMIT = 30000;       // 30,000 FC max global auto-sell cap
export const DEFAULT_TEAM_PURSE = 50000;  // 50,000 FC default starting team purse

// ─────────────────────────────────────────────────────────────────────────────
//  PLACE BID (Atomic Transaction RPC with 30,000 FC Max Cap Auto-Sell)
// ─────────────────────────────────────────────────────────────────────────────
export async function placeBid(playerId, teamId, bidAmount) {
  try {
    let numericBid = Number(bidAmount);
    if (numericBid > MAX_BID_LIMIT) {
      numericBid = MAX_BID_LIMIT;
    }

    const { data, error } = await supabase.rpc('place_bid', {
      p_player_id: String(playerId),
      p_team_id: String(teamId),
      p_bid_amount: numericBid,
    });

    if (error) {
      return { success: false, error: error.message };
    }

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
      .single();

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

    // 4. Update auction_state: queue player but keep unrevealed (is_revealed: false, status: 'idle')
    const { error: stateError } = await supabase
      .from('auction_state')
      .update({
        active_player_id: pId,
        is_revealed: false,
        status: 'idle',
        current_bid: player?.current_bid || player?.base_price || 0,
        max_bid_limit: MAX_BID_LIMIT,
        highest_bidder_team_id: null,
      })
      .or('id.eq.1,id.eq.current');

    if (stateError) {
      console.warn('Direct auction_state update notice:', stateError.message);
    }

    return { success: true, playerName: player?.name || player?.in_game_name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Reveal Player on Stage (triggers 3D flip & opens bidding) ────────────────
export async function revealPlayer() {
  try {
    const response = await supabase
      .from('auction_state')
      .update({
        is_revealed: true,
        status: 'bidding',
      })
      .eq('id', 1);

    console.log('Reveal payload sent:', response);

    if (response.error) return { success: false, error: response.error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function hidePlayer() {
  try {
    const { error } = await supabase
      .from('auction_state')
      .update({
        is_revealed: false,
        status: 'idle',
      })
      .eq('id', 1);

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
      // Direct fallback
      await supabase.from('players').update({ status: 'sold' }).eq('id', pId);
      await supabase.from('auction_state').update({ status: 'sold' }).or('id.eq.1,id.eq.current');
      return { success: true };
    }
    return data;
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
      // Direct fallback
      await supabase.from('players').update({ status: 'unsold' }).eq('id', pId);
      await supabase.from('auction_state').update({ active_player_id: null, status: 'idle' }).or('id.eq.1,id.eq.current');
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
      .limit(1)
      .single();

    const isCurrentlyPaused = stateData?.status === 'paused' || stateData?.auction_paused === true;
    const newStatus = isCurrentlyPaused ? 'bidding' : 'paused';

    await supabase
      .from('auction_state')
      .update({
        status: newStatus,
        auction_paused: !isCurrentlyPaused,
      })
      .or('id.eq.1,id.eq.current');

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
    const cleanName = (name || in_game_name || '').trim();
    let photo_url = directPhotoUrl || directCardUrl || null;
    let custom_card_url = directCardUrl || directPhotoUrl || null;

    // 1. Upload custom card image / photo file if provided
    const fileToUpload = custom_card_file || photo_file;
    if (fileToUpload && typeof fileToUpload !== 'string') {
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `cards/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Storage upload warning:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('player_photos')
          .getPublicUrl(uploadData.path);
        custom_card_url = publicUrlData?.publicUrl || null;
        photo_url = custom_card_url;
      }
    }

    // 2. Insert Player in database matching exact schema
    const payload = {
      name: cleanName,
      in_game_name: cleanName,
      base_price: Number(base_price),
      max_limit: Number(max_limit) || MAX_BID_LIMIT,
      role: role || null,
      photo_url,
      custom_card_url,
      image_url: custom_card_url || photo_url,
      current_bid: Number(base_price),
      current_highest_bidder: null,
      current_highest_bidder_name: null,
      status: 'upcoming',
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
    .eq('id', teamId)
    .single();

  return error ? null : data;
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
