import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * useAuctionRoom (Supabase Realtime)
 * Subscribes to:
 *  - public:auction_state (active_player_id, status, is_revealed, auction_paused)
 *  - public:players (current active player updates)
 *  - public:teams (current logged-in team balance & last_bid_time)
 */
export function useAuctionRoom(teamId) {
  const [activePlayer,   setActivePlayer]   = useState(null);
  const [team,           setTeam]           = useState(null);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [isRevealed,     setIsRevealed]     = useState(false);
  const [biddingOpen,    setBiddingOpen]    = useState(false);
  const [auctionState,   setAuctionState]   = useState(null);
  const [auctionPaused,  setAuctionPaused]  = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  // Helper to fetch full player doc — returns null for captains (not biddable)
  const fetchPlayer = async (id) => {
    if (!id) {
      setActivePlayer(null);
      return;
    }
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data && !data.is_captain) {
      setActivePlayer(data);
    } else {
      // Captain or not found — clear active player so bidding UI stays closed
      setActivePlayer(null);
    }
  };

  // Helper to fetch team doc
  const fetchTeam = async (id) => {
    if (!id) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data) setTeam(data);
  };

  // 1. Initial Data Fetch & State Listener
  useEffect(() => {
    let isMounted = true;

    async function syncState() {
      try {
        const { data: stateData } = await supabase
          .from('auction_state')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (isMounted && stateData) {
          setAuctionState(stateData);
          setActivePlayerId(stateData.active_player_id || null);
          setIsRevealed(stateData.is_revealed === true);
          setBiddingOpen(stateData.bidding_open === true);
          setAuctionPaused(stateData.status === 'paused' || stateData.auction_paused === true);
          if (stateData.active_player_id) {
            await fetchPlayer(stateData.active_player_id);
          } else {
            setActivePlayer(null);
          }
        }
      } catch (e) {
        console.warn('Auction state sync warning:', e);
      }
    }

    async function init() {
      try {
        await syncState();
        if (teamId) {
          await fetchTeam(teamId);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    // 2. Realtime Subscriptions via Supabase Channel
    const channel = supabase
      .channel('auction_room_channel')
      // Auction state changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        (payload) => {
          console.log('Real-time update received:', payload.new);
          const newState = payload.new;
          if (newState) {
            setAuctionState(newState);
            setActivePlayerId(newState.active_player_id || null);
            setIsRevealed(newState.is_revealed === true);
            setBiddingOpen(newState.bidding_open === true);
            setAuctionPaused(newState.status === 'paused' || newState.auction_paused === true);
            if (newState.active_player_id) {
              fetchPlayer(newState.active_player_id);
            } else {
              setActivePlayer(null);
            }
          }
        }
      )
      // Players updates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          const newPlayer = payload.new;
          if (newPlayer && newPlayer.id === activePlayerId) {
            setActivePlayer(newPlayer);
          } else if (newPlayer && newPlayer.status === 'active') {
            setActivePlayer(newPlayer);
          }
        }
      )
      // Teams updates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          const updatedTeam = payload.new;
          if (updatedTeam && updatedTeam.id === teamId) {
            setTeam(updatedTeam);
          }
        }
      )
      .subscribe((status) => {
        console.log('Auction channel status:', status);
      });

    // 3. Fallback polling every 1.5s to ensure 100% sync even if tab sleeps
    const pollInterval = setInterval(() => {
      syncState();
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [teamId, activePlayerId]);

  return {
    auctionState,
    activePlayer,
    team,
    activePlayerId,
    isRevealed,
    biddingOpen,
    auctionPaused,
    loading,
    error,
  };
}

export default useAuctionRoom;
