import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTournament } from '../hooks/useTournament';
import { PLATFORM_CONFIG } from '../config/platformConfig';
import { supabase } from '../config/supabase';

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * TournamentContext
 *
 * Provides { tournament, teams, players, loading } to any descendant component.
 *
 * Default state arrays for teams and players are strictly empty arrays [],
 * populated exclusively by dynamic Supabase queries filtered by active tournament ID.
 */
export const TournamentContext = createContext({
  tournament: { id: null, name: PLATFORM_CONFIG.name, sport_type: null },
  teams: [],
  players: [],
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * TournamentProvider
 *
 * Wrap at the app level (or around specific route subtrees).
 *
 * @param {string|null} id       – Pass a specific tournament ID to lock context
 *                                 to that record (e.g. inside /admin/tournament/:id).
 *                                 Omit (or pass null) for public routes to
 *                                 auto-resolve the most-recently-created tournament.
 * @param {ReactNode}   children
 */
export function TournamentProvider({ id = null, children }) {
  const { tournament, loading: tournamentLoading } = useTournament(id);
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const activeId = id || tournament?.id;
    if (!activeId) {
      setTeams([]);
      setPlayers([]);
      return;
    }

    let isMounted = true;
    const fetchTournamentData = async () => {
      setDataLoading(true);
      try {
        const [teamsRes, playersRes] = await Promise.all([
          supabase.from('teams').select('*').eq('tournament_id', activeId).order('name'),
          supabase.from('players').select('*').eq('tournament_id', activeId).order('in_game_name'),
        ]);

        if (isMounted) {
          setTeams(teamsRes.data ?? []);
          setPlayers(playersRes.data ?? []);
        }
      } catch (err) {
        console.warn('[TournamentContext] data fetch failed:', err);
      } finally {
        if (isMounted) setDataLoading(false);
      }
    };

    fetchTournamentData();

    // Subscribe to realtime updates for this tournament's teams and players
    const channelId = `tournament_ctx_${activeId}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${activeId}` },
        () => { if (isMounted) fetchTournamentData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${activeId}` },
        () => { if (isMounted) fetchTournamentData(); }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id, tournament?.id]);

  const loading = tournamentLoading || dataLoading;

  return (
    <TournamentContext.Provider value={{ tournament, teams, players, loading }}>
      {children}
    </TournamentContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * useTournamentContext
 *
 * Returns { tournament, loading } from the nearest TournamentProvider.
 *
 * Usage:
 *   const { tournament } = useTournamentContext();
 *   <h1>{tournament?.name ?? 'Tournament Platform'}</h1>
 */
export function useTournamentContext() {
  return useContext(TournamentContext);
}

export default TournamentContext;
