// ─── TEAM CONFIGURATION — SINGLE SOURCE OF TRUTH ─────────────────────────────
// Team IDs are preserved for database FK integrity.
// Display names, owners, and aliases are updated here and propagate across the entire application.

export const TEAMS_CONFIG = [
  {
    id: 'alpha_wolves',
    aliases: ['alpha_wolves', 'team_alpha', 'alpha', '1', 'alpha wolves', 'power hawks', 'power_hawks'],
    name: 'POWER HAWKS',
    owner: 'NX4 SILENT',
    shortName: 'PWR',
    logo: '/alpha-wolves.png',
    color: 'border-fire-500/40 text-fire-400 bg-fire-500/10 hover:border-fire-500/80 hover:bg-fire-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    accentColor: 'rgba(249,115,22,0.15)',
    isPending: false,
  },
  {
    id: 'beta_strikers',
    aliases: ['beta_strikers', 'team_beta', 'beta', '2', 'beta strikers', 'team vortex', 'team_vortex', 'vortex'],
    name: 'TEAM VORTEX',
    owner: 'MOKSHII FF',
    shortName: 'VTX',
    logo: '/beta-strikers.png',
    color: 'border-sky-500/40 text-sky-400 bg-sky-500/10 hover:border-sky-500/80 hover:bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    accentColor: 'rgba(14,165,233,0.15)',
    isPending: false,
  },
  {
    id: 'gamma_reapers',
    aliases: ['gamma_reapers', 'team_gamma', 'gamma', '3', 'gamma reapers', 'abyssal ebon', 'abyssal_ebon', 'abyssal', 'ebon'],
    name: 'Abyssal Ebon',
    owner: 'invincible',
    shortName: 'ABY',
    logo: '/gamma-reapers.png',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/80 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    accentColor: 'rgba(16,185,129,0.15)',
    isPending: false,
  },
  {
    id: 'delta_phantoms',
    aliases: ['delta_phantoms', 'team_delta', 'delta', '4', 'delta phantoms', 'rx kudla', 'rx_kudla', 'rx', 'kudla'],
    name: 'RX KUDLA',
    owner: 'TBD',
    shortName: 'RXK',
    logo: '/delta-phantoms.png',
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10 hover:border-purple-500/80 hover:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    accentColor: 'rgba(168,85,247,0.15)',
    isPending: false,
  },
];

/** Returns display name for a team ID or legacy name, with fallback */
export function getTeamDisplayName(teamId, dbName = null) {
  if (!teamId && !dbName) return 'Unknown Team';
  const cleanId = String(teamId || '').toLowerCase().trim();
  const cleanName = String(dbName || '').toLowerCase().trim();

  const config = TEAMS_CONFIG.find(
    (t) =>
      t.id === cleanId ||
      t.aliases?.includes(cleanId) ||
      (cleanName && t.aliases?.includes(cleanName))
  );

  return config?.name || dbName || teamId || 'Unknown Team';
}

/** Returns owner name for a team ID with fallback */
export function getTeamOwner(teamId, dbOwner = null) {
  const cleanId = String(teamId || '').toLowerCase().trim();
  const config = TEAMS_CONFIG.find(
    (t) => t.id === cleanId || t.aliases?.includes(cleanId)
  );

  return config?.owner || dbOwner || 'Pending';
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
  return config?.logo || '/logo.png';
}
