import { useState, useEffect, useRef } from 'react';
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

  const activePlayerRef = useRef(activePlayer);
  activePlayerRef.current = activePlayer;

  const activePlayerIdRef = useRef(activePlayerId);
  activePlayerIdRef.current = activePlayerId;

  const teamIdRef = useRef(teamId);
  teamIdRef.current = teamId;

  // Helper to fetch full player doc — returns null for captains (not biddable)
  const fetchPlayer = async (id) => {
    if (!id) {
      setActivePlayer(null);
      return;
    }
    const cleanId = String(id);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (!error && data && !data.is_captain) {
      setActivePlayer((prev) => {
        // If local state already has newer/same bid, preserve it
        if (prev && String(prev.id) === cleanId && Number(prev.current_bid ?? 0) > Number(data.current_bid ?? 0)) {
          return { ...data, ...prev };
        }
        return data;
      });
      setActivePlayerId(data.id);
      activePlayerIdRef.current = data.id;
    } else if (!data) {
      setActivePlayer(null);
    }
  };

  // Helper to fetch team doc
  const fetchTeam = async (id) => {
    if (!id) return;
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', String(id))
      .maybeSingle();

    if (data) {
      let bal = typeof data.fire_coin_balance === 'number' ? data.fire_coin_balance : 40000;
      if (bal > 40000) {
        const spent = Math.max(0, 50000 - bal);
        bal = Math.max(0, 40000 - spent);
      }
      setTeam({ ...data, fire_coin_balance: bal });
    }
  };

  // 1. Initial Data Fetch & State Listener
  useEffect(() => {
    let isMounted = true;

    async function syncState() {
      try {
        const { data: stateRows } = await supabase
          .from('auction_state')
          .select('*')
          .limit(1);

        const stateData = stateRows && stateRows[0];

        if (isMounted && stateData) {
          setAuctionState(stateData);
          if (stateData.active_player_id) {
            setActivePlayerId(stateData.active_player_id);
            activePlayerIdRef.current = stateData.active_player_id;
          }
          const revealed = Boolean(
            stateData.is_revealed === true ||
            stateData.status === 'revealed' ||
            stateData.status === 'bidding' ||
            stateData.status === 'sold'
          );
          const bidding = Boolean(
            stateData.bidding_open === true ||
            stateData.status === 'bidding'
          );
          setIsRevealed(revealed);
          setBiddingOpen(bidding);
          setAuctionPaused(stateData.status === 'paused' || stateData.auction_paused === true);

          if (stateData.active_player_id) {
            await fetchPlayer(stateData.active_player_id);
          } else {
            // Also check if any non-captain player is marked active
            const { data: activePlayers } = await supabase
              .from('players')
              .select('*')
              .eq('status', 'active')
              .limit(1);
            if (activePlayers && activePlayers[0] && !activePlayers[0].is_captain) {
              setActivePlayer(activePlayers[0]);
              setActivePlayerId(activePlayers[0].id);
              activePlayerIdRef.current = activePlayers[0].id;
            } else {
              setActivePlayer(null);
            }
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
    const channelId = `auction_room_sub_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      // Auction state changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        async (payload) => {
          const newState = payload.new;
          if (newState && isMounted) {
            setAuctionState(newState);
            if (newState.active_player_id) {
              setActivePlayerId(newState.active_player_id);
              activePlayerIdRef.current = newState.active_player_id;
            }
            const revealed = Boolean(
              newState.is_revealed === true ||
              newState.status === 'revealed' ||
              newState.status === 'bidding' ||
              newState.status === 'sold'
            );
            const bidding = Boolean(
              newState.bidding_open === true ||
              newState.status === 'bidding'
            );
            setIsRevealed(revealed);
            setBiddingOpen(bidding);
            setAuctionPaused(newState.status === 'paused' || newState.auction_paused === true);

            // If newState has live bid, immediately update activePlayer state
            if (newState.current_bid != null) {
              setActivePlayer((prev) => {
                if (prev) {
                  return {
                    ...prev,
                    current_bid: newState.current_bid,
                    current_highest_bidder: newState.highest_bidder_team_id || prev.current_highest_bidder,
                  };
                }
                return prev;
              });
            }

            const targetId = newState.active_player_id || activePlayerIdRef.current;
            if (targetId) {
              await fetchPlayer(targetId);
            } else {
              setActivePlayer(null);
            }
          }
        }
      )
      // Players updates (live bid changes)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          const newPlayer = payload.new;
          if (newPlayer && isMounted) {
            const currentTargetId = activePlayerIdRef.current || activePlayerRef.current?.id;
            const matchesId = currentTargetId && String(newPlayer.id) === String(currentTargetId);
            const isActiveStage = newPlayer.status === 'active' || newPlayer.status === 'revealed' || newPlayer.status === 'bidding' || newPlayer.status === 'sold';

            if ((matchesId || isActiveStage) && !newPlayer.is_captain) {
              setActivePlayer((prev) => {
                if (!prev || String(prev.id) === String(newPlayer.id) || matchesId) {
                  return { ...(prev || {}), ...newPlayer };
                }
                return prev;
              });
              if (newPlayer.id) {
                setActivePlayerId(newPlayer.id);
                activePlayerIdRef.current = newPlayer.id;
              }
            }
          }
        }
      )
      // Teams updates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          const updatedTeam = payload.new;
          const currentTeamId = teamIdRef.current;
          if (updatedTeam && isMounted && currentTeamId && String(updatedTeam.id) === String(currentTeamId)) {
            let bal = typeof updatedTeam.fire_coin_balance === 'number' ? updatedTeam.fire_coin_balance : 40000;
            if (bal > 40000) {
              const spent = Math.max(0, 50000 - bal);
              bal = Math.max(0, 40000 - spent);
            }
            setTeam({ ...updatedTeam, fire_coin_balance: bal });
          }
        }
      )
      .subscribe();

    // 3. Ultra-fast fallback polling (1 second) to guarantee 100% sync on broadcast overlays
    const pollInterval = setInterval(() => {
      if (isMounted) syncState();
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [teamId]);

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
