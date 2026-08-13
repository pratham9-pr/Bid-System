import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { useAllTeams } from '../hooks/useAllTeams';
import { useAuctionRoom } from '../hooks/useAuctionRoom';
import { PlayerControlCard } from '../components/PlayerControlCard';
import { TeamLeaderboard } from '../components/TeamLeaderboard';
import { AddPlayerForm } from '../components/AddPlayerForm';
import { TeamRosters } from '../components/TeamRosters';
import { seedDatabase, revealPlayer, hidePlayer } from '../services/auctionService';

export default function AdminPanel() {
  const navigate  = useNavigate();
  const { firebaseUser, signOut, isAdmin } = useAuth();

  // Admin tabs — role-gated
  const TABS = isAdmin
    ? ['Players', 'Add Player', 'Rosters', 'Leaderboard']
    : ['Players', 'Rosters', 'Leaderboard'];
  const [activeTab, setActiveTab] = useState('Players');
  const [seedMsg,   setSeedMsg]   = useState('');
  const [seeding,   setSeeding]   = useState(false);
  const [revealing, setRevealing] = useState(false);

  const { players, loading: pLoading } = useAllPlayers();
  const { teams,   loading: tLoading } = useAllTeams();
  const { activePlayer, auctionPaused, isRevealed } = useAuctionRoom(null);

  const handleSeed = async () => {
    if (!window.confirm('This will overwrite existing data. Continue?')) return;
    setSeeding(true);
    const result = await seedDatabase();
    setSeedMsg(result.success ? `✓ ${result.message}` : `✗ ${result.error}`);
    setSeeding(false);
    setTimeout(() => setSeedMsg(''), 4000);
  };

  const statusOrder = { active: 0, upcoming: 1, sold: 2 };
  const sortedPlayers = [...players].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
  );

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-3.5
                      border-b border-surface-600/40 bg-surface-900/80 backdrop-blur-sm
                      sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] bg-black flex-shrink-0">
            <img src="/demons_reign_logo.jpg" alt="Demons Reign" className="w-full h-full object-cover" />
          </div>
          <span className="font-rajdhani font-black text-white tracking-wider uppercase">Demons Reign Host</span>
          {activePlayer?.status === 'active' && (
            <span className="badge-active animate-pulse">
              Live: {activePlayer.in_game_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="admin-broadcast-btn"
            onClick={() => window.open('/broadcast', '_blank')}
            className="btn-ghost text-xs px-2.5 py-1.5 hidden sm:inline-flex items-center gap-1 text-fire-400 border border-fire-500/20 hover:border-fire-500/40"
            title="Open Live Broadcast Overlay in new window (OBS ready)"
          >
            📺 Stream Overlay
          </button>
          {isAdmin && (
            <button
              id="admin-seed-btn"
              onClick={handleSeed}
              disabled={seeding}
              className="btn-ghost text-xs px-3 py-2"
            >
              {seeding ? 'Seeding…' : '⚡ Seed Data'}
            </button>
          )}
          {firebaseUser ? (
            <button
              id="admin-signout-btn"
              onClick={async () => { await signOut(); navigate('/'); }}
              className="btn-ghost text-xs px-3 py-2"
            >
              Sign Out
            </button>
          ) : (
            <button
              id="admin-back-btn"
              onClick={() => navigate('/')}
              className="btn-ghost text-xs px-3 py-2"
            >
              ← Login
            </button>
          )}
        </div>
      </nav>

      {/* Seed flash message */}
      {seedMsg && (
        <div className={`px-5 py-2.5 text-xs font-inter border-b border-surface-600/40
          ${seedMsg.startsWith('✓') ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'}`}>
          {seedMsg}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 flex gap-1 border-b border-surface-600/40">
        {TABS.map((tab) => (
          <button
            key={tab}
            id={`tab-${tab.toLowerCase().replace(' ', '-')}`}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 font-rajdhani font-semibold text-sm tracking-wide
                        rounded-t-lg transition-all duration-150 -mb-px border-b-2
              ${activeTab === tab
                ? 'text-fire-400 border-fire-500 bg-fire-500/5'
                : 'text-muted border-transparent hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">

        {/* Players tab */}
        {activeTab === 'Players' && (
          <div className="max-w-4xl mx-auto space-y-3">
            {/* ── Active Player Stage Control Banner (Two-Step Reveal Flow) ──── */}
            {activePlayer && (
              <div className={`p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4
                ${isRevealed
                  ? 'bg-gradient-to-r from-fire-500/10 via-surface-900 to-gold-500/10 border-fire-500/40 shadow-[0_0_25px_rgba(249,115,22,0.2)]'
                  : 'bg-gradient-to-r from-amber-500/10 via-surface-900 to-orange-500/10 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-pulse'}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black flex-shrink-0">
                    <img
                      src={activePlayer.custom_card_url || activePlayer.photo_url || activePlayer.image_url || '/players/default.jpg'}
                      alt={activePlayer.name || activePlayer.in_game_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-rajdhani font-black uppercase tracking-widest text-slate-400">
                        STAGE CONTROLLER
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-rajdhani font-black uppercase tracking-wider
                        ${isRevealed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                        {isRevealed ? '✓ REVEALED ON STAGE' : '🔒 QUEUED (UNREVEALED)'}
                      </span>
                    </div>
                    <h3 className="font-rajdhani font-black text-xl text-white tracking-wide">
                      {activePlayer.name || activePlayer.in_game_name}
                    </h3>
                  </div>
                </div>

                {/* Stage Action Button */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {!isRevealed ? (
                    <button
                      id="admin-reveal-stage-btn"
                      onClick={async () => {
                        setRevealing(true);
                        await revealPlayer();
                        setRevealing(false);
                      }}
                      disabled={revealing}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-rajdhani font-black text-sm tracking-wider uppercase
                                 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black
                                 shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all
                                 flex items-center justify-center gap-2 animate-bounce"
                    >
                      <span>⚡</span>
                      <span>{revealing ? 'REVEALING…' : 'REVEAL PLAYER ON STAGE'}</span>
                    </button>
                  ) : (
                    <button
                      id="admin-hide-stage-btn"
                      onClick={async () => {
                        setRevealing(true);
                        await hidePlayer();
                        setRevealing(false);
                      }}
                      disabled={revealing}
                      className="px-3 py-1.5 rounded-lg text-xs font-inter text-slate-400 border border-surface-600 hover:text-white hover:bg-surface-800 transition-colors"
                      title="Hide player card back into mystery/standby state"
                    >
                      {revealing ? '…' : 'Hide Card'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4 pt-2">
              <h2 className="font-rajdhani font-bold text-lg text-white">
                Player Control
              </h2>
              <div className="flex gap-3 text-[11px] text-muted font-inter">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fire-500 inline-block" /> Active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gold-500 inline-block" /> Sold
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-surface-400 inline-block" /> Upcoming
                </span>
              </div>
            </div>

            {pLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
              </div>
            ) : sortedPlayers.length === 0 ? (
              <div className="card p-8 text-center text-muted font-inter text-sm">
                No players yet.{' '}
                {isAdmin && (
                  <button
                    className="text-fire-400 hover:underline"
                    onClick={() => setActiveTab('Add Player')}
                  >
                    Add your first player →
                  </button>
                )}
              </div>
            ) : (
              sortedPlayers.map((player) => (
                <PlayerControlCard
                  key={player.id}
                  player={player}
                  isActive={activePlayer?.id === player.id}
                  isRevealed={isRevealed}
                  auctionPaused={auctionPaused}
                />
              ))
            )}
          </div>
        )}

        {/* Rosters tab */}
        {activeTab === 'Rosters' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <h2 className="font-rajdhani font-bold text-lg text-white">Team Rosters</h2>
              <p className="text-xs text-muted font-inter mt-1">
                All players sold to each team — live view.
              </p>
            </div>
            <TeamRosters teams={teams} players={players} loading={tLoading || pLoading} />
          </div>
        )}

        {/* Add Player tab — admin only */}
        {activeTab === 'Add Player' && isAdmin && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-5">
              <h2 className="font-rajdhani font-bold text-lg text-white">Add New Player</h2>
              <p className="text-xs text-muted font-inter mt-1">
                Upload a photo to Firebase Storage and register the player in Firestore.
              </p>
            </div>
            <AddPlayerForm
              onSuccess={() => {
                // Switch back to Players tab after a short delay to show the new entry
                setTimeout(() => setActiveTab('Players'), 500);
              }}
            />
          </div>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'Leaderboard' && (
          <div className="max-w-2xl mx-auto">
            {tLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
              </div>
            ) : (
              <TeamLeaderboard teams={teams} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
