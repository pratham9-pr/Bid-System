// ─── TEAM CONFIGURATION — DYNAMIC MULTI-OWNER REGISTRY ─────────────────────────
// Hardcoded dummy teams (Beta Strikers, etc.) have been completely removed.
// All teams are dynamically loaded from the Supabase 'teams' table.

export const TEAMS_CONFIG = [];

// Color themes dynamically assigned to teams for broadcast & UI cards
const PALETTES = [
  {
    color: 'border-fire-500/40 text-fire-400 bg-fire-500/10 hover:border-fire-500/80 hover:bg-fire-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    accentColor: 'rgba(249,115,22,0.15)',
  },
  {
    color: 'border-sky-500/40 text-sky-400 bg-sky-500/10 hover:border-sky-500/80 hover:bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    accentColor: 'rgba(14,165,233,0.15)',
  },
  {
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/80 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    accentColor: 'rgba(16,185,129,0.15)',
  },
  {
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10 hover:border-purple-500/80 hover:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    accentColor: 'rgba(168,85,247,0.15)',
  },
  {
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:border-amber-500/80 hover:bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    accentColor: 'rgba(245,158,11,0.15)',
  },
  {
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10 hover:border-rose-500/80 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    accentColor: 'rgba(244,63,94,0.15)',
  },
];

/** Returns a deterministic color palette based on team ID string */
export function getTeamPalette(teamId) {
  if (!teamId) return PALETTES[0];
  let hash = 0;
  const str = String(teamId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
}

/** Returns display name for a team ID or database name */
export function getTeamDisplayName(teamId, dbName = null) {
  if (dbName && String(dbName).trim() !== '') return String(dbName).trim();
  if (teamId && String(teamId).trim() !== '') return String(teamId).trim();
  return 'UNKNOWN TEAM';
}

/** Returns owner name for a team */
export function getTeamOwner(teamId, dbOwner = null) {
  if (dbOwner && String(dbOwner).trim() !== '') return String(dbOwner).trim();
  return 'PENDING';
}

/** Returns team configuration object with dynamic styling */
export function getTeamConfig(teamId, teamObj = null) {
  if (!teamId && !teamObj) return null;
  const id = teamObj?.id || teamId;
  const palette = getTeamPalette(id);

  return {
    id,
    name: getTeamDisplayName(id, teamObj?.team_name || teamObj?.name),
    owner: getTeamOwner(id, teamObj?.owner_name || teamObj?.owner),
    logo: teamObj?.logo || '/demons_reign_logo.jpg',
    color: teamObj?.color || palette.color,
    accentColor: teamObj?.accentColor || palette.accentColor,
    defaultStats: { wins: 0, losses: 0, diff: 0, pts: 0 },
  };
}

/** Returns the team logo path, checking logo_url first, then customLogo, then fallback */
export function getTeamLogo(teamIdOrObj, customLogo = null) {
  if (customLogo) return customLogo;
  if (teamIdOrObj && typeof teamIdOrObj === 'object') {
    if (teamIdOrObj.logo_url) return teamIdOrObj.logo_url;
    if (teamIdOrObj.logo) return teamIdOrObj.logo;
  }
  return '/demons_reign_logo.jpg';
}
