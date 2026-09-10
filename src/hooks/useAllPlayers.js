import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { isPermanentCaptainName } from '../config/franchiseCaptains';

/**
 * useAllPlayers (Supabase Realtime)
 * Fetches all players and subscribes to any INSERT/UPDATE/DELETE.
 *
 * Returns:
 *   players       — full unfiltered list (for roster/captain UI)
 *   auctionPlayers — excludes captains (is_captain=true) — safe for bidding pools
 *   captains       — only appointed captains
 */
export function useAllPlayers(tournamentIdParam = null) {
  const { id: routeId } = useParams();
  const activeId = tournamentIdParam || routeId;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchPlayers = useCallback(async () => {
    try {
      let query = supabase
        .from('players')
        .select('*')
        .order('in_game_name', { ascending: true });

      if (activeId) {
        query = query.eq('tournament_id', activeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Deduplicate by distinct player ID
      const deduplicated = [];
      const seenIds = new Set();
      for (const p of data || []) {
        if (p && p.id && !seenIds.has(String(p.id))) {
          seenIds.add(String(p.id));
          deduplicated.push(p);
        }
      }

      setPlayers(deduplicated);
    } catch (err) {
      console.warn('useAllPlayers fetch warning:', err);
      const isFetchError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      setError(
        isFetchError
          ? 'Unable to connect to player database. Operating with offline data.'
          : (err.message || 'Error loading players.')
      );
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchPlayers();

    // Shared real-time channel with unique listener instance
    const channelId = `all_players_sub_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          // If activeId is specified and the payload row doesn't match activeId, skip optimistic update
          if (activeId && payload.new?.tournament_id && payload.new.tournament_id !== activeId) {
            return;
          }
          // 1. Instantly apply realtime payload into React state without waiting for network re-fetch
          if (payload.eventType === 'UPDATE' && payload.new) {
            setPlayers((prev) => {
              const updatedId = String(payload.new.id);
              const exists = prev.some((p) => String(p.id) === updatedId);
              if (exists) {
                return prev.map((p) =>
                  String(p.id) === updatedId ? { ...p, ...payload.new } : p
                );
              }
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setPlayers((prev) => {
              const newId = String(payload.new.id);
              if (prev.some((p) => String(p.id) === newId)) {
                return prev.map((p) =>
                  String(p.id) === newId ? { ...p, ...payload.new } : p
                );
              }
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setPlayers((prev) =>
              prev.filter((p) => String(p.id) !== String(payload.old.id))
            );
          }

          // 2. Fetch full sync in background
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlayers, activeId]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  // auctionPlayers: captains and appointed franchise leaders are excluded from general bidding
  const auctionPlayers = players.filter(
    (p) =>
      !p.is_captain &&
      !isPermanentCaptainName(p.in_game_name || p.name)
  );

  // captains: explicitly-appointed captain rows
  const captains = players.filter(
    (p) => p.is_captain === true || isPermanentCaptainName(p.in_game_name || p.name)
  );

  return { players, auctionPlayers, captains, loading, error, refetch: fetchPlayers };
}
