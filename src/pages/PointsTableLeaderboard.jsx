import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAllTeams } from '../hooks/useAllTeams';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo } from '../config/teamsConfig';

// ─── DEMONS REIGN ESPORTS POINTS TABLE & LEADERBOARD COMPONENT ────────────────
export default function PointsTableLeaderboard() {
  const { teams } = useAllTeams();
  const [transparentBg, setTransparentBg] = useState(false);

  // Merge live database teams with configuration and stats
  const activeTeamsList = (teams && teams.length > 0 ? teams : TEAMS_CONFIG).map((t, idx) => {
    const config = TEAMS_CONFIG.find((c) => c.id === t.id) || TEAMS_CONFIG[idx] || {};
    const teamId = t.id || config.id;
    const displayName = getTeamDisplayName(teamId, t.team_name || t.name || config.name);
    const ownerName = getTeamOwner(teamId, t.owner_name || t.owner || config.owner);
    const logoUrl = getTeamLogo(teamId);
    const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: '0', pts: 0 };

    const wins = typeof t.wins === 'number' ? t.wins : defaultStats.wins;
    const losses = typeof t.losses === 'number' ? t.losses : defaultStats.losses;
    const rawDiff = t.score_diff ?? t.diff ?? defaultStats.diff;
    const diffNum = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (rawDiff || 0);
    const pts = typeof t.points === 'number' ? t.points : (typeof t.pts === 'number' ? t.pts : defaultStats.pts);
    const balance = t.fire_coin_balance ?? 40000;

    return {
      ...t,
      teamId,
      displayName,
      ownerName,
      logoUrl,
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
        ${transparentBg ? 'bg-transparent' : 'bg-[#0a0a0c]'}`}
    >
      {/* ── Background Tactical Grid Pattern (Esports Tech Overlay) ────────── */}
      {!transparentBg && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
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
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-sky-500/10 rounded-full blur-[160px] pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[40rem] h-64 bg-fire-600/10 rounded-full blur-[150px] pointer-events-none" />
        </>
      )}

      {/* ===================================================================== */}
      {/* 1. TOURNAMENT HEADER (Aggressive Chamfered Esports Geometry)          */}
      {/* ===================================================================== */}
      <header className="w-full relative z-20 flex-shrink-0 mb-4">
        <div
          style={{
            clipPath: 'polygon(0% 0%, calc(100% - 24px) 0%, 100% 24px, 100% 100%, 24px 100%, 0% calc(100% - 24px))',
          }}
          className="w-full bg-[#11131a]/95 border-2 border-white/15 px-6 py-3.5 flex items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl relative"
        >
          {/* Top Edge Neon Accent */}
          <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />

          {/* Left: Tournament Branding */}
          <div className="flex items-center gap-4">
            <div
              style={{
                clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
              }}
              className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            >
              <div className="w-full h-full bg-black flex items-center justify-center p-1">
                <img
                  src="/demons_reign_logo.jpg"
                  alt="Demons Reign"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-rajdhani font-black italic text-2xl sm:text-3xl text-white tracking-[0.12em] uppercase leading-none">
                  DEMONS <span className="text-gradient-gold">REIGN</span>
                </h1>
                <span
                  style={{
                    clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
                  }}
                  className="bg-amber-500 text-black font-black italic text-[11px] px-3 py-0.5 uppercase tracking-wider"
                >
                  OFFICIAL STAGE
                </span>
              </div>
              <p className="font-rajdhani font-bold text-xs tracking-[0.3em] text-slate-400 uppercase mt-1">
                OFFICIAL OVERALL STANDINGS • POINTS TABLE
              </p>
            </div>
          </div>

          {/* Right: Broadcast Status & OBS Switch */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-none bg-black/60 border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-fire-500 animate-ping" />
              <span className="font-black italic text-xs uppercase tracking-widest text-white">
                LIVE BROADCAST FEED
              </span>
            </div>

            <button
              onClick={() => setTransparentBg((prev) => !prev)}
              className="px-3 py-1.5 bg-surface-800 border border-white/20 text-slate-300 hover:text-white hover:border-amber-400 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              title="Toggle background transparency for OBS Studio"
            >
              {transparentBg ? 'OBS: Transparent' : 'OBS: Solid'}
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
            style={{
              clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 16px, 100% 100%, 16px 100%, 0% calc(100% - 16px))',
            }}
            className="w-full bg-[#141620] border-t border-b border-white/15 px-6 py-2 flex items-center justify-between text-slate-400 font-black italic tracking-[0.2em] text-xs sm:text-sm uppercase"
          >
            <div className="w-24 sm:w-28 text-center flex-shrink-0">
              <span>RANK</span>
            </div>
            <div className="flex-1 pl-4 text-left">
              <span>FRANCHISE TEAM</span>
            </div>
            <div className="w-20 sm:w-24 text-center flex-shrink-0">
              <span>W</span>
            </div>
            <div className="w-20 sm:w-24 text-center flex-shrink-0">
              <span>L</span>
            </div>
            <div className="w-24 sm:w-28 text-center flex-shrink-0">
              <span>DIFF (+/-)</span>
            </div>
            <div className="w-32 sm:w-40 text-center flex-shrink-0 text-amber-400">
              <span>TOTAL PTS</span>
            </div>
          </div>

          {/* ── Team Standings Rows (Aggressive Chamfered Thick Cards) ─────── */}
          <div className="flex flex-col gap-3">
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
              const isRank1 = rank === 1;
              const isRank2 = rank === 2;
              const isRank3 = rank === 3;

              // Row Tier Styling Configuration
              const rowClasses = isRank1
                ? {
                    card: 'bg-gradient-to-r from-amber-500/25 via-yellow-600/15 to-[#0e0d08] border-2 border-yellow-500/80 shadow-[0_0_35px_rgba(234,179,8,0.25)]',
                    rankBadge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black',
                    rankText: 'text-black font-black italic',
                    teamNameText: 'text-white text-gradient-gold',
                    ptsText: 'text-gradient-gold drop-shadow-[0_0_25px_rgba(234,179,8,0.85)] text-4xl sm:text-5xl',
                    ptsBadge: 'bg-amber-500/20 border-amber-500/50',
                    borderAccent: 'border-l-4 border-l-yellow-400',
                  }
                : isRank2
                ? {
                    card: 'bg-gradient-to-r from-sky-500/20 via-slate-400/10 to-[#080d14] border-2 border-sky-400/60 shadow-[0_0_30px_rgba(56,189,248,0.2)]',
                    rankBadge: 'bg-gradient-to-r from-sky-300 to-cyan-500 text-black',
                    rankText: 'text-black font-black italic',
                    teamNameText: 'text-white',
                    ptsText: 'text-sky-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.7)] text-3xl sm:text-4xl',
                    ptsBadge: 'bg-sky-500/20 border-sky-400/40',
                    borderAccent: 'border-l-4 border-l-sky-400',
                  }
                : isRank3
                ? {
                    card: 'bg-gradient-to-r from-[#171822] via-[#12131b] to-[#0a0a0d] border border-amber-600/30 hover:border-amber-500/50 shadow-[0_0_20px_rgba(0,0,0,0.6)]',
                    rankBadge: 'bg-amber-900/80 text-amber-300 border border-amber-600/50',
                    rankText: 'text-amber-200 font-black italic',
                    teamNameText: 'text-slate-100',
                    ptsText: 'text-amber-200 text-2xl sm:text-3xl',
                    ptsBadge: 'bg-black/40 border-white/10',
                    borderAccent: 'border-l-4 border-l-amber-600',
                  }
                : {
                    card: 'bg-gradient-to-r from-[#13141a] via-[#0f1015] to-[#08080a] border border-white/10 hover:border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.6)]',
                    rankBadge: 'bg-surface-800 text-slate-400 border border-white/10',
                    rankText: 'text-slate-300 font-black italic',
                    teamNameText: 'text-slate-300',
                    ptsText: 'text-slate-200 text-2xl sm:text-3xl',
                    ptsBadge: 'bg-black/40 border-white/10',
                    borderAccent: 'border-l-4 border-l-surface-600',
                  };

              return (
                <motion.div
                  key={team.teamId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  style={{
                    clipPath: 'polygon(0% 0%, calc(100% - 20px) 0%, 100% 20px, 100% 100%, 20px 100%, 0% calc(100% - 20px))',
                  }}
                  className={`w-full py-3 sm:py-3.5 px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${rowClasses.card}`}
                >
                  {/* ── 1. RANK BADGE ────────────────────────────────────────── */}
                  <div className="w-24 sm:w-28 flex items-center justify-center flex-shrink-0">
                    <div
                      style={{
                        clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
                      }}
                      className={`px-4 sm:px-5 py-1.5 flex items-center justify-center gap-1.5 shadow-md ${rowClasses.rankBadge}`}
                    >
                      {isRank1 && <span className="text-base leading-none">👑</span>}
                      <span className={`text-xl sm:text-2xl tracking-tighter ${rowClasses.rankText}`}>
                        #{rank}
                      </span>
                    </div>
                  </div>

                  {/* ── 2. TEAM LOGO & IDENTITY ──────────────────────────────── */}
                  <div className="flex-1 pl-3 sm:pl-4 flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Hexagonal / Chamfered Emblem Container */}
                    <div
                      style={{
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      }}
                      className={`w-12 h-12 sm:w-14 sm:h-14 p-0.5 flex-shrink-0 flex items-center justify-center bg-black
                        ${isRank1 ? 'bg-gradient-to-b from-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]'
                          : isRank2 ? 'bg-gradient-to-b from-sky-400 to-cyan-600 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                          : 'border border-white/20'}`}
                    >
                      <div className="w-full h-full bg-[#0d0e14] flex items-center justify-center p-1 overflow-hidden">
                        <img
                          src={team.logoUrl}
                          alt={team.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className={`font-black italic text-xl sm:text-2xl lg:text-3xl uppercase tracking-[0.1em] truncate leading-none ${rowClasses.teamNameText}`}>
                          {team.displayName}
                        </h2>
                        {isRank1 && (
                          <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            LEADER
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs tracking-widest text-slate-400 uppercase mt-1">
                        OWNER: <span className="text-amber-300 font-black">{team.ownerName}</span>
                      </p>
                    </div>
                  </div>

                  {/* ── 3. WINS (W) ──────────────────────────────────────────── */}
                  <div className="w-20 sm:w-24 text-center flex-shrink-0">
                    <span className="font-black italic text-xl sm:text-2xl text-emerald-400 tabular-nums">
                      {team.wins}
                    </span>
                  </div>

                  {/* ── 4. LOSSES (L) ────────────────────────────────────────── */}
                  <div className="w-20 sm:w-24 text-center flex-shrink-0">
                    <span className="font-black italic text-xl sm:text-2xl text-rose-400 tabular-nums">
                      {team.losses}
                    </span>
                  </div>

                  {/* ── 5. SCORE DIFF (+/-) ──────────────────────────────────── */}
                  <div className="w-24 sm:w-28 text-center flex-shrink-0">
                    <span className={`font-black italic text-lg sm:text-xl tabular-nums
                      ${team.diff > 0 ? 'text-emerald-300' : team.diff < 0 ? 'text-rose-300' : 'text-slate-300'}`}>
                      {team.formattedDiff}
                    </span>
                  </div>

                  {/* ── 6. TOTAL PTS (Massive Vibrant Numeral) ────────────────── */}
                  <div className="w-32 sm:w-40 flex items-center justify-center flex-shrink-0">
                    <div
                      style={{
                        clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
                      }}
                      className={`w-full py-1.5 px-4 flex items-center justify-center border ${rowClasses.ptsBadge}`}
                    >
                      <span className={`font-black italic tracking-tight tabular-nums ${rowClasses.ptsText}`}>
                        {team.pts}
                      </span>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>

        </div>
      </main>

      {/* ===================================================================== */}
      {/* 3. DEMONS REIGN ESPORTS TELEMETRY FOOTER                              */}
      {/* ===================================================================== */}
      <footer className="w-full relative z-20 flex-shrink-0 mt-2">
        <div className="w-full py-2 px-6 bg-black/70 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-black">DEMONS REIGN 2026</span>
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
