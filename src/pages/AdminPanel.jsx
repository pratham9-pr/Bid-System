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
import { getTeamDisplayName, TEAMS_CONFIG } from '../config/teamsConfig';
import { seedDatabase, revealPlayer, hidePlayer, startBidding, closeBidding, manualSellToTeam } from '../services/auctionService';

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
  // Manual Sell state
  const [sellTeamId, setSellTeamId] = useState('');
  const [selling,    setSelling]    = useState(false);
  const [sellMsg,    setSellMsg]    = useState(null); // { ok, text }

  const { players, loading: pLoading } = useAllPlayers();
  const { teams,   loading: tLoading } = useAllTeams();
  const { activePlayer, auctionPaused, isRevealed, biddingOpen } = useAuctionRoom(null);

  const handleSeed = async () => {
    if (!window.confirm('This will overwrite existing data. Continue?')) return;
    setSeeding(true);
    const result = await seedDatabase();
    setSeedMsg(result.success ? `✓ ${result.message}` : `✗ ${result.error}`);
    setSeeding(false);
    setTimeout(() => setSeedMsg(''), 4000);
  };

  const statusOrder = { active: 0, upcoming: 1, sold: 2, unsold: 3 };

  // Deduplicate all players by unique ID
  const uniquePlayersMap = new Map();
  for (const p of players || []) {
    if (p && p.id && !uniquePlayersMap.has(String(p.id))) {
      uniquePlayersMap.set(String(p.id), p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  // Captains are permanently locked — separate from the auctionable pool
  const captainPlayers  = uniquePlayers.filter((p) => p.is_captain === true);
  const sortedPlayers   = uniquePlayers
    .filter((p) => !p.is_captain)
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

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
              <div className={`p-4 rounded-2xl border transition-all duration-500 backdrop-blur-md flex flex-col gap-3
                ${
                  biddingOpen
                    // Floor is open — vivid emerald glow so host can't miss it
                    ? 'bg-gradient-to-r from-emerald-500/15 via-surface-900 to-teal-500/10 border-emerald-400/60 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
                    : isRevealed
                    // Revealed but floor locked
                    ? 'bg-gradient-to-r from-fire-500/10 via-surface-900 to-gold-500/10 border-fire-500/40 shadow-[0_0_25px_rgba(249,115,22,0.2)]'
                    // Queued unrevealed
                    : 'bg-gradient-to-r from-amber-500/10 via-surface-900 to-orange-500/10 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-pulse'
                }`}
              >
                {/* ── Row 1: Player identity + status badges */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {/* Player avatar with state ring */}
                    <div className={`w-12 h-12 rounded-xl overflow-hidden border bg-black flex-shrink-0 transition-all duration-500
                      ${
                        biddingOpen
                          ? 'border-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/30'
                          : isRevealed
                          ? 'border-fire-500/60 shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                          : 'border-white/20'
                      }`}>
                      <img
                        src={activePlayer.custom_card_url || activePlayer.photo_url || activePlayer.image_url || '/players/default.jpg'}
                        alt={activePlayer.name || activePlayer.in_game_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-rajdhani font-black uppercase tracking-widest text-slate-400">
                          STAGE CONTROLLER
                        </span>
                        {/* State badge — 3 modes */}
                        {biddingOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-rajdhani font-black uppercase tracking-wider
                                          bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            FLOOR OPEN · BIDDING LIVE
                          </span>
                        ) : isRevealed ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-rajdhani font-black uppercase tracking-wider
                                          bg-fire-500/20 text-fire-300 border border-fire-500/40">
                            ⚡ REVEALED · FLOOR LOCKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-rajdhani font-black uppercase tracking-wider
                                          bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🔒 QUEUED (UNREVEALED)
                          </span>
                        )}
                      </div>
                      <h3 className="font-rajdhani font-black text-xl text-white tracking-wide">
                        {activePlayer.name || activePlayer.in_game_name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Action Buttons */}
                <div className="flex items-center gap-2 w-full justify-end flex-wrap">
                  {/* Step 1: Reveal / Hide Card */}
                  {!isRevealed ? (
                    <button
                      id="admin-reveal-stage-btn"
                      onClick={async () => {
                        setRevealing(true);
                        await revealPlayer(activePlayer?.id);
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
                    <>
                      {/* Step 2: Start Bidding (only appears after reveal) */}
                      {!biddingOpen ? (
                        <button
                          id="admin-start-bidding-btn"
                          onClick={async () => {
                            setRevealing(true);
                            await startBidding();
                            setRevealing(false);
                          }}
                          disabled={revealing}
                          className="px-6 py-2.5 rounded-xl font-rajdhani font-black text-sm tracking-wider uppercase
                                     bg-gradient-to-r from-emerald-500 to-teal-500 text-black
                                     shadow-[0_0_25px_rgba(16,185,129,0.55)] hover:brightness-110 active:scale-95 transition-all
                                     flex items-center justify-center gap-2 animate-pulse"
                          title="Open the bidding floor — team owners can now place bids"
                        >
                          <span>🚦</span>
                          <span>{revealing ? 'OPENING…' : 'START BIDDING'}</span>
                        </button>
                      ) : (
                        <button
                          id="admin-close-bidding-btn"
                          onClick={async () => {
                            setRevealing(true);
                            await closeBidding();
                            setRevealing(false);
                          }}
                          disabled={revealing}
                          className="px-4 py-2 rounded-xl font-rajdhani font-black text-xs tracking-wider uppercase
                                     bg-emerald-500/20 text-emerald-400 border border-emerald-500/40
                                     hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all flex items-center gap-1.5"
                          title="Close the bidding floor"
                        >
                          <span>🔒</span>
                          <span>{revealing ? '…' : 'Floor Open — Lock Bids'}</span>
                        </button>
                      )}

                      {/* Hide Card (secondary) */}
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Manual Sell Panel ─────────────────────────────────────────── */}
            {activePlayer && activePlayer.status !== 'sold' && (
              <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-r from-gold-500/5 via-surface-900 to-gold-500/5
                              shadow-[0_0_20px_rgba(245,158,11,0.08)] overflow-hidden">
                {/* Header strip */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gold-500/20 bg-gold-500/5">
                  <span className="text-base">🏷️</span>
                  <span className="font-rajdhani font-black text-xs uppercase tracking-widest text-gold-400">Manual Sell Override</span>
                  <div className="flex-1 h-px bg-gold-500/15" />
                  <span className="text-[9px] text-muted font-inter">
                    Assign directly — bypasses bidding floor
                  </span>
                </div>

                <div className="px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Player context pill */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800/60 border border-surface-600/40 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0">
                      <img
                        src={activePlayer.custom_card_url || activePlayer.photo_url || activePlayer.image_url || '/players/default.jpg'}
                        alt={activePlayer.in_game_name || activePlayer.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/players/default.jpg'; }}
                      />
                    </div>
                    <div>
                      <p className="font-rajdhani font-black text-xs text-white leading-none">
                        {activePlayer.in_game_name || activePlayer.name}
                      </p>
                      <p className="text-[9px] text-gold-400 font-inter mt-0.5">
                        {activePlayer.current_bid > 0
                          ? `Current bid: ₣${activePlayer.current_bid.toLocaleString()}`
                          : `Base price: ₣${(activePlayer.base_price || 0).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Team selector */}
                  <div className="flex-1 relative">
                    <select
                      id="admin-manual-sell-team-select"
                      value={sellTeamId}
                      onChange={(e) => { setSellTeamId(e.target.value); setSellMsg(null); }}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl font-rajdhani font-bold text-sm text-white
                                 bg-surface-800 border border-gold-500/40 focus:border-gold-400 focus:outline-none
                                 hover:border-gold-400 transition-colors cursor-pointer pr-10
                                 disabled:opacity-40"
                      disabled={selling}
                    >
                      <option value="" disabled className="bg-surface-900 text-muted">
                        — Select a Franchise Team —
                      </option>
                      {(teams.length > 0 ? teams : TEAMS_CONFIG)
                        .filter((t) => {
                          const clean = String(t.id).toLowerCase();
                          return clean !== 'gamma_reapers' && clean !== 'delta_phantoms' && clean !== 'team_gamma' && clean !== 'team_delta';
                        })
                        .map((t) => (
                          <option key={t.id} value={t.id} className="bg-surface-900 text-white font-rajdhani font-bold">
                            {getTeamDisplayName(t.id, t.team_name || t.name)}
                          </option>
                        ))}
                    </select>
                    {/* Dropdown chevron */}
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Sell button */}
                  <button
                    id="admin-manual-sell-btn"
                    disabled={!sellTeamId || selling}
                    onClick={async () => {
                      if (!sellTeamId || !activePlayer) return;
                      const selectedTeam = teams.find((t) => t.id === sellTeamId);
                      if (!selectedTeam) return;
                      setSelling(true);
                      setSellMsg(null);
                      const result = await manualSellToTeam(
                        activePlayer.id,
                        sellTeamId,
                        getTeamDisplayName(selectedTeam.id, selectedTeam.team_name || selectedTeam.name),
                        activePlayer.current_bid || activePlayer.base_price || 0,
                      );
                      setSelling(false);
                      if (result.success) {
                        setSellMsg({
                          ok: true,
                          text: `✓ ${result.playerName} sold to ${result.teamName} for ₣${result.sellPrice.toLocaleString()} FC`,
                        });
                        setSellTeamId('');
                        setTimeout(() => setSellMsg(null), 5000);
                      } else {
                        setSellMsg({ ok: false, text: `✗ ${result.error}` });
                      }
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl
                               font-rajdhani font-black text-sm tracking-wider uppercase transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed
                               enabled:bg-gradient-to-r enabled:from-gold-500 enabled:to-amber-500 enabled:text-black
                               enabled:shadow-[0_0_20px_rgba(245,158,11,0.4)]
                               enabled:hover:brightness-110 enabled:active:scale-95"
                    title="Manually assign this player to the selected franchise at their current or base price"
                  >
                    {selling ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                        <span>Selling…</span>
                      </>
                    ) : (
                      <>
                        <span>🏷️</span>
                        <span>Sell to Team</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Result message */}
                {sellMsg && (
                  <div className={`px-4 py-2 text-xs font-inter border-t transition-all
                    ${sellMsg.ok
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {sellMsg.text}
                  </div>
                )}
              </div>
            )}

            {/* ── LOCKED CAPTAINS SECTION ─────────────────────────────── */}
            {captainPlayers.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-surface-900 to-amber-500/5 overflow-hidden mb-1">
                {/* Section header */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
                  <span className="text-sm">🔒</span>
                  <span className="font-rajdhani font-black text-xs uppercase tracking-widest text-amber-400">Locked Captains — Excluded from Bidding Pool</span>
                  <div className="flex-1 h-px bg-amber-500/15" />
                  <span className="text-[9px] text-muted font-inter">{captainPlayers.length} appointed</span>
                </div>

                {/* Captain rows */}
                <div className="divide-y divide-surface-700/40">
                  {captainPlayers.map((cap) => (
                    <div key={cap.id} className="flex items-center gap-3 px-4 py-2.5">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-amber-400/60 flex-shrink-0 bg-black">
                        {cap.photo_url || cap.custom_card_url ? (
                          <img
                            src={cap.custom_card_url || cap.photo_url}
                            alt={cap.in_game_name || cap.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/players/default.jpg'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-rajdhani font-bold text-sm text-amber-400">
                            {(cap.in_game_name || cap.name || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-rajdhani font-black text-sm text-white truncate">
                            {cap.in_game_name || cap.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[8px] font-rajdhani font-black uppercase tracking-wider">
                            👑 CAPTAIN · IGL
                          </span>
                        </div>
                        <div className="text-[9px] text-amber-400/70 font-inter">
                          Locked → {cap.current_highest_bidder_name || cap.sold_to_team_id || 'Team'}
                          <span className="text-muted ml-2">· Cannot be staged for auction</span>
                        </div>
                      </div>

                      {/* Remove captain action */}
                      <PlayerControlCard
                        key={`captain-row-${cap.id}`}
                        player={cap}
                        isActive={false}
                        isRevealed={false}
                        auctionPaused={auctionPaused}
                        teams={teams}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4 pt-2">
              <h2 className="font-rajdhani font-bold text-lg text-white">
                Auction Pool
                <span className="ml-2 text-sm text-muted font-inter font-normal">
                  ({sortedPlayers.length} players)
                </span>
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
                No auctionable players yet.{' '}
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
                  teams={teams}
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
