import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

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

    const channel = supabase
      .channel('all_players_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => { fetchPlayers(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Derived lists ──────────────────────────────────────────────────────────
  // auctionPlayers: captains are permanently excluded from the bidding pool
  const auctionPlayers = players.filter((p) => !p.is_captain);
  // captains: only explicitly-appointed captain rows
  const captains       = players.filter((p) => p.is_captain === true);

  return { players, auctionPlayers, captains, loading, error, refetch: fetchPlayers };
}
