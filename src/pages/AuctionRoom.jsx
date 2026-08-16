import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuctionRoom } from '../hooks/useAuctionRoom';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { ActivePlayerCard }   from '../components/ActivePlayerCard';
import { BidPanel }           from '../components/BidPanel';
import { MyBalanceWidget }    from '../components/MyBalanceWidget';
import { PlayersQueue }       from '../components/PlayersQueue';
import { CompetitorSidebar }  from '../components/CompetitorSidebar';
import { getTeamDisplayName } from '../config/teamsConfig';
import { Notification }       from '../components/Notification';

export default function AuctionRoom() {
  const { team, currentUser, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const effectiveTeam = team || (currentUser?.role === 'bidder' ? currentUser : null);

  const { activePlayer, team: liveTeam, auctionPaused, isRevealed, biddingOpen, loading, error } = useAuctionRoom(effectiveTeam?.id || effectiveTeam?.teamId);
  const { auctionPlayers } = useAllPlayers();
  const [notification, setNotification] = useState(null);

  const handleNotify  = useCallback((n) => setNotification(n), []);
  const handleDismiss = useCallback(() => setNotification(null), []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    if (!authLoading && !effectiveTeam) {
      navigate('/');
    }
  }, [effectiveTeam, authLoading, navigate]);

  if (authLoading || !effectiveTeam) {
    return (
      <div className="min-h-screen bg-[#06070c] flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
      </div>
    );
  }

  // Live Firestore/Supabase doc gives real-time balance; fall back to auth-cached team
  const displayTeam = liveTeam || effectiveTeam;

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">

      {/* ── Top Nav ────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-3.5
                      border-b border-surface-600/40 bg-surface-900/80 backdrop-blur-sm
                      sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] bg-black flex-shrink-0">
            <img src="/demons_reign_logo.jpg" alt="Demons Reign" className="w-full h-full object-cover" />
          </div>
          <span className="font-rajdhani font-black text-white tracking-wider hidden sm:block uppercase">
            Demons Reign Auction
          </span>
          {activePlayer && isRevealed && !biddingOpen && !auctionPaused && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px]
                             font-rajdhani font-bold uppercase tracking-widest
                             bg-amber-500/15 text-amber-300 border border-amber-500/25 hidden md:inline-flex animate-pulse">
              🔒 Waiting for Host…
            </span>
          )}
          {activePlayer && isRevealed && biddingOpen && !auctionPaused && (
            <span className="badge-active hidden md:inline-flex animate-pulse">Live · Floor Open</span>
          )}
          {activePlayer && !isRevealed && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px]
                             font-rajdhani font-bold uppercase tracking-widest
                             bg-amber-500/15 text-amber-400 border border-amber-500/25 hidden md:inline-flex animate-pulse">
              🔒 Locked
            </span>
          )}
          {auctionPaused && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px]
                             font-rajdhani font-bold uppercase tracking-widest
                             bg-amber-500/15 text-amber-400 border border-amber-500/25 hidden md:inline-flex">
              ⏸ Paused
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            id="open-broadcast-btn"
            onClick={() => window.open('/broadcast', '_blank')}
            className="btn-ghost text-xs px-2.5 py-1.5 hidden sm:inline-flex items-center gap-1 text-fire-400 border border-fire-500/20 hover:border-fire-500/40"
            title="Open Live Broadcast Overlay in new window (OBS ready)"
          >
            📺 Stream Overlay
          </button>
          <span className="font-rajdhani font-semibold text-sm text-slate-300 hidden sm:block">
            {getTeamDisplayName(displayTeam?.id, displayTeam?.team_name || displayTeam?.name)}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                          bg-surface-700 border border-surface-500/50">
            <span className="text-gold-400 font-rajdhani font-bold text-sm">₣</span>
            <span className="font-rajdhani font-bold text-sm text-white tabular-nums">
              {(displayTeam?.fire_coin_balance ?? 0).toLocaleString()}
            </span>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-ghost text-xs px-3 py-2"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main 3-column layout ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left — Player Queue */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0
                          border-b lg:border-b-0 lg:border-r border-surface-600/40
                          lg:overflow-y-auto">
          <div className="p-4 h-full lg:min-h-0">
            <PlayersQueue
              players={auctionPlayers}
              activePlayerId={activePlayer?.id}
            />
          </div>
        </aside>

        {/* Center — Active Player */}
        <main className="flex-1 p-4 lg:p-6 flex flex-col gap-5 overflow-y-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl border-2 border-fire-500/30
                                border-t-fire-500 animate-spin" />
                <p className="text-muted font-inter text-sm">Connecting to auction…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="card p-8 text-center max-w-md">
                <p className="text-red-400 font-inter text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <ActivePlayerCard player={activePlayer} isRevealed={isRevealed} />
            </div>
          )}
        </main>

        {/* Right — Bid controls + Competitor HUD */}
        <aside className="w-full lg:w-80 lg:flex-shrink-0
                          border-t lg:border-t-0 lg:border-l border-surface-600/40
                          overflow-y-auto">
          <div className="p-4 flex flex-col gap-4">
            <MyBalanceWidget team={displayTeam} />
            <BidPanel
              activePlayer={activePlayer}
              team={displayTeam}
              onNotify={handleNotify}
              auctionPaused={auctionPaused}
              isRevealed={isRevealed}
              biddingOpen={biddingOpen}
            />
            {/* ── Competitor Wallet HUD ──────────────────────────────────── */}
            <CompetitorSidebar currentTeamId={displayTeam?.id} />
          </div>
        </aside>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <Notification notification={notification} onDismiss={handleDismiss} />
    </div>
  );
}
