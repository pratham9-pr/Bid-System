import React from 'react';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { getTeamFullRoster, MAX_ROSTER_SIZE, MAX_AUCTION_SLOTS } from '../config/franchiseCaptains';

// Flame icon SVG
const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8 0-1.9.7-3.7 1.8-5.1C6.7 9.1 8 11.4 8 14c0 .6.4 1 1 1s1-.4 1-1c0-2.8-1.2-5.4-3.3-7.2C8.1 5.3 9.9 4 12 4c2.5 0 4.7 1.4 5.9 3.4-1.5.4-2.9 1.7-2.9 3.6 0 2.2 1.8 4 4 4 .3 0 .5 0 .8-.1C19.2 17.3 15.9 20 12 20z"/>
  </svg>
);

export function MyBalanceWidget({ team }) {
  const { players } = useAllPlayers();
  if (!team) return null;

  const { captain, auctionedPlayers, totalCount, remainingSlots, isFull } = getTeamFullRoster(
    team.id,
    players
  );

  return (
    <div className="card-elevated p-5 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent pointer-events-none rounded-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gold-500/15 flex items-center justify-center text-gold-400">
              <FlameIcon />
            </div>
            <span className="stat-label">My Fire Coins</span>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-rajdhani font-black uppercase tracking-wider
            ${isFull ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'bg-surface-700 text-slate-300 border border-surface-600'}`}>
            {totalCount}/{MAX_ROSTER_SIZE} Players {isFull ? '(FULL)' : ''}
          </span>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-gold-400 font-rajdhani text-3xl font-bold leading-none">
            ₣
          </span>
          <span className="font-rajdhani font-bold text-4xl leading-none text-white tracking-tight tabular-nums">
            {(team.fire_coin_balance ?? 0).toLocaleString()}
          </span>
        </div>

        {/* ── 4-Player Roster Status Mini Bar ──────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-surface-600/50 space-y-2">
          {/* Captain preview */}
          <div className="flex items-center justify-between text-xs font-rajdhani">
            <div className="flex items-center gap-1.5 text-amber-400 font-black">
              <span>👑</span>
              <span>Captain:</span>
              <span className="text-white font-bold">{captain?.name || captain?.in_game_name}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
              Locked
            </span>
          </div>

          {/* Draft Slots Indicator */}
          <div className="flex items-center gap-1.5 pt-1">
            {/* Slot 1: Captain */}
            <div className="flex-1 py-1 px-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-center" title={`Captain: ${captain?.name}`}>
              <span className="text-[9px] font-rajdhani font-black text-amber-300 uppercase">
                👑 {captain?.name?.split(' ')[0] || 'Captain'}
              </span>
            </div>

            {/* Slots 2, 3, 4: Auction Drafted */}
            {[0, 1, 2].map((idx) => {
              const drafted = auctionedPlayers[idx];
              return (
                <div
                  key={idx}
                  className={`flex-1 py-1 px-1.5 rounded text-center truncate text-[9px] font-rajdhani font-bold
                    ${drafted
                      ? 'bg-gold-500/20 border border-gold-500/40 text-gold-300'
                      : 'bg-surface-800/80 border border-dashed border-surface-600 text-muted'}`}
                  title={drafted ? drafted.in_game_name || drafted.name : `Slot ${idx + 2} Open`}
                >
                  {drafted ? drafted.in_game_name || drafted.name : `Slot ${idx + 2}`}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted font-inter pt-1">
            <span>{team.name || team.team_name}</span>
            <span className="text-amber-400/90 font-semibold">{remainingSlots} Draft Slot{remainingSlots !== 1 ? 's' : ''} Open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyBalanceWidget;
