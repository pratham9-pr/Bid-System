// ─── PLATFORM CONFIGURATION — SINGLE SOURCE OF TRUTH ──────────────────────────
// Update the values below to rebrand the entire platform without touching
// individual components. A future useTournament() hook can replace this constant
// with live data from the database when the multi-tenant data model is ready.

export const PLATFORM_CONFIG = {
  /** The tournament / platform display name shown across all UI surfaces */
  name: 'Tournament Platform',

  /** Short tagline shown beneath the logo in headers */
  tagline: 'AUCTION SERIES 2026',

  /** Uppercase footer tag used in broadcast overlays and footer tickers */
  footerTag: 'TOURNAMENT PLATFORM',

  /**
   * Generic fallback logo path for broken team-logo <img> onError handlers.
   * Replaces the old '/demons_reign_logo.jpg' fallback everywhere.
   */
  logoFallback: '/logo.png',

  /** Current season / year label */
  year: '2026',
};
