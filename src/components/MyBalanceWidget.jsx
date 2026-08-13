import React from 'react';

// Flame icon SVG
const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8 0-1.9.7-3.7 1.8-5.1C6.7 9.1 8 11.4 8 14c0 .6.4 1 1 1s1-.4 1-1c0-2.8-1.2-5.4-3.3-7.2C8.1 5.3 9.9 4 12 4c2.5 0 4.7 1.4 5.9 3.4-1.5.4-2.9 1.7-2.9 3.6 0 2.2 1.8 4 4 4 .3 0 .5 0 .8-.1C19.2 17.3 15.9 20 12 20z"/>
  </svg>
);

export function MyBalanceWidget({ team }) {
  if (!team) return null;

  return (
    <div className="card-elevated p-5 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent pointer-events-none rounded-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gold-500/15 flex items-center justify-center text-gold-400">
            <FlameIcon />
          </div>
          <span className="stat-label">My Fire Coins</span>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-gold-400 font-rajdhani text-3xl font-bold leading-none">
            ₣
          </span>
          <span className="font-rajdhani font-bold text-4xl leading-none text-white tracking-tight">
            {team.fire_coin_balance.toLocaleString()}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-surface-600/50 flex items-center justify-between">
          <span className="text-xs text-muted font-inter">{team.team_name}</span>
          <span className="text-xs text-muted font-inter">{team.owner_name}</span>
        </div>
      </div>
    </div>
  );
}
