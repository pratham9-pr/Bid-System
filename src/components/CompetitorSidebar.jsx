import React, { useState, useEffect, useRef } from 'react';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from '../config/franchiseCaptains';
import { getTeamDisplayName } from '../config/teamsConfig';

// ─── Animated Number Hook ────────────────────────────────────────────────────
// Interpolates from the previous value to the new value using a cubic ease-out
// over 700ms, driven by requestAnimationFrame — no setInterval polling.
function useAnimatedNumber(target, duration = 700) {
  const [displayed, setDisplayed] = useState(target);
  const fromRef    = useRef(target);
  const rafRef     = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to   = target;
    if (from === to) return;

    cancelAnimationFrame(rafRef.current);
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed  = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return displayed;
}

// ─── Team Row ────────────────────────────────────────────────────────────────
function TeamRow({ team, rank, players = [] }) {
  const balance    = team?.fire_coin_balance ?? 0;
  const animated   = useAnimatedNumber(balance);
  const isBankrupt = balance === 0;
  const isWarning  = balance > 0 && balance < 500;

  const { totalCount, isFull, remainingSlots } = getTeamFullRoster(team?.id, players);

  // State transitions tracked for subtle flash on balance drop
  const prevBalanceRef = useRef(balance);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (balance < prevBalanceRef.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevBalanceRef.current = balance;
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  return (
    <div
      className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl
                  transition-all duration-500 group
        ${isBankrupt
          ? 'opacity-35 bg-red-950/20 border border-red-900/20'
          : 'hover:bg-white/[0.03] border border-transparent'
        }`}
    >
      {/* Rank badge */}
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                       text-[10px] font-rajdhani font-black
        ${rank === 1 ? 'bg-gold-500/20 text-gold-400'
        : rank === 2 ? 'bg-slate-400/10 text-slate-400'
        : rank === 3 ? 'bg-orange-900/30 text-orange-600'
        : 'bg-white/5 text-muted'}`}>
        {rank}
      </div>

      {/* Team info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`font-rajdhani font-bold text-sm leading-none truncate transition-colors
            ${isBankrupt ? 'text-red-500/50' : 'text-slate-200'}`}>
            {getTeamDisplayName(team.id, team.name || team.team_name)}
          </p>
          {isFull && (
            <span className="px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[8px] font-rajdhani font-black uppercase">
              Full
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-amber-400 font-rajdhani font-bold">
            {totalCount}/{MAX_ROSTER_SIZE} Roster
          </span>
          <span className="text-white/20 text-[9px]">•</span>
          <span className="text-[10px] text-muted font-inter truncate">
            {remainingSlots} open
          </span>
        </div>
      </div>

      {/* Balance */}
      <div className="flex-shrink-0 text-right">
        <div className={`font-rajdhani font-bold text-base leading-none tabular-nums
                         transition-all duration-300
          ${isBankrupt
            ? 'text-red-500/40'
            : isWarning
              ? 'text-amber-400'
              : flash
                ? 'text-fire-300'
                : 'text-white'
          }`}>
          {isBankrupt ? '₣ 0' : `₣${animated.toLocaleString()}`}
        </div>

        {/* Warning label */}
        {isWarning && !isBankrupt && (
          <p className="text-[9px] text-amber-500/70 font-inter uppercase tracking-widest mt-0.5">
            Low
          </p>
        )}
      </div>

      {/* BANKRUPT overlay tag */}
      {isBankrupt && (
        <div
          className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center
                     justify-center pointer-events-none"
          aria-label="Bankrupt"
        >
          <span
            className="px-2.5 py-0.5 rounded-md text-[9px] font-rajdhani font-black
                       uppercase tracking-[0.25em] text-red-500 border border-red-500/40"
            style={{
              textShadow: '0 0 12px rgba(239,68,68,0.9), 0 0 4px rgba(239,68,68,0.6)',
              boxShadow:  '0 0 10px rgba(239,68,68,0.25), 0 0 20px rgba(239,68,68,0.1)',
            }}
          >
            BANKRUPT
          </span>
        </div>
      )}

      {/* Amber low-balance left border accent */}
      {isWarning && !isBankrupt && (
        <div className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-amber-500/50" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CompetitorSidebar — glassmorphism HUD panel
// ─────────────────────────────────────────────────────────────────────────────
export function CompetitorSidebar({ currentTeamId }) {
  const { teams, loading } = useAllTeams();
  const { players } = useAllPlayers();

  // Rank sorted by descending balance across active franchises
  const activeTeams = teams.filter((t) => t.isPending !== true);
  const ranked = [...activeTeams].sort((a, b) => (b.fire_coin_balance ?? 0) - (a.fire_coin_balance ?? 0));

  const bankruptCount = activeTeams.filter((t) => (t.fire_coin_balance ?? 0) === 0).length;
  const warningCount  = activeTeams.filter((t) => {
    const b = t.fire_coin_balance ?? 0;
    return b > 0 && b < 500;
  }).length;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden border border-white/[0.06]"
      style={{
        background:     'rgba(0, 0, 0, 0.50)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        boxShadow: [
          '0 0 0 1px rgba(255,255,255,0.04) inset',
          '0 25px 50px -12px rgba(0,0,0,0.7)',
        ].join(', '),
      }}
    >
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* HUD indicator dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fire-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fire-500" />
            </span>
            <h3 className="font-rajdhani font-black text-xs uppercase tracking-[0.25em] text-slate-300">
              Competitor Wallet
            </h3>
          </div>

          {/* Status badges */}
          <div className="flex gap-1.5">
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-rajdhani font-bold
                               bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {warningCount} low
              </span>
            )}
            {bankruptCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-rajdhani font-bold
                               bg-red-500/15 text-red-400 border border-red-500/20">
                {bankruptCount} out
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted font-inter mt-1">
          Live balances · {teams.length} teams
        </p>
      </div>

      {/* ── Team list ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto p-2 space-y-0.5 max-h-64">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
          </div>
        ) : ranked.length === 0 ? (
          <div className="py-8 text-center text-muted text-xs font-inter">
            No teams found
          </div>
        ) : (
          ranked.map((team, i) => (
            <div
              key={team.id}
              className={currentTeamId === team.id
                ? 'ring-1 ring-fire-500/25 rounded-xl'
                : ''}
            >
              <TeamRow team={team} rank={i + 1} players={players} />
              {/* "You" indicator for current team */}
              {currentTeamId === team.id && (
                <div className="px-4 pb-1 -mt-0.5">
                  <span className="text-[9px] text-fire-400/60 font-inter uppercase tracking-widest">
                    You
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Footer legend ──────────────────────────────────────────────── */}
      <div className="relative px-4 py-2.5 border-t border-white/[0.04] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-0.5 rounded-full bg-amber-500/70" />
          <span className="text-[9px] text-muted font-inter">{'< 500 warning'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-0.5 rounded-full bg-red-500/70" />
          <span className="text-[9px] text-muted font-inter">0 = bankrupt</span>
        </div>
      </div>
    </div>
  );
}
