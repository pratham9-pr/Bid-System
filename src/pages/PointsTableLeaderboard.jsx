import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo, getTeamConfig } from '../config/teamsConfig';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from '../config/franchiseCaptains';

/**
 * BalancePulse component for animated coin balances
 */
function BalancePulse({ balance, isRank1 }) {
  const prevRef = useRef(balance);
  const [isDecreasing, setIsDecreasing] = useState(false);

  useEffect(() => {
    if (prevRef.current !== undefined && balance < prevRef.current) {
      setIsDecreasing(true);
      const timer = setTimeout(() => setIsDecreasing(false), 700);
      prevRef.current = balance;
      return () => clearTimeout(timer);
    }
    prevRef.current = balance;
  }, [balance]);

  return (
    <motion.span
      animate={
        isDecreasing
          ? {
              scale: [1, 1.1, 1],
              color: ['#fbbf24', '#ef4444', '#fbbf24'],
              textShadow: [
                '0 0 0px rgba(239,68,68,0)',
                '0 0 14px rgba(239,68,68,0.9)',
                '0 0 0px rgba(239,68,68,0)',
              ],
            }
          : { scale: 1 }
      }
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={`inline-flex items-center gap-1 tabular-nums font-black italic text-lg sm:text-2xl tracking-tight ${
        isRank1 ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-amber-400'
      }`}
    >
      <span className="text-sm font-black">₣</span>
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </motion.span>
  );
}

// ─── DEMONS REIGN ESPORTS POINTS TABLE & LEADERBOARD COMPONENT ────────────────
export default function PointsTableLeaderboard({ transparentBg: propTransparentBg } = {}) {
  const { teams } = useAllTeams();
  const { players } = useAllPlayers();
  const [internalTransparentBg, setInternalTransparentBg] = useState(false);
  const transparentBg = propTransparentBg !== undefined ? propTransparentBg : internalTransparentBg;
  const setTransparentBg = setInternalTransparentBg;

  // Merge live database teams with configuration, roster count, and stats
  const activeTeamsList = (teams && teams.length > 0 ? teams : TEAMS_CONFIG).map((t, idx) => {
    const config = getTeamConfig(t.id) || TEAMS_CONFIG.find((c) => c.id === t.id) || TEAMS_CONFIG[idx] || {};
    // Strictly unique team id
    const uniqueTeamId = String(t.id || config.id || `team_${idx + 1}`);
    const displayName = getTeamDisplayName(uniqueTeamId, t.team_name || t.name || config.name);
    const ownerName = getTeamOwner(uniqueTeamId, t.owner_name || t.owner || config.owner);
    const logoUrl = t.logo_url || t.logo || getTeamLogo(t) || config.logo || '/demons_reign_logo.jpg';
    const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: '0', pts: 0 };

    const wins = typeof t.wins === 'number' ? t.wins : defaultStats.wins;
    const losses = typeof t.losses === 'number' ? t.losses : defaultStats.losses;
    const rawDiff = t.score_diff ?? t.diff ?? defaultStats.diff;
    const diffNum = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (Number(rawDiff) || 0);
    const pts = typeof t.points === 'number' ? t.points : (typeof t.pts === 'number' ? t.pts : defaultStats.pts);
    const balance = typeof t.fire_coin_balance === 'number' ? t.fire_coin_balance : (typeof t.purse === 'number' ? t.purse : 40000);

    const { totalCount = 0, remainingSlots = MAX_ROSTER_SIZE, isFull = false } = getTeamFullRoster(uniqueTeamId, players);

    return {
      ...t,
      id: uniqueTeamId,
      teamId: uniqueTeamId,
      displayName,
      ownerName,
      logoUrl,
      playerCount: totalCount,
      remainingSlots,
      isFull,
      wins,
      losses,
      diff: diffNum,
      formattedDiff: diffNum > 0 ? `+${diffNum}` : `${diffNum}`,
      pts,
      balance,
    };
  });

  // ── Auto-Sorting Engine ────────────────────────────────────────────────────
  // Strictly typed sorting:
  // 1. Primary: Sort descending by Points (PTS)
  // 2. Secondary fallback: Sort descending by Score Differential (+/- DIFF)
  // 3. Tertiary fallback: Sort descending by Wins (W)
  // 4. Quaternary fallback: Sort descending by Fire Coin Balance
  const sortedTeams = [...activeTeamsList].sort((a, b) => {
    const ptsA = Number(a.pts) || 0;
    const ptsB = Number(b.pts) || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;

    const diffA = Number(a.diff) || 0;
    const diffB = Number(b.diff) || 0;
    if (diffB !== diffA) return diffB - diffA;

    const winsA = Number(a.wins) || 0;
    const winsB = Number(b.wins) || 0;
    if (winsB !== winsA) return winsB - winsA;

    const balA = Number(a.balance) || 0;
    const balB = Number(b.balance) || 0;
    return balB - balA;
  });

  return (
    <div
      className={`w-screen h-screen min-h-[720px] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none font-rajdhani transition-colors duration-300
        ${transparentBg ? 'bg-transparent' : 'bg-black/60 backdrop-blur-xl'}`}
    >
      {/* ── Background Tactical Grid Pattern (Esports Tech Overlay) ────────── */}
      {!transparentBg && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
          }}
        />
      )}

      {/* ── Ambient High-Contrast Stage Glow Blobs ──────────────────────── */}
      {!transparentBg && (
        <>
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[40rem] h-64 bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />
        </>
      )}

      {/* ===================================================================== */}
      {/* 1. TOURNAMENT HEADER                                                  */}
      {/* ===================================================================== */}
      <header className="w-full relative z-20 flex-shrink-0 mb-4">
        <div
          className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative"
        >
          {/* Top Edge Red/Orange Neon Accent */}
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

          {/* Left: Tournament Branding */}
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            >
              <div className="w-full h-full bg-black/90 rounded-[10px] flex items-center justify-center p-1">
                <img
                  src="/demons_reign_logo.jpg"
                  alt="Demons Reign"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-rajdhani font-black italic text-2xl sm:text-3xl text-white tracking-[0.12em] uppercase leading-none">
                  DEMONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400">REIGN</span>
                </h1>
                <span
                  className="bg-red-600/25 border border-red-500/40 text-red-400 font-black italic text-[11px] px-3 py-0.5 rounded-md uppercase tracking-wider"
                >
                  LIVE BROADCAST
                </span>
              </div>
              <p className="font-rajdhani font-bold text-xs tracking-[0.3em] text-slate-400 uppercase mt-1">
                FREE FIRE AUCTION • OFFICIAL STANDINGS OVERLAY
              </p>
            </div>
          </div>

          {/* Right: Broadcast Status & OBS Switch */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-black/40 border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-black italic text-xs uppercase tracking-widest text-white">
                LIVE BROADCAST FEED
              </span>
            </div>

            <button
              onClick={() => setTransparentBg((prev) => !prev)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              title="Toggle background transparency for OBS Studio"
            >
              {transparentBg ? 'OBS: Transparent' : 'OBS: Frosted'}
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. LEADERBOARD TABLE CONTAINER                                       */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full min-h-0 flex flex-col justify-center relative z-20 py-2">
        <div className="w-full flex flex-col gap-3">

          {/* ── Table Header Strip ────────────────────────────────────────── */}
          <div
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-2.5 flex items-center justify-between text-slate-400 font-black italic tracking-[0.2em] text-xs sm:text-sm uppercase"
          >
            <div className="w-20 sm:w-24 text-center flex-shrink-0">
              <span>RANK</span>
            </div>
            <div className="flex-1 pl-4 text-left">
              <span>FRANCHISE TEAM</span>
            </div>
            <div className="w-24 sm:w-28 text-center flex-shrink-0">
              <span>ROSTER</span>
            </div>
            <div className="w-32 sm:w-36 text-right pr-4 flex-shrink-0">
              <span>PURSE (₣ FC)</span>
            </div>
            <div className="w-16 sm:w-20 text-center flex-shrink-0">
              <span>W</span>
            </div>
            <div className="w-16 sm:w-20 text-center flex-shrink-0">
              <span>L</span>
            </div>
            <div className="w-20 sm:w-24 text-center flex-shrink-0">
              <span>DIFF (+/-)</span>
            </div>
            <div className="w-28 sm:w-36 text-center flex-shrink-0 text-amber-400">
              <span>TOTAL PTS</span>
            </div>
          </div>

          {/* ── Team Standings Rows: <motion.ul> with layout spring transitions and cascade ── */}
          <motion.ul className="flex flex-col gap-3 list-none m-0 p-0">
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
              const isRank1 = rank === 1;

              return (
                <motion.li
                  key={team.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.35, delay: index * 0.08 },
                    y: { type: 'spring', stiffness: 300, damping: 30, delay: index * 0.08 },
                  }}
                  className={`w-full py-3.5 px-6 rounded-2xl flex items-center justify-between transition-colors duration-300 relative overflow-hidden
                    ${
                      isRank1
                        ? 'bg-gradient-to-r from-red-900/40 to-transparent border border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.25),0_0_25px_rgba(239,68,68,0.15)] ring-1 ring-inset ring-red-500/30'
                        : 'bg-gradient-to-r from-gray-900 to-transparent border border-white/10 hover:border-white/20'
                    }`}
                >
                  {/* Left rank accent stripe on #1 */}
                  {isRank1 && (
                    <div className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-b from-red-500 via-orange-500 to-amber-500" />
                  )}

                  {/* ── 1. RANK BADGE ────────────────────────────────────────── */}
                  <div className="w-20 sm:w-24 flex items-center justify-center flex-shrink-0">
                    <div
                      className={`px-4 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-black italic text-lg sm:text-xl tabular-nums shadow-md
                        ${
                          isRank1
                            ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-2 ring-amber-400/50'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : rank === 3
                            ? 'bg-amber-800 text-amber-200'
                            : 'bg-surface-800 text-slate-300 border border-white/10'
                        }`}
                    >
                      {isRank1 && <span className="text-sm">👑</span>}
                      <span className="tabular-nums">#{rank}</span>
                    </div>
                  </div>

                  {/* ── 2. TEAM LOGO & IDENTITY ──────────────────────────────── */}
                  <div className="flex-1 pl-4 flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 p-0.5 rounded-xl flex-shrink-0 flex items-center justify-center bg-black/80 border
                        ${isRank1 ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-white/20'}`}
                    >
                      <img
                        src={team.logoUrl}
                        alt={team.displayName}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2
                          className={`font-black italic text-xl sm:text-2xl lg:text-3xl uppercase tracking-[0.1em] truncate leading-none
                            ${isRank1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-amber-300 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-white'}`}
                        >
                          {team.displayName}
                        </h2>
                        {isRank1 && (
                          <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/40 rounded">
                            #1 LEADER
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs tracking-widest text-slate-400 uppercase mt-1">
                        OWNER: <span className="text-amber-300 font-black">{team.ownerName}</span>
                      </p>
                    </div>
                  </div>

                  {/* ── 3. ROSTER / PLAYERS COUNT ────────────────────────────── */}
                  <div className="w-24 sm:w-28 text-center flex-shrink-0">
                    <span className="font-black italic text-lg sm:text-xl text-slate-200 tabular-nums">
                      {team.playerCount}/{MAX_ROSTER_SIZE}
                    </span>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      ROSTER
                    </span>
                  </div>

                  {/* ── 4. FREE FIRE COIN BALANCE ────────────────────────────── */}
                  <div className="w-32 sm:w-36 text-right pr-4 flex-shrink-0">
                    <BalancePulse balance={team.balance} isRank1={isRank1} />
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      PURSE
                    </span>
                  </div>

                  {/* ── 5. WINS (W) ──────────────────────────────────────────── */}
                  <div className="w-16 sm:w-20 text-center flex-shrink-0">
                    <span className="font-black italic text-xl sm:text-2xl text-emerald-400 tabular-nums">
                      {team.wins}
                    </span>
                  </div>

                  {/* ── 6. LOSSES (L) ────────────────────────────────────────── */}
                  <div className="w-16 sm:w-20 text-center flex-shrink-0">
                    <span className="font-black italic text-xl sm:text-2xl text-rose-400 tabular-nums">
                      {team.losses}
                    </span>
                  </div>

                  {/* ── 7. SCORE DIFF (+/-) ──────────────────────────────────── */}
                  <div className="w-20 sm:w-24 text-center flex-shrink-0">
                    <span
                      className={`font-black italic text-lg sm:text-xl tabular-nums
                        ${team.diff > 0 ? 'text-emerald-300' : team.diff < 0 ? 'text-rose-300' : 'text-slate-300'}`}
                    >
                      {team.formattedDiff}
                    </span>
                  </div>

                  {/* ── 8. TOTAL PTS (Massive Vibrant Numeral) ────────────────── */}
                  <div className="w-28 sm:w-36 flex items-center justify-center flex-shrink-0">
                    <div
                      className={`w-full py-1.5 px-4 rounded-xl flex items-center justify-center border
                        ${
                          isRank1
                            ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'bg-black/40 border-white/10'
                        }`}
                    >
                      <span
                        className={`font-black italic text-2xl sm:text-3xl tracking-tight tabular-nums
                          ${
                            isRank1
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-amber-300 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                              : 'text-white'
                          }`}
                      >
                        {team.pts}
                      </span>
                    </div>
                  </div>

                </motion.li>
              );
            })}
          </motion.ul>

        </div>
      </main>

      {/* ===================================================================== */}
      {/* 3. DEMONS REIGN ESPORTS TELEMETRY FOOTER                              */}
      {/* ===================================================================== */}
      <footer className="w-full relative z-20 flex-shrink-0 mt-2">
        <div className="w-full py-2.5 px-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <span className="text-red-400 font-black">DEMONS REIGN 2026</span>
            <span>•</span>
            <span>OFFICIAL AUCTION SERIES</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">RESOLUTION: 1920×1080 (OBS READY)</span>
            <span>•</span>
            <span className="text-emerald-400 font-black">● REAL-TIME SYNC ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
