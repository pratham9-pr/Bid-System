import React from 'react';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { getTeamFullRoster, MAX_ROSTER_SIZE, MAX_AUCTION_SLOTS } from '../config/franchiseCaptains';
import { computeMaxAllowedBid, DEFAULT_TEAM_PURSE, MIN_BASE_PRICE } from '../services/auctionService';
import { getTeamDisplayName } from '../config/teamsConfig';

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

  const teamBalance  = team.fire_coin_balance ?? 0;
  const maxAllowedBid = computeMaxAllowedBid(teamBalance, remainingSlots);
  const reserved      = MIN_BASE_PRICE * Math.max(0, (remainingSlots || 1) - 1);

  // Budget consumed as % of starting purse
  const budgetPct     = Math.min(100, ((DEFAULT_TEAM_PURSE - teamBalance) / DEFAULT_TEAM_PURSE) * 100);
  const isLow         = !isFull && teamBalance < MIN_BASE_PRICE * remainingSlots;
  const isBankrupt    = teamBalance === 0;

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

        {/* Main balance number */}
        <div className="flex items-end gap-1">
          <span className={`font-rajdhani text-3xl font-bold leading-none ${isBankrupt ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-gold-400'}`}>
            ₣
          </span>
          <span className={`font-rajdhani font-bold text-4xl leading-none tracking-tight tabular-nums
            ${isBankrupt ? 'text-red-400' : isLow ? 'text-amber-300' : 'text-white'}`}>
            {teamBalance.toLocaleString()}
          </span>
        </div>

        {/* Budget consumption bar */}
        <div className="mt-2 h-1 rounded-full bg-surface-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700
              ${budgetPct > 85 ? 'bg-red-500' : budgetPct > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <p className="text-[9px] text-muted font-inter mt-1">
          {Math.round(budgetPct)}% of ₣{DEFAULT_TEAM_PURSE.toLocaleString()} starting purse spent
        </p>

        {/* ── Dynamic Max Bid section ───────────────────────────────────────── */}
        {!isFull && remainingSlots > 0 && (
          <div className={`mt-3 pt-3 border-t flex flex-col gap-1.5
            ${isLow ? 'border-red-500/20' : 'border-surface-600/50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-rajdhani font-black uppercase tracking-widest
                ${isLow ? 'text-red-400' : 'text-slate-400'}`}>
                Max Bid Allowed
              </span>
              <span className={`font-rajdhani font-black text-sm tabular-nums
                ${isLow ? 'text-red-400' : 'text-white'}`}>
                ₣{maxAllowedBid.toLocaleString()}
              </span>
            </div>
            <p className="text-[9px] text-muted font-inter leading-relaxed">
              ₣{teamBalance.toLocaleString()} purse
              {reserved > 0 && <> − <span className="text-amber-500/80">₣{reserved.toLocaleString()} reserved</span> for {remainingSlots - 1} more slot{remainingSlots - 1 !== 1 ? 's' : ''}</>}
            </p>
            {isLow && (
              <p className="text-[9px] text-red-400 font-inter font-semibold">
                ⚠️ Low balance — may not cover minimum bids for remaining slots
              </p>
            )}
          </div>
        )}

        {/* ── 4-Player Roster Status Mini Bar ──────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-surface-600/50 space-y-2">
          {/* Captain / Squad preview */}
          <div className="flex items-center justify-between text-xs font-rajdhani">
            {captain ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-black">
                <span>👑</span>
                <span>Captain:</span>
                <span className="text-white font-bold">{captain.name || captain.in_game_name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                <span>🛡️</span>
                <span>Squad Slots:</span>
                <span className="text-white font-bold">{totalCount}/4 Drafted</span>
              </div>
            )}
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase
              ${captain ? 'bg-amber-500/20 text-amber-300' : isFull ? 'bg-gold-500/20 text-gold-400' : 'bg-surface-700 text-muted'}`}>
              {captain ? 'Locked' : isFull ? 'Complete' : 'Drafting'}
            </span>
          </div>

          {/* 4 Slot Mini Indicators */}
          <div className="flex items-center gap-1.5 pt-1">
            {slots.map((p, idx) => {
              const isCap = idx === 0 && Boolean(captain);
              return (
                <div
                  key={idx}
                  className={`flex-1 py-1 px-1.5 rounded text-center truncate text-[9px] font-rajdhani font-bold
                    ${isCap
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : p
                      ? 'bg-gold-500/20 border border-gold-500/40 text-gold-300'
                      : 'bg-surface-800/80 border border-dashed border-surface-600 text-muted'}`}
                  title={isCap ? `Captain: ${p?.name || 'Captain'}` : p ? p.in_game_name || p.name : `Slot #${idx + 1} Open`}
                >
                  {isCap ? `👑 ${p?.name?.split(' ')[0] || 'Cap'}` : p ? p.in_game_name || p.name : `#${idx + 1}`}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted font-inter pt-1">
            <span>{getTeamDisplayName(team.id, team.name || team.team_name)}</span>
            <span className="text-amber-400/90 font-semibold">{remainingSlots} Open Slot{remainingSlots !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyBalanceWidget;
