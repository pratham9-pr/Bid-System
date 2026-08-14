import { useState, useEffect } from 'react';
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
export function useAllPlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('in_game_name', { ascending: true });

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  // ── Derived lists ──────────────────────────────────────────────────────────
  // auctionPlayers: permanent captains (NX4 SILENT, MOKSHII FF) & any appointed captains are strictly excluded from general bidding
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
