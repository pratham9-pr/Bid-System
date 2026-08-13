import React from 'react';

// ─── Role metadata ────────────────────────────────────────────────────────────
export const FREE_FIRE_ROLES = ['Rusher', 'Sniper', 'IGL', 'Supporter'];

const ROLE_CONFIG = {
  Rusher:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     glyph: '⚡' },
  Sniper:    { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  glyph: '🎯' },
  IGL:       { bg: 'bg-gold-500/15',    text: 'text-gold-400',    border: 'border-gold-500/30',    glyph: '👑' },
  Supporter: { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     glyph: '🛡️' },
};

const SIZE_CLASSES = {
  xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

/**
 * RoleBadge — displays a colour-coded Free Fire role tag.
 * @param {string} role   — One of FREE_FIRE_ROLES
 * @param {'xs'|'sm'|'md'} size  — Badge size variant (default: 'sm')
 */
export function RoleBadge({ role, size = 'sm' }) {
  if (!role) return null;
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.Supporter;
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
