import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useAuctionRoom } from '../hooks/useAuctionRoom';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { PlayerRevealCard } from '../components/PlayerRevealCard';
import { getTeamTheme } from '../config/teamsConfig';
import { getTeamFullRoster } from '../config/franchiseCaptains';
import { MAX_BID_LIMIT } from '../services/auctionService';
import { useTournament } from '../hooks/useTournament';
import { TournamentContext, useTournamentContext } from '../context/TournamentContext';

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
function FranchiseSidebarCard({ team, players }) {
  if (!team) return null;
  const teamId = team.id;
  const displayName = team.name || team.team_name || 'Team';
  const ownerName = team.owner_name || team.owner || '—';
  const logoUrl = team.logo_url || team.logo || null;
  const balance = team.fire_coin_balance ?? team.purse ?? 40000;

  const { slots = [null, null, null, null], totalCount = 0, remainingSlots = 4, isFull = false } = getTeamFullRoster(teamId, players);
  const themeClasses = getTeamTheme(team.id);

  return (
    <div
      className={`w-full flex-1 flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all duration-300 min-h-0 ${themeClasses.card} ${isFull ? 'ring-1 ring-gold-400/40' : ''}`}
    >
      {/* ── Card Header (Logo, Name, Owner, Balance) ────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-white/20 bg-black/80 flex-shrink-0 flex items-center justify-center p-0.5 shadow-md">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-rajdhani font-bold text-xs text-amber-400">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
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
          const isCaptain = idx === 0 && player && (player.is_captain === true || player.status === 'captain');

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

import PointsTableLeaderboard from './PointsTableLeaderboard';

// ─────────────────────────────────────────────────────────────────────────────
//  BroadcastOverlay Component (Three-Column Fullscreen 25% | 50% | 25% + Standings)
// ─────────────────────────────────────────────────────────────────────────────
export default function BroadcastOverlay() {
  const { id } = useParams();
  const { activePlayer, auctionPaused, isRevealed, auctionState } = useAuctionRoom(null);
  const { teams } = useAllTeams(id);
  const { players } = useAllPlayers(id);

  // Fetch tournament using active :id from URL, or fallback to general active tournament
  const { tournament: routeTournament, loading: tournamentLoading } = useTournament(id);
  const { tournament: contextTournament } = useTournamentContext();
  const tournament = routeTournament || contextTournament || null;
  const tournamentName = tournament?.name || '';

  const [transparentBg, setTransparentBg] = useState(false);
  const [activeView, setActiveView] = useState('auction'); // 'auction' | 'standings'

  // Update document title
  React.useEffect(() => {
    document.title = tournamentName ? `${tournamentName} — Live Broadcast` : 'Live Broadcast';
    return () => { document.title = 'Live Broadcast'; };
  }, [tournamentName]);

  // Synchronize remote broadcast view if broadcast by host
  React.useEffect(() => {
    if (auctionState?.broadcast_view) {
      if (auctionState.broadcast_view === 'standings' || auctionState.broadcast_view === 'leaderboard') {
        setActiveView('standings');
      } else if (auctionState.broadcast_view === 'auction') {
        setActiveView('auction');
      }
    }
  }, [auctionState?.broadcast_view]);

  const isSold = activePlayer?.status === 'sold';

  if (!teams || teams.length === 0) {
    return <div className="bg-black h-screen w-screen"></div>;
  }

  return (
    <div className="bg-black h-screen w-screen p-4 text-white overflow-auto flex flex-wrap gap-4">
      {teams.map((team) => (
        <div key={team.id} className="p-4 border border-white/20 rounded-lg bg-surface-900/80">
          <h2 className="text-lg font-bold text-amber-400">{team.name || team.team_name}</h2>
          <p className="text-sm text-slate-400">Owner: {team.owner_name || team.owner}</p>
          <p className="text-sm text-gold-400">Balance: ₣{(team.fire_coin_balance ?? team.purse ?? 0).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
