// ─── TEAM CONFIGURATION — DYNAMIC MULTI-TENANT ENGINE ─────────────────────────
import { PLATFORM_CONFIG } from './platformConfig';

// Hardcoded team objects removed to support dynamic multi-tenant tournaments
export const TEAMS_CONFIG = [];

// Palette for dynamic franchise card borders, accents, and glows
export const DYNAMIC_TEAM_THEMES = [
  {
    badge: 'bg-fire-500',
    card: 'border-fire-500/40 bg-gradient-to-b from-fire-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-fire-400',
    color: 'border-fire-500/40 text-fire-400 bg-fire-500/10 hover:border-fire-500/80 hover:bg-fire-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]',
  },
  {
    badge: 'bg-sky-500',
    card: 'border-sky-500/40 bg-gradient-to-b from-sky-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-sky-400',
    color: 'border-sky-500/40 text-sky-400 bg-sky-500/10 hover:border-sky-500/80 hover:bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
  },
  {
    badge: 'bg-emerald-500',
    card: 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-emerald-400',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/80 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  },
  {
    badge: 'bg-purple-500',
    card: 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-purple-400',
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10 hover:border-purple-500/80 hover:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  },
  {
    badge: 'bg-amber-500',
    card: 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-amber-400',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:border-amber-500/80 hover:bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  },
  {
    badge: 'bg-rose-500',
    card: 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-surface-900/60 to-surface-950/80',
    accentText: 'text-rose-400',
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10 hover:border-rose-500/80 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
  },
];

export function getTeamTheme(indexOrId) {
  if (typeof indexOrId === 'number') {
    return DYNAMIC_TEAM_THEMES[indexOrId % DYNAMIC_TEAM_THEMES.length];
  }
  const str = String(indexOrId || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % DYNAMIC_TEAM_THEMES.length;
  return DYNAMIC_TEAM_THEMES[idx];
}

/** Returns display name for a team ID or database name */
export function getTeamDisplayName(teamId, dbName = null) {
  if (dbName && dbName.trim()) return dbName.trim();
  if (!teamId) return 'UNKNOWN TEAM';
  return String(teamId).trim();
}

/** Returns owner name for a team ID with fallback */
export function getTeamOwner(teamId, dbOwner = null) {
  if (dbOwner && dbOwner.trim() && dbOwner.toLowerCase() !== 'tbd' && dbOwner.toLowerCase() !== 'pending') {
    return dbOwner.trim();
  }
  return 'PENDING';
}

/** Returns team config object for a given ID or alias */
export function getTeamConfig(teamId) {
  if (!teamId) return null;
  const clean = String(teamId).toLowerCase().trim();
  return TEAMS_CONFIG.find((t) => t.id === clean || t.aliases?.includes(clean)) || null;
}

/** Returns the team logo path */
export function getTeamLogo(teamId) {
  const config = getTeamConfig(teamId);
  return config?.logo || PLATFORM_CONFIG.logoFallback;
}
