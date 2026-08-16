import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionRoom } from '../hooks/useAuctionRoom';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { PlayerRevealCard } from '../components/PlayerRevealCard';
import { getTeamDisplayName, getTeamOwner, getTeamLogo, TEAMS_CONFIG } from '../config/teamsConfig';
import { getTeamFullRoster } from '../config/franchiseCaptains';
import { MAX_BID_LIMIT } from '../services/auctionService';

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
      <div className="relative flex flex-col items-center">
        {/* Background glow burst */}
        <div className="absolute -inset-8 bg-red-600/30 blur-3xl rounded-full animate-pulse" />

        {/* The Stamp Box */}
        <div
          className="relative px-8 py-3 rounded-2xl border-4 border-red-500 bg-red-950/90 backdrop-blur-md
                     shadow-[0_0_50px_rgba(239,68,68,0.8),inset_0_0_20px_rgba(239,68,68,0.5)]
                     flex flex-col items-center justify-center text-center"
        >
          <span className="font-rajdhani font-black text-5xl sm:text-7xl tracking-[0.15em] text-red-500 uppercase leading-none drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)]">
            SOLD OUT
          </span>
          <div className="w-full h-0.5 bg-red-500/60 my-2" />
          <span className="font-rajdhani font-bold text-xs sm:text-sm tracking-[0.3em] text-amber-400 uppercase leading-tight">
            FINAL BID ACQUIRED
          </span>
        </div>

        {/* Animated Winner HUD Pill below the stamp */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-3 px-5 py-2 rounded-xl bg-black/90 border-2 border-gold-500/70 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-2.5"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-ping" />
          <span className="font-rajdhani font-bold text-xs text-slate-300 uppercase tracking-widest">
            WON BY:
          </span>
          <span className="font-rajdhani font-black text-sm text-gold-400 uppercase tracking-wide">
            {winnerName || 'UNKNOWN TEAM'}
          </span>
          <span className="text-slate-400 text-xs">•</span>
          <span className="font-rajdhani font-black text-sm text-fire-400 tabular-nums">
            ₣{(winningBid ?? 0).toLocaleString()}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Vertical Franchise Roster Card (Sidebar Column Item) ─────────────────────
function FranchiseSidebarCard({ teamId, teams, players }) {
  const teamConfig = TEAMS_CONFIG.find((t) => t.id === teamId) || {};
  const teamRecord = (teams || []).find((t) => String(t.id).toLowerCase() === String(teamId).toLowerCase()) || {};

  const cleanName = String(teamRecord.team_name || teamRecord.name || teamConfig.name || teamId || '').toLowerCase();
  const displayName = getTeamDisplayName(teamId, teamRecord.team_name || teamRecord.name || teamConfig.name);
  const ownerName = getTeamOwner(teamId, teamRecord.owner_name || teamRecord.owner || teamConfig.owner);
  const logoUrl = getTeamLogo(teamId);
  const balance = teamRecord.fire_coin_balance ?? 40000;

  const isPower = cleanName.includes('alpha') || cleanName.includes('power');
  const isVortex = cleanName.includes('beta') || cleanName.includes('vortex');
  const isAbyssal = cleanName.includes('gamma') || cleanName.includes('abyssal') || cleanName.includes('ebon');

  const { slots = [null, null, null, null], totalCount = 0, remainingSlots = 4, isFull = false } = getTeamFullRoster(teamId, players);

  const themeClasses = isPower
    ? {
        card: 'bg-gradient-to-b from-amber-950/50 via-surface-900/90 to-surface-900/95 border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)]',
        accentText: 'text-amber-400',
        badge: 'bg-amber-400',
      }
    : isVortex
    ? {
        card: 'bg-gradient-to-b from-sky-950/50 via-surface-900/90 to-surface-900/95 border-sky-500/30 shadow-[0_0_25px_rgba(14,165,233,0.15)]',
        accentText: 'text-sky-400',
        badge: 'bg-sky-400',
      }
    : isAbyssal
    ? {
        card: 'bg-gradient-to-b from-emerald-950/50 via-surface-900/90 to-surface-900/95 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]',
        accentText: 'text-emerald-400',
        badge: 'bg-emerald-400',
      }
    : {
        card: 'bg-gradient-to-b from-purple-950/50 via-surface-900/90 to-surface-900/95 border-purple-500/30 shadow-[0_0_25px_rgba(168,85,247,0.15)]',
        accentText: 'text-purple-400',
        badge: 'bg-purple-400',
      };

  return (
    <div
      className={`w-full flex-1 flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all duration-300 min-h-0 ${themeClasses.card} ${isFull ? 'ring-1 ring-gold-400/40' : ''}`}
    >
      {/* ── Card Header (Logo, Name, Owner, Balance) ────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-white/20 bg-black/80 flex-shrink-0 flex items-center justify-center p-0.5 shadow-md">
              <img
                src={logoUrl}
                alt={displayName}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${themeClasses.badge} animate-pulse flex-shrink-0`} />
                <h3 className="font-rajdhani font-black text-xs sm:text-sm text-white uppercase tracking-wider truncate">
                  {displayName}
                </h3>
              </div>
              <p className="text-[9px] text-slate-400 font-inter truncate">
                Owner: <span className="text-amber-300 font-bold">{ownerName}</span>
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[8px] text-slate-400 uppercase font-rajdhani font-bold block leading-none">
              Balance
            </span>
            <span className="font-rajdhani font-black text-xs sm:text-sm text-gold-400 tabular-nums">
              ₣{balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Roster Slots Header Pill ──────────────────────────────── */}
        <div className="flex items-center justify-between text-[9px] font-rajdhani font-bold text-slate-400 uppercase tracking-wider my-1.5 px-0.5">
          <span>LINEUP SLOTS</span>
          <span className={`${isFull ? 'text-gold-400 font-black' : 'text-slate-400'}`}>
            {totalCount}/4 {isFull ? '(FULL)' : `(${remainingSlots} OPEN)`}
          </span>
        </div>
      </div>

      {/* ── 4 Vertical Roster Slot Rows ──────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-1 justify-center py-0.5 min-h-0 overflow-hidden">
        {slots.map((player, idx) => {
          const isCaptain = (idx === 0 && player && player.is_captain) || player?.role === 'IGL';

          if (!player) {
            return (
              <div
                key={`empty-slot-${teamId}-${idx}`}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-dashed border-white/10 bg-black/20 text-slate-500 font-inter text-[10px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-white/5 flex items-center justify-center text-[9px] font-rajdhani font-bold text-slate-500">
                    #{idx + 1}
                  </span>
                  <span className="font-rajdhani font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                    Empty Slot
                  </span>
                </div>
                <span className="text-[9px] font-rajdhani font-semibold text-slate-600 uppercase">
                  Open Draft
                </span>
              </div>
            );
          }

          return (
            <div
              key={`filled-slot-${teamId}-${player.id || idx}`}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all duration-200
                ${isCaptain
                  ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/20'
                  : 'bg-surface-800/80 border-surface-600/40 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-rajdhani font-bold flex-shrink-0
                  ${isCaptain ? 'bg-amber-400 text-black' : 'bg-surface-700 text-slate-300'}`}>
                  #{idx + 1}
                </span>
                <span className="font-rajdhani font-black text-[11px] sm:text-xs text-white uppercase truncate">
                  {player.in_game_name || player.name}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {isCaptain ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-rajdhani font-black text-[8px] uppercase tracking-wider">
                    👑 IGL
                  </span>
                ) : (
                  <span className="font-rajdhani font-bold text-[11px] text-gold-400 tabular-nums">
                    ₣{(player.current_bid ?? player.sold_price ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini Footer Bar */}
      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] font-inter text-slate-500 flex-shrink-0">
        <span>Franchise Team</span>
        <span className={themeClasses.accentText}>
          {isFull ? 'Lineup Locked' : 'Bidding Ready'}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BroadcastOverlay Component (Three-Column Fullscreen 25% | 50% | 25%)
// ─────────────────────────────────────────────────────────────────────────────
export default function BroadcastOverlay() {
  const { activePlayer, auctionPaused, isRevealed, auctionState } = useAuctionRoom(null);
  const { teams } = useAllTeams();
  const { players } = useAllPlayers();
  const [transparentBg, setTransparentBg] = useState(false);

  const isSold = activePlayer?.status === 'sold';

  return (
    <div
      className={`h-screen w-screen flex flex-col justify-between relative overflow-hidden transition-colors duration-300 select-none
        ${transparentBg ? 'bg-transparent' : 'bg-[#05060a] bg-radial-gradient'}`}
    >
      {/* ── Ambient Background Lighting ───────────────────────────────── */}
      {!transparentBg && (
        <>
          <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full bg-fire-600/10 blur-[150px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />
        </>
      )}

      {/* ===================================================================== */}
      {/* 1. TOP HEADER BAR: Full Width Across the Entire Screen                */}
      {/* ===================================================================== */}
      <header className="w-full z-30 px-4 sm:px-6 lg:px-8 py-2 bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-4 flex-shrink-0">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] bg-black flex-shrink-0 p-0.5">
            <img src="/image_440ba2.jpg" alt="Demons Reign" className="w-full h-full object-cover rounded-full" onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-rajdhani font-black text-sm sm:text-base text-white tracking-wider leading-none">
                DEMONS <span className="text-gradient-fire">REIGN</span>
              </h1>
              <span className="text-[9px] font-rajdhani font-bold px-2 py-0.5 rounded-full bg-fire-500/20 text-fire-300 border border-fire-500/30 uppercase hidden sm:inline">
                STAGE LIVE
              </span>
            </div>
            <p className="font-rajdhani font-bold text-[9px] tracking-[0.25em] text-slate-400 uppercase mt-0.5">
              AUCTION SERIES 2026 • OFFICIAL BROADCAST
            </p>
          </div>
        </div>

        {/* Center: Live Stage Status Indicator */}
        <div className="flex items-center gap-2">
          {auctionPaused ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-rajdhani font-black text-xs uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              ⏸ AUCTION PAUSED
            </span>
          ) : activePlayer && isRevealed ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-fire-500/20 border border-fire-500/40 text-fire-400 font-rajdhani font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <span className="w-2 h-2 rounded-full bg-fire-500 animate-ping" />
              🔥 BIDDING FLOOR OPEN
            </span>
          ) : activePlayer && !isRevealed ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-rajdhani font-black text-xs uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              STAGE LOCKED • PENDING REVEAL
            </span>
          ) : isSold ? (
            <span className="px-3 py-1 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-400 font-rajdhani font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              🏆 PLAYER SOLD
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-surface-800 border border-surface-600 text-slate-400 font-rajdhani font-bold text-xs uppercase tracking-widest">
              STANDBY • WAITING FOR HOST
            </span>
          )}
        </div>

        {/* Right: OBS Transparency Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransparentBg((prev) => !prev)}
            className="text-[9px] font-rajdhani font-bold px-2.5 py-1 rounded-xl bg-surface-800/80 border border-white/10 text-slate-300 hover:text-white hover:border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Toggle background transparency for OBS Studio Browser Source"
          >
            <span>🎥</span>
            <span>{transparentBg ? 'OBS: Transparent' : 'OBS: Solid'}</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. MAIN THREE-COLUMN FULL VIEWPORT AREA (25% | 50% | 25%)             */}
      {/* ===================================================================== */}
      <div className="flex-1 w-full p-2 sm:p-3 lg:p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3.5 min-h-0 overflow-hidden relative z-10">
        
        {/* ── LEFT SIDEBAR (25% Width / Col 3): POWER HAWKS & ABYSSAL EBON ── */}
        <aside className="lg:col-span-3 w-full flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
          <FranchiseSidebarCard teamId="alpha_wolves" teams={teams} players={players} />
          <FranchiseSidebarCard teamId="gamma_reapers" teams={teams} players={players} />
        </aside>

        {/* ── CENTER STAGE (50% Width / Col 6): FULL-BLEED ACTIVE PLAYER CARD & HUD ── */}
        <main className="lg:col-span-6 w-full h-full min-h-0 flex flex-col justify-between items-center p-0 overflow-hidden relative">
          <div className="w-full h-full flex flex-col justify-between overflow-hidden relative">
            
            {/* 3D Flip Card Container stretching to the exact edges of the center stage */}
            <div className="w-full flex-1 min-h-0 relative flex flex-col overflow-hidden">
              <PlayerRevealCard player={activePlayer} isRevealed={isRevealed} auctionState={auctionState} />

              {/* SOLD OUT Stamp Animation */}
              <AnimatePresence>
                {isSold && (
                  <SoldOutStamp
                    winnerName={activePlayer?.current_highest_bidder_name}
                    winningBid={activePlayer?.current_bid}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Glowing Bid Counter HUD — Full-width flush footer */}
            {activePlayer && isRevealed && (
              <motion.div
                key={`broadcast-bid-${activePlayer.id}-${activePlayer.current_bid ?? auctionState?.current_bid}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`w-full flex-shrink-0 px-4 py-2.5 sm:py-3 rounded-2xl border text-center relative overflow-hidden backdrop-blur-2xl mt-2
                  ${isSold
                    ? 'bg-gold-500/10 border-gold-500/40 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                    : 'bg-surface-900/95 border-fire-500/40 shadow-[0_0_30px_rgba(249,115,22,0.3)]'}`}
              >
                <div className="flex items-center justify-between mb-1 text-[9px] font-rajdhani font-black uppercase tracking-[0.2em] text-slate-400">
                  <span>{isSold ? '🏆 FINAL WINNING BID' : '🔥 CURRENT HIGHEST BID'}</span>
                  <span className="text-amber-400 font-black">AUTO-SELL CAP: ₣{MAX_BID_LIMIT.toLocaleString()} FC</span>
                </div>

                {/* Massive Bid Number */}
                <div className="flex items-center justify-center gap-1.5 my-0.5">
                  <span className={`font-rajdhani font-black text-2xl sm:text-3xl ${isSold ? 'text-gold-400' : 'text-fire-400'}`}>
                    ₣
                  </span>
                  <span
                    className={`font-rajdhani font-black text-3xl sm:text-5xl tracking-tight tabular-nums
                      ${isSold ? 'text-gradient-gold drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]' : 'text-gradient-fire drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]'}`}
                  >
                    {(activePlayer.current_bid ?? auctionState?.current_bid ?? activePlayer.base_price ?? 0).toLocaleString()}
                  </span>
                </div>

                {/* Leading Team Info with Mascot Logo */}
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-white/20 bg-black/80 flex-shrink-0 flex items-center justify-center p-0.5 shadow-md">
                      <img
                        src={getTeamLogo(activePlayer.current_highest_bidder || auctionState?.highest_bidder_team_id)}
                        alt="Leading Team"
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                      />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-[8px] text-slate-400 uppercase font-rajdhani font-bold block leading-none">
                        {isSold ? 'Acquired By' : 'Leading Franchise'}
                      </span>
                      <span className="text-xs sm:text-sm font-rajdhani font-black text-white uppercase tracking-wide leading-tight truncate block mt-0.5">
                        {activePlayer.current_highest_bidder || auctionState?.highest_bidder_team_id
                          ? getTeamDisplayName(activePlayer.current_highest_bidder || auctionState?.highest_bidder_team_id, activePlayer.current_highest_bidder_name)
                          : 'AWAITING FIRST BID'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[8px] text-slate-400 font-inter uppercase tracking-wider block">
                      Owner
                    </span>
                    <span className="text-xs font-rajdhani font-bold text-amber-300 uppercase">
                      {getTeamOwner(activePlayer.current_highest_bidder || auctionState?.highest_bidder_team_id)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR (25% Width / Col 3): TEAM VORTEX & RX KUDLA ───── */}
        <aside className="lg:col-span-3 w-full flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
          <FranchiseSidebarCard teamId="beta_strikers" teams={teams} players={players} />
          <FranchiseSidebarCard teamId="delta_phantoms" teams={teams} players={players} />
        </aside>

      </div>

      {/* ===================================================================== */}
      {/* 3. MINIMALIST FOOTER TICKER                                           */}
      {/* ===================================================================== */}
      <footer className="w-full py-1 px-6 text-center border-t border-white/5 bg-black/60 backdrop-blur-sm text-[9px] font-inter text-slate-500 tracking-wider flex-shrink-0 flex items-center justify-between">
        <span>DEMONS REIGN AUCTION SERIES 2026</span>
        <span className="text-amber-400 font-rajdhani font-black uppercase tracking-widest hidden sm:inline">
          REAL-TIME SYNCHRONIZED BROADCAST
        </span>
        <span>OBS RESOLUTION: 1920×1080</span>
      </footer>
    </div>
  );
}
