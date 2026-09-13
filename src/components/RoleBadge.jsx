import React from 'react';

// ─── Role metadata ────────────────────────────────────────────────────────────
//
// TOURNAMENT_ROLES is intentionally an EMPTY array — roles are read dynamically
// from the database (player.role field set during CSV upload or manual entry).
// No sport-specific roles are hardcoded here; the badge renders any raw string.
//
export const TOURNAMENT_ROLES = [];

// Optional aesthetic presets for known role strings.
// Any role NOT listed here receives the generic neutral preset automatically.
const ROLE_PRESETS = {
  // ── Generic / Cross-sport ──────────────────────────────────────────────────
  Captain:   { bg: 'bg-gold-500/15',    text: 'text-gold-400',    border: 'border-gold-500/30',    glyph: '👑' },
  // ── Cricket ───────────────────────────────────────────────────────────────
  Batsman:   { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     glyph: '🏏' },
  Bowler:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', glyph: '⚡' },
  'All-Rounder': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', glyph: '⭐' },
  WK:        { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   glyph: '🧤' },
  // ── Football ──────────────────────────────────────────────────────────────
  Forward:   { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     glyph: '⚽' },
  Midfielder:{ bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     glyph: '🔄' },
  Defender:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', glyph: '🛡️' },
  Goalkeeper:{ bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  glyph: '🥅' },
  // ── Kabaddi ───────────────────────────────────────────────────────────────
  Raider:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     glyph: '⚡' },
  // ── BGMI / Esports (kept as optional presets, no longer the default) ──────
  IGL:       { bg: 'bg-gold-500/15',    text: 'text-gold-400',    border: 'border-gold-500/30',    glyph: '👑' },
  Rusher:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     glyph: '⚡' },
  Sniper:    { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  glyph: '🎯' },
  Supporter: { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     glyph: '🛡️' },
};

// Neutral preset used for any role string not listed above
const GENERIC_PRESET = {
  bg: 'bg-slate-500/15',
  text: 'text-slate-400',
  border: 'border-slate-500/30',
  glyph: '●',
};

const SIZE_CLASSES = {
  xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

/**
 * RoleBadge — displays a colour-coded role tag for any sport.
 *
 * @param {string} role   — Raw role string from the database (e.g. 'Batsman', 'Raider', 'IGL').
 *                          Rendered as-is; no coercion or fallback to esports roles.
 * @param {'xs'|'sm'|'md'} size  — Badge size variant (default: 'sm')
 */
export function RoleBadge({ role, size = 'sm' }) {
  if (!role) return null;
  // Look up preset; fall back to generic neutral style — never force a sport-specific role.
  const cfg = ROLE_PRESETS[role] ?? GENERIC_PRESET;
  const sz  = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm;

  return (
    <span
      className={`inline-flex items-center rounded-md font-inter font-semibold
                  uppercase tracking-widest border select-none
                  ${cfg.bg} ${cfg.text} ${cfg.border} ${sz}`}
    >
      <span className="leading-none">{cfg.glyph}</span>
      <span>{role}</span>
    </span>
  );
}
