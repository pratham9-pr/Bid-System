import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionRoom } from '../hooks/useAuctionRoom';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { PlayerRevealCard } from '../components/PlayerRevealCard';
import { getTeamDisplayName, getTeamOwner } from '../config/teamsConfig';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from '../config/franchiseCaptains';

// ─── SOLD OUT Stamp Component ────────────────────────────────────────────────
function SoldOutStamp({ winnerName, winningBid }) {
  return (
    <motion.div
      initial={{ scale: 4, opacity: 0, rotate: -16 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 10,
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none p-4"
    >
      {/* Heavy drop shadow + glowing stamp frame */}
      <div className="relative flex flex-col items-center">
        {/* Background glow burst */}
        <div className="absolute -inset-8 bg-red-600/30 blur-3xl rounded-full animate-pulse" />

        {/* The Stamp Box */}
        <div
          className="relative px-8 py-3 rounded-2xl border-4 border-red-500 bg-red-950/85 backdrop-blur-md
                     shadow-[0_0_50px_rgba(239,68,68,0.8),inset_0_0_20px_rgba(239,68,68,0.5)]
                     flex flex-col items-center justify-center text-center"
        >
          <span className="font-rajdhani font-black text-6xl sm:text-7xl tracking-[0.15em] text-red-500 uppercase leading-none drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)]">
            SOLD OUT
          </span>
          <div className="w-full h-0.5 bg-red-500/60 my-2" />
          <span className="font-rajdhani font-bold text-sm sm:text-base tracking-[0.3em] text-amber-400 uppercase leading-tight">
            FINAL BID ACQUIRED
          </span>
        </div>

        {/* Animated Winner HUD Pill below the stamp */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 px-6 py-2 rounded-xl bg-black/90 border-2 border-gold-500/70 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-2.5"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-ping" />
          <span className="font-rajdhani font-bold text-xs sm:text-sm text-slate-300 uppercase tracking-widest">
            WON BY:
          </span>
          <span className="font-rajdhani font-black text-sm sm:text-base text-gold-400 uppercase tracking-wide">
            {winnerName || 'UNKNOWN TEAM'}
          </span>
          <span className="text-slate-400 text-xs">•</span>
          <span className="font-rajdhani font-black text-sm sm:text-base text-fire-400 tabular-nums">
            ₣{(winningBid ?? 0).toLocaleString()}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Dual Franchise Roster Bar (Bottom HUD) ──────────────────────────────────
function BroadcastDualRosters({ teams, players }) {
  const activeTeams = (teams || []).filter((t) => {
    const clean = String(t.id).toLowerCase();
    return (
      clean.includes('alpha') ||
      clean.includes('beta') ||
      clean.includes('power') ||
      clean.includes('vortex')
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto my-3 grid grid-cols-1 md:grid-cols-2 gap-4">
      {activeTeams.map((team) => {
        const { slots, totalCount, remainingSlots } = getTeamFullRoster(team.id, players);
        const isPower =
          String(team.id).toLowerCase().includes('alpha') ||
          String(team.name || team.team_name || '').toLowerCase().includes('power');

        return (
          <div
            key={team.id}
            className={`p-3 rounded-2xl border backdrop-blur-md transition-all relative overflow-hidden
              ${
                isPower
                  ? 'bg-gradient-to-r from-amber-950/40 via-surface-900/90 to-surface-900/80 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-gradient-to-r from-sky-950/40 via-surface-900/90 to-surface-900/80 border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
              }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPower ? 'bg-amber-400 animate-pulse' : 'bg-sky-400 animate-pulse'
                  }`}
                />
                <div>
                  <h4 className="font-rajdhani font-black text-sm sm:text-base text-white leading-tight uppercase">
                    {getTeamDisplayName(team.id, team.name || team.team_name)}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-inter">
                    Owner: <span className="text-amber-300 font-bold">{getTeamOwner(team.id, team.owner_name || team.owner)}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-rajdhani font-black text-sm sm:text-base text-gold-400 tabular-nums">
                  ₣{(team.fire_coin_balance ?? 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-muted font-inter block leading-none">
                  {totalCount}/4 Roster ({remainingSlots} open draft slot{remainingSlots !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* 4 Slot Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {slots.map((p, idx) => {
                const isCap = idx === 0;
                if (!p) {
                  return (
                    <div
                      key={`bcast-empty-${team.id}-${idx}`}
                      className="p-1.5 rounded-xl border border-dashed border-white/10 bg-black/20 text-center flex flex-col items-center justify-center min-h-[52px]"
                    >
                      <span className="text-[9px] font-rajdhani font-bold text-slate-500 uppercase">
                        Slot #{idx + 1}
                      </span>
                      <span className="text-[8px] text-slate-600 font-inter">Open</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`bcast-slot-${team.id}-${p.id || idx}`}
                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-between text-center min-h-[52px] relative overflow-hidden
                      ${
                        isCap
                          ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/20'
                          : 'bg-surface-800/80 border-surface-600/40'
                      }`}
                  >
                    <span className="text-[10px] font-rajdhani font-black text-white truncate max-w-full leading-tight">
                      {p.in_game_name || p.name}
                    </span>
                    {isCap ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-rajdhani font-black text-[8px] uppercase tracking-wider mt-0.5">
                        👑 IGL · CAPTAIN
                      </span>
                    ) : (
                      <span className="text-[8px] text-gold-400 font-inter font-bold tabular-nums mt-0.5">
                        ₣{(p.current_bid ?? p.sold_price ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BroadcastOverlay Component
// ─────────────────────────────────────────────────────────────────────────────
export default function BroadcastOverlay() {
  const { activePlayer, auctionPaused, isRevealed, auctionState } = useAuctionRoom(null);
  const { teams } = useAllTeams();
  const { players } = useAllPlayers();
  const [transparentBg, setTransparentBg] = useState(false);

  const isSold = activePlayer?.status === 'sold';

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between pt-16 pb-8 px-6 sm:px-12 relative overflow-hidden transition-colors duration-300
        ${transparentBg ? 'bg-transparent' : 'bg-[#06070c] bg-radial-gradient'}`}
    >
      {/* ===================================================================== */}
      {/* 1. TOP FIXED TEAM WALLETS HUD (Thin height, minimalist, opacity-60)   */}
      {/* ===================================================================== */}
      <nav className="fixed top-0 left-0 w-full z-40 px-6 py-2 bg-black/70 backdrop-blur-md border-b border-white/10 opacity-70 hover:opacity-100 transition-opacity duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Header Label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-fire-500 animate-pulse" />
            <span className="text-[11px] font-rajdhani font-black tracking-[0.2em] text-white uppercase hidden sm:inline">
              HEAD-TO-HEAD AUCTION
            </span>
          </div>

          {/* Team Wallets Grid Strip */}
          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-0.5">
            {teams.map((t) => {
              const isBankrupt = (t.fire_coin_balance ?? 0) === 0;
              const isLow = !isBankrupt && (t.fire_coin_balance ?? 0) < 500;
              const { totalCount, isFull, isPendingTeam } = getTeamFullRoster(t.id, players);

              if (isPendingTeam) {
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-900/60 border border-slate-700/30 opacity-40 flex-shrink-0"
                    title="Franchise Closed / Inactive for this draft"
                  >
                    <span className="font-rajdhani font-bold text-xs text-slate-500 truncate max-w-[90px]">
                      {getTeamDisplayName(t.id, t.name || t.team_name)}
                    </span>
                    <span className="text-[8px] font-rajdhani font-black text-slate-500 bg-slate-800 px-1 py-0.2 rounded uppercase">
                      🔒 CLOSED
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-800/60 border border-surface-600/40 flex-shrink-0
                    ${isBankrupt ? 'border-red-500/40 opacity-40' : isLow ? 'border-amber-500/40' : ''}`}
                >
                  <span className="font-rajdhani font-bold text-xs text-slate-200 truncate max-w-[110px]">
                    {getTeamDisplayName(t.id, t.name || t.team_name)}
                  </span>
                  <span
                    className={`font-rajdhani font-black text-xs tabular-nums
                      ${isBankrupt ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-gold-400'}`}
                  >
                    ₣{(t.fire_coin_balance ?? 0).toLocaleString()}
                  </span>
                  <span className={`text-[9px] font-rajdhani font-bold px-1.5 py-0.2 rounded
                    ${isFull ? 'bg-gold-500/20 text-gold-400' : 'bg-surface-700 text-slate-300'}`}>
                    {totalCount}/{MAX_ROSTER_SIZE}
                  </span>
                </div>
              );
            })}
          </div>

          {/* OBS Transparency Toggle */}
          <button
            onClick={() => setTransparentBg((prev) => !prev)}
            className="text-[9px] font-inter px-2 py-1 rounded bg-surface-700/60 border border-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            title="Toggle background transparency for OBS Studio Browser Source"
          >
            {transparentBg ? 'OBS: Transparent' : 'OBS: Solid'}
          </button>
        </div>
      </nav>

      {/* ── BROADCAST TOP SUB-HEADER ──────────────────────────────────────── */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] bg-black flex-shrink-0">
            <img src="/demons_reign_logo.jpg" alt="Demons Reign" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-rajdhani font-black text-lg text-white tracking-wider leading-none">
              DEMONS REIGN
            </h1>
            <p className="font-rajdhani font-black text-[10px] tracking-[0.25em] text-fire-500 uppercase mt-0.5">
              OFFICIAL BROADCAST STAGE
            </p>
          </div>
        </div>

        {/* Live / Paused Status */}
        <div>
          {auctionPaused ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-rajdhani font-black text-xs uppercase tracking-widest animate-pulse">
              ⏸ AUCTION PAUSED
            </span>
          ) : activePlayer && isRevealed ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-fire-500/15 border border-fire-500/30 text-fire-400 font-rajdhani font-black text-xs uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-fire-500 animate-ping" />
              LIVE ON STAGE
            </span>
          ) : activePlayer && !isRevealed ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-rajdhani font-black text-xs uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              STAGE LOCKED · WAITING REVEAL
            </span>
          ) : isSold ? (
            <span className="px-3 py-1 rounded-lg bg-gold-500/20 border border-gold-500/40 text-gold-400 font-rajdhani font-black text-xs uppercase tracking-widest">
              ✓ PLAYER SOLD
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-surface-700 border border-surface-600 text-muted font-rajdhani font-bold text-xs uppercase tracking-widest">
              STANDBY
            </span>
          )}
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. CENTER STAGE: 3D CARD + MASSIVE GLOWING BID + SOLD STAMP          */}
      {/* ===================================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center my-4 relative">
        <div className="relative w-full max-w-md flex flex-col items-center">
          
          {/* The 3D Flip Card Container with full-bleed custom image */}
          <div className="relative w-full">
            <PlayerRevealCard player={activePlayer} isRevealed={isRevealed} auctionState={auctionState} />

            {/* 3. SOLD OUT STAMP ANIMATION (Triggers strictly when status === 'sold') */}
            <AnimatePresence>
              {isSold && (
                <SoldOutStamp
                  winnerName={activePlayer?.current_highest_bidder_name}
                  winningBid={activePlayer?.current_bid}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── MASSIVE GLOWING BID COUNTER HUD BELOW CARD ────────────────── */}
          {activePlayer && isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full mt-4 p-4 rounded-2xl border text-center relative overflow-hidden backdrop-blur-md
                ${isSold
                  ? 'bg-gold-500/10 border-gold-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                  : 'bg-surface-900/90 border-fire-500/40 shadow-[0_0_30px_rgba(249,115,22,0.25)]'}`}
            >
              <div className="flex items-center justify-between mb-1 text-[10px] font-rajdhani font-black uppercase tracking-[0.2em] text-slate-400">
                <span>{isSold ? 'WINNING FINAL BID' : 'CURRENT HIGHEST BID'}</span>
                <span className="text-amber-400 font-black">AUTO-SELL CAP: ₣30,000 FC</span>
              </div>

              {/* Massive Number */}
              <div className="flex items-center justify-center gap-1.5 my-1">
                <span className={`font-rajdhani font-black text-3xl sm:text-4xl ${isSold ? 'text-gold-400' : 'text-fire-400'}`}>
                  ₣
                </span>
                <span
                  className={`font-rajdhani font-black text-4xl sm:text-5xl tracking-tight tabular-nums
                    ${isSold ? 'text-gradient-gold drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]' : 'text-gradient-fire drop-shadow-[0_0_25px_rgba(249,115,22,0.8)]'}`}
                >
                  {(activePlayer.current_bid ?? 0).toLocaleString()}
                </span>
              </div>

              {/* Leading Team */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-rajdhani font-bold">
                <span className="text-muted uppercase tracking-wider">
                  {isSold ? 'Acquired By:' : 'Leading Bidder:'}
                </span>
                <span className="text-white uppercase tracking-wide text-sm font-black">
                  {activePlayer.current_highest_bidder_name || 'Awaiting First Bid'}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── DUAL FRANCHISE ROSTER SCOREBOARD ──────────────────────────────── */}
      <BroadcastDualRosters teams={teams} players={players} />

      {/* Bottom spacer */}
      <footer className="w-full text-center text-[10px] font-inter text-slate-500 tracking-wider">
        DEMONS REIGN AUCTION SERIES • REAL-TIME LIVE SYNC
      </footer>
    </div>
  );
}
