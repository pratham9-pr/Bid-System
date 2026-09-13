import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllTeams } from './hooks/useAllTeams';
import { useAllPlayers } from './hooks/useAllPlayers';
import { useAuth } from './context/AuthContext';
import { supabase } from './config/supabase';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo, getTeamConfig } from './config/teamsConfig';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from './config/franchiseCaptains';

/**
 * Animated Balance Text
 * Wraps the '₣' Free Fire balance text in a <motion.span>.
 * Briefly scales up (scale: 1.1) and flashes a highlight color whenever balance decreases.
 */
export function BalancePulse({ balance, isRank1 }) {
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
      className={`inline-flex items-center gap-1 tabular-nums font-black italic text-base sm:text-xl tracking-tight ${
        isRank1 ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-amber-400'
      }`}
    >
      <span className="text-sm sm:text-base font-black">₣</span>
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </motion.span>
  );
}

/**
 * Demons Reign Free Fire Auction — Premium Esports Broadcast Leaderboard Overlay
 * With Framer Motion animations, live tournament data state, and secure 'Reset Scores' feature.
 */
export default function Leaderboard({
  teams: propTeams,
  players: propPlayers,
  isOverlay = false,
  transparentBg: propTransparentBg,
  sortBy = 'points', // 'points' | 'balance'
  isAdmin: propIsAdmin,
}) {
  const { teams: hookTeams } = useAllTeams();
  const { players: hookPlayers } = useAllPlayers();

  // Auth context check (safe if rendered outside AuthProvider)
  let currentUser = null;
  try {
    const auth = useAuth();
    currentUser = auth?.currentUser;
  } catch (_) {
    currentUser = null;
  }

  const isAdminUser = propIsAdmin ?? (currentUser?.role === 'admin');

  const [internalTransparentBg, setInternalTransparentBg] = useState(false);
  const transparentBg = propTransparentBg !== undefined ? propTransparentBg : internalTransparentBg;

  // Local optimistic state override for instant Framer Motion re-renders & rollback
  const [localTeamsOverride, setLocalTeamsOverride] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Clear local override once fresh remote database teams arrive
  useEffect(() => {
    if (localTeamsOverride && hookTeams && hookTeams.length > 0) {
      const allZeroed = hookTeams.every((t) => (Number(t.points || t.pts) || 0) === 0 && (Number(t.wins) || 0) === 0);
      if (allZeroed) {
        setLocalTeamsOverride(null);
      }
    }
  }, [hookTeams, localTeamsOverride]);

  // Prefer local override during optimistic update, then passed props, then hook data, then TEAMS_CONFIG
  const rawTeams = localTeamsOverride || (propTeams && propTeams.length > 0 ? propTeams : (hookTeams && hookTeams.length > 0 ? hookTeams : TEAMS_CONFIG));
  const rawPlayers = propPlayers && propPlayers.length > 0 ? propPlayers : (hookPlayers || []);

  // Format and enrich live tournament data state
  const enrichedTeams = rawTeams.map((t, idx) => {
    const config = getTeamConfig(t.id) || TEAMS_CONFIG.find((c) => c.id === t.id) || TEAMS_CONFIG[idx] || {};
    // Ensure strictly unique team ID for Framer Motion key tracking
    const uniqueTeamId = String(t.id || config.id || `team_${idx + 1}`);
    const displayName = getTeamDisplayName(uniqueTeamId, t.team_name || t.name || config.name);
    const ownerName = getTeamOwner(uniqueTeamId, t.owner_name || t.owner || config.owner);
    const logoUrl = getTeamLogo(uniqueTeamId) || config.logo || t.logo_url || '/demons_reign_logo.jpg';

    // Live roster slots from tournament players state
    const { totalCount = 0, remainingSlots = MAX_ROSTER_SIZE, isFull = false, slots = [] } = getTeamFullRoster(uniqueTeamId, rawPlayers);

    // Live match stats
    const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: 0, pts: 0 };
    const wins = typeof t.wins === 'number' ? t.wins : defaultStats.wins;
    const losses = typeof t.losses === 'number' ? t.losses : defaultStats.losses;
    const rawDiff = t.score_diff ?? t.diff ?? defaultStats.diff;
    const diffNum = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (Number(rawDiff) || 0);
    const pts = typeof t.points === 'number' ? t.points : (typeof t.pts === 'number' ? t.pts : defaultStats.pts);
    const balance = typeof t.budget === 'number'
      ? t.budget
      : (typeof t.fire_coin_balance === 'number' ? t.fire_coin_balance : (typeof t.purse === 'number' ? t.purse : 40000));

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
      slots,
      wins,
      losses,
      diff: diffNum,
      formattedDiff: diffNum > 0 ? `+${diffNum}` : `${diffNum}`,
      pts,
      balance,
    };
  });

  // Dynamic sorting engine based on standard leaderboard criteria
  const sortedTeams = [...enrichedTeams].sort((a, b) => {
    if (sortBy === 'balance' || sortBy === 'purse') {
      const balA = Number(a.balance) || 0;
      const balB = Number(b.balance) || 0;
      if (balB !== balA) return balB - balA;

      const ptsA = Number(a.pts) || 0;
      const ptsB = Number(b.pts) || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;

      const diffA = Number(a.diff) || 0;
      const diffB = Number(b.diff) || 0;
      if (diffB !== diffA) return diffB - diffA;

      const winsA = Number(a.wins) || 0;
      const winsB = Number(b.wins) || 0;
      return winsB - winsA;
    }

    // Standard Tournament Leaderboard Criteria:
    // 1. Primary: Sort descending by Total Points (PTS)
    const ptsA = Number(a.pts) || 0;
    const ptsB = Number(b.pts) || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;

    // 2. Secondary fallback: Sort descending by Score Differential (+/- DIFF)
    const diffA = Number(a.diff) || 0;
    const diffB = Number(b.diff) || 0;
    if (diffB !== diffA) return diffB - diffA;

    // 3. Tertiary fallback: Sort descending by Wins (W)
    const winsA = Number(a.wins) || 0;
    const winsB = Number(b.wins) || 0;
    if (winsB !== winsA) return winsB - winsA;

    // 4. Quaternary fallback: Sort descending by Remaining Purse / Fire Coin Balance
    const balA = Number(a.balance) || 0;
    const balB = Number(b.balance) || 0;
    return balB - balA;
  });

  // Secure Reset Scores Execution with Optimistic Update and Rollback
  const handleExecuteResetScores = async () => {
    setShowConfirmModal(false);
    setIsResetting(true);

    // Save snapshot of current teams state for rollback
    const previousSnapshot = [...rawTeams];

    // Optimistically zero out score fields immediately so Framer Motion animates smoothly
    const optimisticZeroed = rawTeams.map((team) => ({
      ...team,
      wins: 0,
      losses: 0,
      diff: 0,
      score_diff: 0,
      pts: 0,
      points: 0,
      matches_played: 0,
    }));
    setLocalTeamsOverride(optimisticZeroed);

    try {
      const teamIds = rawTeams.map((t) => t.id || t.teamId).filter(Boolean);

      // Batch update in Supabase
      const { error } = await supabase
        .from('teams')
        .update({
          wins: 0,
          losses: 0,
          diff: 0,
          score_diff: 0,
          pts: 0,
          points: 0,
          matches_played: 0,
        })
        .in('id', teamIds);

      if (error) {
        // Fallback: per-team update
        const updates = teamIds.map((id) =>
          supabase
            .from('teams')
            .update({
              wins: 0,
              losses: 0,
              diff: 0,
              score_diff: 0,
              pts: 0,
              points: 0,
              matches_played: 0,
            })
            .eq('id', id)
        );
        const results = await Promise.all(updates);
        const hasFailure = results.some((r) => r.error);
        if (hasFailure) {
          throw new Error(error.message || 'One or more teams failed to update in database.');
        }
      }

      // Broadcast update notice across all active overlay screens
      try {
        const channel = supabase.channel('teams_realtime_broadcast_bus');
        await channel.send({
          type: 'broadcast',
          event: 'standings_updated',
          payload: { timestamp: Date.now() },
        });
      } catch (broadcastErr) {
        console.warn('Broadcast notification notice:', broadcastErr);
      }

      setToast({ type: 'success', message: 'All team scores successfully reset to zero.' });
    } catch (err) {
      console.error('Reset scores failed, rolling back:', err);
      // Rollback optimistic update
      setLocalTeamsOverride(previousSnapshot);
      setToast({
        type: 'error',
        message: `Database error: ${err.message || 'Failed to reset scores'}. Changes rolled back.`,
      });
    } finally {
      setIsResetting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className={`w-full font-rajdhani select-none ${isOverlay ? 'min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col justify-between' : 'p-2'}`}>
      {/* ── Notification Toast ────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2.5 border backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}
          >
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Container: Frosted Glassmorphism Overlay (bg-black/60 backdrop-blur-xl) ── */}
      <div
        className={`w-full max-w-6xl mx-auto rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative transition-colors duration-300 ${
          transparentBg ? 'bg-transparent' : 'bg-black/60 backdrop-blur-xl'
        }`}
      >
        {/* Color-graded ambient top accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-75" />

        {/* ── Broadcast Header ────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 p-0.5 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex-shrink-0">
              <div className="w-full h-full bg-black/80 rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                <img
                  src="/demons_reign_logo.jpg"
                  alt="Demons Reign"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-black italic text-2xl sm:text-3xl text-white tracking-widest uppercase leading-none">
                  DEMONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400">REIGN</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-red-600/25 border border-red-500/40 text-red-400 font-black italic text-[10px] tracking-wider uppercase">
                  LIVE OVERLAY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase mt-1">
                FREE FIRE AUCTION • OFFICIAL STANDINGS & LEADERBOARD
              </p>
            </div>
          </div>

          {/* Right: Broadcast Status, OBS Switch, and Broadcast-Protected Reset Utility */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-[11px] text-slate-300 uppercase tracking-widest">
                STAGE BROADCAST
              </span>
            </div>

            {isOverlay && (
              <button
                onClick={() => setInternalTransparentBg((prev) => !prev)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                title="Toggle OBS Transparency"
              >
                {transparentBg ? 'OBS: Transparent' : 'OBS: Frosted'}
              </button>
            )}

            {/* Broadcast Protection: Render if admin flag is active or on hovering over hidden utility zone */}
            <div className="relative group/admin flex items-center">
              <div
                className={`transition-opacity duration-300 ${
                  isAdminUser ? 'opacity-100' : 'opacity-0 group-hover/admin:opacity-100'
                }`}
              >
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isResetting}
                  className="text-xs text-red-400/70 hover:text-red-400 border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-bold disabled:opacity-50"
                  title="Reset all team scores and points to 0"
                >
                  <span>↺</span>
                  <span>{isResetting ? 'Resetting...' : 'Reset Standings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Column Headers Strip ─────────────────────────────────── */}
        <div className="px-6 py-2.5 bg-white/[0.02] border-b border-white/10 hidden sm:flex items-center justify-between text-xs font-black tracking-[0.15em] text-slate-400 uppercase">
          <div className="w-16 text-center">RANK</div>
          <div className="flex-1 pl-4 text-left">FRANCHISE TEAM</div>
          <div className="w-28 text-center">ROSTER</div>
          <div className="w-36 text-right pr-4">PURSE (₣ FC)</div>
          <div className="w-20 text-center">W - L</div>
          <div className="w-20 text-center">DIFF</div>
          <div className="w-24 text-center text-amber-400">PTS</div>
        </div>

        {/* ── Team Rows List: <motion.ul> with layout spring transitions and cascade ── */}
        <motion.ul className="p-4 sm:p-6 flex flex-col gap-3 list-none m-0">
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
                className={`w-full rounded-2xl p-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors duration-300 relative overflow-hidden
                  ${
                    isRank1
                      ? 'bg-gradient-to-r from-red-900/40 to-transparent border border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.25),0_0_25px_rgba(239,68,68,0.15)] ring-1 ring-inset ring-red-500/30'
                      : 'bg-gradient-to-r from-gray-900 to-transparent border border-white/10 hover:border-white/20'
                  }`}
              >
                {/* Accent line for #1 rank */}
                {isRank1 && (
                  <div className="absolute left-0 inset-y-0 w-1.5 bg-gradient-to-b from-red-500 via-orange-500 to-amber-500" />
                )}

                {/* Left: Rank & Team Identity */}
                <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                  {/* Rank Badge */}
                  <div className="w-12 sm:w-16 flex items-center justify-center flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-base sm:text-lg tabular-nums shadow-md
                        ${
                          isRank1
                            ? 'bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-2 ring-amber-400/50'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-900 shadow-inner'
                            : rank === 3
                            ? 'bg-amber-700/80 text-amber-100 border border-amber-500/40'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                    >
                      #{rank}
                    </div>
                  </div>

                  {/* Team Mascot Logo */}
                  <div
                    className={`w-12 h-12 rounded-xl p-0.5 flex-shrink-0 flex items-center justify-center bg-black/80 border
                      ${isRank1 ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'border-white/15'}`}
                  >
                    <img
                      src={team.logoUrl}
                      alt={team.displayName}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                    />
                  </div>

                  {/* Team Name & Owner */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-black italic text-lg sm:text-xl uppercase tracking-wider truncate leading-tight
                          ${isRank1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-amber-300 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-white'}`}
                      >
                        {team.displayName}
                      </h3>
                      {isRank1 && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/40 hidden sm:inline-block">
                          #1 LEADER
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">
                      OWNER: <span className="text-amber-300 font-black">{team.ownerName}</span>
                    </p>
                  </div>
                </div>

                {/* Middle / Right: Stats & Numerical Values (ALL forced to tabular-nums) */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 flex-wrap sm:flex-nowrap border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                  {/* Player Count */}
                  <div className="w-24 sm:w-28 text-left sm:text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">
                      ROSTER
                    </span>
                    <div className="flex items-center gap-1.5 sm:justify-center">
                      <span className="font-black italic text-base sm:text-lg text-slate-200 tabular-nums">
                        {team.playerCount}/{MAX_ROSTER_SIZE}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">SLOTS</span>
                    </div>
                  </div>

                  {/* Free Fire Coin Balance with Animated Balance Pulse on Decrease */}
                  <div className="w-32 sm:w-36 text-right pr-2 sm:pr-4">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">
                      PURSE
                    </span>
                    <BalancePulse balance={team.balance} isRank1={isRank1} />
                  </div>

                  {/* Wins & Losses */}
                  <div className="w-20 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">
                      W-L
                    </span>
                    <span className="font-black italic text-sm sm:text-base tabular-nums">
                      <span className="text-emerald-400 tabular-nums">{team.wins}</span>
                      <span className="text-slate-500 mx-1">-</span>
                      <span className="text-rose-400 tabular-nums">{team.losses}</span>
                    </span>
                  </div>

                  {/* Differential (+/-) */}
                  <div className="w-16 sm:w-20 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">
                      DIFF
                    </span>
                    <span
                      className={`font-black italic text-sm sm:text-base tabular-nums
                        ${team.diff > 0 ? 'text-emerald-300' : team.diff < 0 ? 'text-rose-300' : 'text-slate-400'}`}
                    >
                      {team.formattedDiff}
                    </span>
                  </div>

                  {/* Total Points (PTS) */}
                  <div className="w-20 sm:w-24 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">
                      PTS
                    </span>
                    <div
                      className={`px-3 py-1 rounded-xl border flex items-center justify-center
                        ${
                          isRank1
                            ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'bg-black/40 border-white/10'
                        }`}
                    >
                      <span
                        className={`font-black italic text-xl sm:text-2xl tabular-nums
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
                </div>
              </motion.li>
            );
          })}
        </motion.ul>

        {/* ── Footer Telemetry ────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-white/[0.01] border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-black">DEMONS REIGN</span>
            <span>•</span>
            <span>OFFICIAL AUCTION OVERLAY</span>
          </div>
          <div className="flex items-center gap-3">
            <span>OBS READY 1080P</span>
            <span>•</span>
            <span className="text-emerald-400 font-black">REAL-TIME SYNC</span>
          </div>
        </div>
      </div>

      {/* ── Safety Confirmation Modal Dialog ─────────────────────────── */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="w-full max-w-md bg-[#0e1017] border-2 border-red-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] relative overflow-hidden"
            >
              {/* Glowing header accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-xl">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-black italic text-lg text-white uppercase tracking-wider leading-none">
                    RESET STANDINGS
                  </h3>
                  <p className="text-[11px] text-red-400 font-bold uppercase tracking-widest mt-1">
                    CONFIRMATION REQUIRED
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 font-inter mb-6 leading-relaxed">
                Are you sure you want to reset all team scores to zero? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 font-rajdhani">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteResetScores}
                  disabled={isResetting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black italic text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all cursor-pointer flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Confirm Reset</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Leaderboard };
