import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo, getTeamConfig } from '../config/teamsConfig';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from '../config/franchiseCaptains';

/**
 * Animated Balance Text
 * Wraps the '₣' Free Fire balance text in a <motion.span>.
 * Briefly scales up (scale: 1.1) and flashes a highlight color whenever balance decreases.
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
      className={`inline-flex items-center gap-1 tabular-nums font-black italic text-sm tracking-tight ${
        isRank1 ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-amber-400'
      }`}
    >
      <span className="text-xs font-black">₣</span>
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </motion.span>
  );
}

export function TeamLeaderboard({ teams = [], players: propPlayers }) {
  const { players: hookPlayers } = useAllPlayers();
  const activePlayers = propPlayers && propPlayers.length > 0 ? propPlayers : (hookPlayers || []);

  const activeTeamsList = (teams && teams.length > 0 ? teams : TEAMS_CONFIG).map((t, idx) => {
    const config = getTeamConfig(t.id) || TEAMS_CONFIG.find((c) => c.id === t.id) || TEAMS_CONFIG[idx] || {};
    const teamId = t.id || config.id;
    const displayName = getTeamDisplayName(teamId, t.team_name || t.name || config.name);
    const ownerName = getTeamOwner(teamId, t.owner_name || t.owner || config.owner);
    const logoUrl = getTeamLogo(teamId) || config.logo || '/demons_reign_logo.jpg';
    const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: '0', pts: 0 };

    const wins = typeof t.wins === 'number' ? t.wins : defaultStats.wins;
    const losses = typeof t.losses === 'number' ? t.losses : defaultStats.losses;
    const rawDiff = t.score_diff ?? t.diff ?? defaultStats.diff;
    const diffNum = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (Number(rawDiff) || 0);
    const pts = typeof t.points === 'number' ? t.points : (typeof t.pts === 'number' ? t.pts : defaultStats.pts);
    const balance = typeof t.fire_coin_balance === 'number' ? t.fire_coin_balance : 40000;

    const { totalCount = 0, remainingSlots = MAX_ROSTER_SIZE, isFull = false } = getTeamFullRoster(teamId, activePlayers);

    return {
      ...t,
      teamId,
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

  const sorted = [...activeTeamsList].sort((a, b) => {
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
      className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-rajdhani select-none relative overflow-hidden"
    >
      {/* Top Ambient Glow */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-75" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black italic text-xl sm:text-2xl text-white tracking-widest uppercase">
              DEMONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400">REIGN</span> LEADERBOARD
            </h2>
            <span
              className="bg-red-600/25 border border-red-500/40 text-red-400 font-black italic text-[10px] px-2.5 py-0.5 rounded-md uppercase"
            >
              LIVE STANDINGS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-0.5">
            OFFICIAL STAGE POINTS & AUCTION PURSE
          </p>
        </div>

        <a
          href="/leaderboard"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-black italic tracking-wider text-amber-400 hover:text-white px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 rounded-xl transition-colors uppercase flex items-center gap-1.5"
        >
          <span>↗ OPEN OBS BROADCAST</span>
        </a>
      </div>

      {/* Table Column Headers */}
      <div
        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 hidden sm:flex items-center justify-between text-slate-400 font-black italic tracking-widest text-xs uppercase mb-3"
      >
        <div className="w-16 text-center">RANK</div>
        <div className="flex-1 pl-3 text-left">FRANCHISE TEAM</div>
        <div className="w-24 text-center">ROSTER</div>
        <div className="w-28 text-right pr-2">PURSE (₣)</div>
        <div className="w-12 text-center">W</div>
        <div className="w-12 text-center">L</div>
        <div className="w-16 text-center">DIFF</div>
        <div className="w-20 text-center text-amber-400">PTS</div>
      </div>

      {/* Rows: <motion.ul> with layout spring transitions and cascade */}
      <motion.ul className="flex flex-col gap-2.5 list-none m-0 p-0">
        {sorted.map((team, index) => {
          const rank = index + 1;
          const isRank1 = rank === 1;

          const rowStyles = isRank1
            ? 'bg-gradient-to-r from-red-900/40 to-transparent border border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.25),0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-inset ring-red-500/30'
            : 'bg-gradient-to-r from-gray-900 to-transparent border border-white/10 hover:border-white/20';

          return (
            <motion.li
              key={team.teamId}
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
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-colors duration-300 ${rowStyles} relative overflow-hidden`}
            >
              {/* Rank */}
              <div className="w-16 flex items-center justify-center flex-shrink-0">
                <div
                  className={`px-3 py-1 rounded-lg flex items-center justify-center gap-1 font-black italic text-sm tabular-nums
                    ${isRank1 ? 'bg-gradient-to-r from-red-500 to-amber-500 text-black shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                      : rank === 2 ? 'bg-slate-300 text-slate-900'
                      : rank === 3 ? 'bg-amber-800 text-amber-200'
                      : 'bg-surface-800 text-slate-300 border border-white/10'}`}
                >
                  #{rank}
                </div>
              </div>

              {/* Team Info */}
              <div className="flex-1 pl-3 flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 p-0.5 rounded-lg flex-shrink-0 flex items-center justify-center bg-black border ${
                    isRank1 ? 'border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'border-white/20'
                  }`}
                >
                  <img
                    src={team.logoUrl}
                    alt={team.displayName}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className={`font-black italic text-base sm:text-lg uppercase tracking-wider truncate leading-tight
                    ${isRank1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-amber-300' : 'text-white'}`}>
                    {team.displayName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold truncate">
                    Owner: <span className="text-amber-300">{team.ownerName}</span>
                  </p>
                </div>
              </div>

              {/* Player Count */}
              <div className="w-24 text-center hidden sm:block flex-shrink-0">
                <span className="font-black italic text-sm text-slate-300 tabular-nums">
                  {team.playerCount}/{MAX_ROSTER_SIZE}
                </span>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Roster</span>
              </div>

              {/* Coin Balance with Animated Balance Pulse on Decrease */}
              <div className="w-28 text-right pr-2 hidden sm:block flex-shrink-0">
                <BalancePulse balance={team.balance} isRank1={isRank1} />
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Purse</span>
              </div>

              {/* W */}
              <div className="w-12 text-center font-black italic text-base text-emerald-400 tabular-nums flex-shrink-0">
                {team.wins}
              </div>

              {/* L */}
              <div className="w-12 text-center font-black italic text-base text-rose-400 tabular-nums flex-shrink-0">
                {team.losses}
              </div>

              {/* DIFF */}
              <div className="w-16 text-center font-black italic text-sm tabular-nums flex-shrink-0">
                <span className={team.diff > 0 ? 'text-emerald-300' : team.diff < 0 ? 'text-rose-300' : 'text-slate-300'}>
                  {team.formattedDiff}
                </span>
              </div>

              {/* PTS */}
              <div className="w-20 text-center flex items-center justify-center flex-shrink-0">
                <span className={`font-black italic text-2xl tabular-nums
                  ${isRank1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-amber-300 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                    : 'text-slate-100'}`}>
                  {team.pts}
                </span>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export default TeamLeaderboard;
