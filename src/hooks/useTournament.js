import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { PLATFORM_CONFIG } from '../config/platformConfig';

/**
 * useTournament
 *
 * Fetches a tournament record from the `tournaments` table.
 *
 * - If `tournamentId` is provided, fetches that specific record (used by
 *   TournamentAdminDashboard at /admin/tournament/:id).
 * - If `tournamentId` is null / undefined, fetches the most-recently-created
 *   tournament (used by all public-facing routes: broadcast, leaderboard,
 *   login, auction room, admin panel).
 *
 * Subscribes to Supabase Realtime so any rename propagates instantly.
 *
 * Returns:
 *   { tournament, loading }
 *   where `tournament` has shape: { id, name, sport_type, starting_purse, max_players, ... }
 *   Falls back to a synthetic object using PLATFORM_CONFIG when no row exists.
 */
export function useTournament(tournamentId = null) {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchTournament = async () => {
      try {
        let query = supabase.from('tournaments').select('*');

        if (tournamentId) {
          query = query.eq('id', tournamentId).single();
        } else {
          // Fetch the most-recently-created tournament as the active one
          query = query.order('created_at', { ascending: false }).limit(1).maybeSingle();
        }

        const { data, error } = await query;

        if (isMounted) {
          if (data && !error) {
            setTournament(data);
          } else {
            // No tournament row yet — use PLATFORM_CONFIG as the safe fallback
            setTournament({
              id: null,
              name: PLATFORM_CONFIG.name,
              sport_type: null,
              starting_purse: null,
              max_players: null,
            });
          }
        }
      } catch (err) {
        console.warn('[useTournament] fetch failed, using fallback:', err?.message);
        if (isMounted) {
          setTournament({
            id: null,
            name: PLATFORM_CONFIG.name,
            sport_type: null,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTournament();

    // Realtime subscription — re-fetch if any tournament row changes
    const channelId = `tournament_sub_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          if (isMounted) fetchTournament();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { tournament, loading };
}

export default useTournament;
