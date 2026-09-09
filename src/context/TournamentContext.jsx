import React, { createContext, useContext } from 'react';
import { useTournament } from '../hooks/useTournament';
import { PLATFORM_CONFIG } from '../config/platformConfig';

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * TournamentContext
 *
 * Provides { tournament, loading } to any descendant component.
 *
 * `tournament` shape:
 *   {
 *     id:             string | null,
 *     name:           string,          // e.g. "Neon Blitz Open" — always populated
 *     sport_type:     string | null,
 *     starting_purse: number | null,
 *     max_players:    number | null,
 *   }
 *
 * When no live tournament row is found, `tournament.name` falls back to
 * PLATFORM_CONFIG.name ("Tournament Platform") so no surface is ever blank.
 */
export const TournamentContext = createContext({
  tournament: { id: null, name: PLATFORM_CONFIG.name, sport_type: null },
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
  const { tournament, loading } = useTournament(id);

  return (
    <TournamentContext.Provider value={{ tournament, loading }}>
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
