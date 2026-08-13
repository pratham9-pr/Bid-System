import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import {
  setPlayerActive,
  revealPlayer,
  forcePlayerSold,
  resetPlayer,
  markUnsold,
  toggleAuctionPause,
  activateNextPlayer,
  appointTeamCaptain,
  removeTeamCaptain,
  manualSellToTeam,
} from '../services/auctionService';
import { RoleBadge } from './RoleBadge';

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ status, isCaptain }) => {
  if (isCaptain) {
    return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />;
  }
  const colors = {
    upcoming: 'bg-surface-400',
    active:   'bg-fire-500',
    sold:     'bg-gold-500',
    unsold:   'bg-amber-600',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status] ?? 'bg-muted'}`} />
  );
};

// ─── Tiny icon buttons used in the host row ───────────────────────────────────
const PauseIcon  = ({ paused }) => paused
  ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         className="w-3.5 h-3.5">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         className="w-3.5 h-3.5">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
    </svg>
  );

const SkipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       className="w-3.5 h-3.5">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" strokeLinejoin="round"/>
    <line x1="19" y1="5" x2="19" y2="19" strokeLinecap="round"/>
  </svg>
);

const TEAMS_LIST = [
  { id: 'alpha_wolves', name: 'Alpha Wolves' },
  { id: 'beta_strikers', name: 'Beta Strikers' },
  { id: 'gamma_reapers', name: 'Gamma Reapers' },
  { id: 'delta_phantoms', name: 'Delta Phantoms' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  PlayerControlCard — displays a single player with:
//   • Per-player controls: Set Active, Reveal, Force Sell, Reset, Mark Unsold, Appoint Captain
//   • Global host controls: Pause/Resume Auction, Next Player
// ─────────────────────────────────────────────────────────────────────────────
export function PlayerControlCard({ player, isActive, isRevealed, auctionPaused, teams = [] }) {
  const [loading, setLoading]           = useState('');
  const [msg, setMsg]                   = useState('');
  const [msgOk, setMsgOk]               = useState(false);
  const [showCaptainMenu, setShowCaptainMenu] = useState(false);
  const [showSellMenu, setShowSellMenu] = useState(false);
  const [sellTarget, setSellTarget]     = useState('');

  const isCaptain = Boolean(player.is_captain || player.status === 'captain');

  const run = async (action, fn) => {
    setLoading(action);
    setMsg('');
    const result = await fn();
    setLoading('');
    if (result.success) {
      const info = result.playerName ? `→ ${result.playerName}` : result.message || 'Updated';
      setMsgOk(true);
      setMsg(info);
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsgOk(false);
      setMsg(result.error || 'Error');
    }
  };

  const isLoading = (key) => loading === key;

  return (
    <div
      className={`card relative transition-all duration-300 overflow-hidden
        ${isCaptain ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-surface-800 to-surface-900 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
        : isActive ? 'border-fire-500/50 bg-surface-700/60 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
        : 'border-surface-600/40 hover:border-surface-500/60'}`}
    >
      {/* Top accent line */}
      {isCaptain && <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 w-full" />}
      {isActive && !isCaptain && <div className="h-1 bg-fire-gradient w-full" />}

      {/* Main player info & action row */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Photo + Name + Role */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative
              ${isCaptain
                ? 'border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'border border-surface-500/40 bg-surface-800'}`}
          >
            {player.photo_url || player.custom_card_url || player.image_url ? (
              <img
                src={player.custom_card_url || player.photo_url || player.image_url}
                alt={player.in_game_name || player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/players/default.jpg';
                }}
              />
            ) : (
              <div className="w-full h-full bg-surface-700 flex items-center justify-center font-rajdhani font-bold text-lg text-gold-400">
                {(player.in_game_name || player.name || 'P').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusDot status={player.status} isCaptain={isCaptain} />
              <span className="font-rajdhani font-bold text-sm text-white truncate">
                {player.in_game_name || player.name}
              </span>

              {/* 👑 Captain Badge */}
              {isCaptain && (
                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-rajdhani font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <span>👑</span>
                  <span>CAPTAIN (IGL)</span>
                </span>
              )}

              {isActive && <span className="badge-active text-[9px] px-1.5 py-0.5">Live</span>}
              
              {player.status === 'unsold' && !isCaptain && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-rajdhani font-bold
                                 bg-amber-500/10 text-amber-500 border border-amber-500/25 uppercase tracking-wide">
                  Unsold
                </span>
              )}

              {/* Role badge (Defaulted to IGL if Captain) */}
              <RoleBadge role={isCaptain ? 'IGL' : player.role || 'Rusher'} size="xs" />
            </div>

            <div className="flex gap-3 mt-0.5">
              <span className="text-[10px] text-muted font-inter">
                Base ₣{player.base_price?.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted font-inter">
                Max ₣{player.max_limit?.toLocaleString()}
              </span>
            </div>

            {player.current_highest_bidder && (
              <div className="text-[10px] font-inter mt-0.5">
                <span className="text-gold-400 font-semibold">{player.current_highest_bidder_name}</span>
                {isCaptain ? (
                  <span className="text-amber-400 font-rajdhani font-bold"> · 🔒 Locked Captain</span>
                ) : (
                  <span className="text-muted"> @ ₣{player.current_bid?.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Per-player action buttons ─────────────────────────────────── */}
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end items-center">
          {/* 1. Appoint Captain Selector / Remove Captain */}
          {isCaptain ? (
            <button
              id={`admin-remove-captain-${player.id}`}
              onClick={() => run('removeCaptain', () => removeTeamCaptain(player.id))}
              disabled={!!loading}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-bold uppercase tracking-wider
                         bg-amber-500/15 text-amber-300 border border-amber-500/40
                         hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all cursor-pointer"
              title="Remove captaincy from this player"
            >
              {isLoading('removeCaptain') ? '…' : '👑 Remove Captain'}
            </button>
          ) : (
            <div className="relative">
              <button
                id={`admin-appoint-btn-${player.id}`}
                onClick={() => setShowCaptainMenu((prev) => !prev)}
                disabled={!!loading}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-bold uppercase tracking-wider
                           bg-amber-500/15 text-amber-300 border border-amber-500/30
                           hover:bg-amber-500/25 hover:border-amber-400 transition-all flex items-center gap-1 cursor-pointer"
                title="Appoint this player as a franchise Captain (automatically marks as IGL & locks into roster)"
              >
                <span>👑</span>
                <span>{isLoading('appoint') ? '…' : 'Appoint Captain'}</span>
              </button>

              {/* Captain Appointment Dropdown — scrollable, uses live teams prop */}
              {showCaptainMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-900
                               border border-amber-500/50 shadow-[0_8px_40px_rgba(0,0,0,0.6)] z-[9999]
                               animate-fade-in backdrop-blur-md overflow-hidden">

                  {/* Header */}
                  <div className="px-3 py-2.5 border-b border-surface-700/60 bg-amber-500/8 flex items-center gap-2">
                    <span className="text-amber-400">👑</span>
                    <div>
                      <p className="font-rajdhani font-black text-xs text-amber-300 uppercase tracking-widest leading-none">
                        Appoint as IGL Captain
                      </p>
                      <p className="text-[9px] text-muted font-inter mt-0.5">
                        Locks into roster · excluded from bidding
                      </p>
                    </div>
                  </div>

                  {/* Scrollable team list */}
                  <div className="max-h-64 overflow-y-auto overscroll-contain p-1.5 space-y-0.5">
                    {(teams.length > 0 ? teams : TEAMS_LIST.map(t => ({ id: t.id, team_name: t.name }))).map((t) => {
                      const teamName = t.team_name || t.name || t.id;
                      const initials = teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setShowCaptainMenu(false);
                            run('appoint', () => appointTeamCaptain(player.id, t.id, teamName));
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-rajdhani font-bold
                                     text-white hover:bg-amber-500/20 hover:text-amber-200
                                     transition-all flex items-center gap-2.5 group cursor-pointer"
                        >
                          {/* Team avatar chip */}
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30
                                          flex items-center justify-center text-[10px] font-rajdhani font-black text-amber-400
                                          group-hover:bg-amber-500/30 transition-colors flex-shrink-0">
                            {initials}
                          </div>
                          <span className="flex-1 truncate">{teamName}</span>
                          <span className="text-[9px] text-amber-500/70 font-inter flex-shrink-0">IGL</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cancel footer */}
                  <div className="border-t border-surface-700/40 px-2 py-1.5">
                    <button
                      onClick={() => setShowCaptainMenu(false)}
                      className="w-full py-1 text-[9px] text-muted font-inter hover:text-white transition-colors rounded-lg hover:bg-surface-700/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Set Active (Queue on stage without revealing) */}
          {!isCaptain && (
            <button
              id={`admin-activate-${player.id}`}
              onClick={() => run('active', () => setPlayerActive(player.id))}
              disabled={!!loading || (player.status === 'active' && !isRevealed)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wide
                         bg-fire-500/15 text-fire-400 border border-fire-500/30
                         hover:bg-fire-500/25 disabled:opacity-30 transition-all active:scale-95"
              title="Queue this player on stage in standby mode (hidden)"
            >
              {isLoading('active') ? '…' : 'Set Active'}
            </button>
          )}

          {/* 3. REVEAL PLAYER Button */}
          {!isCaptain && (
            <button
              id={`admin-reveal-${player.id}`}
              onClick={() =>
                run('reveal', async () => {
                  // Mark player active — captains are guarded upstream, but
                  // defensively refuse to stage a captain here too
                  if (player.is_captain) return { success: false, error: 'Captains cannot be staged for bidding.' };
                  await supabase.from('players').update({ status: 'active' }).eq('id', player.id);
                  await supabase.from('players').update({ status: 'upcoming' }).neq('id', player.id).eq('status', 'active');
                  const response = await supabase
                    .from('auction_state')
                    .update({
                      active_player_id: player.id,
                      is_revealed:      true,
                      bidding_open:     false,   // floor locked until host clicks Start Bidding
                      status:           'bidding',
                    })
                    .eq('id', 1);
                  if (response.error) return { success: false, error: response.error.message };
                  return { success: true, playerName: player.in_game_name || player.name };
                })
              }
              disabled={!!loading}
              className="px-3 py-1.5 rounded-lg text-[10px] font-inter font-black uppercase tracking-wider
                         bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]
                         hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-rajdhani text-xs"
              title="Drop the player card on the live broadcast stage and open bidding immediately"
            >
              <span>⚡</span>
              <span>{isLoading('reveal') ? 'REVEALING…' : 'REVEAL PLAYER'}</span>
            </button>
          )}

          {/* 4. Force Sell */}
          {!isCaptain && (
            <button
              id={`admin-sell-${player.id}`}
              onClick={() => run('sold', () => forcePlayerSold(player.id))}
              disabled={!!loading || player.status !== 'active' || !player.current_highest_bidder}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wide
                         bg-gold-500/15 text-gold-400 border border-gold-500/30
                         hover:bg-gold-500/25 disabled:opacity-30 transition-all active:scale-95"
            >
              {isLoading('sold') ? '…' : 'Force Sell'}
            </button>
          )}

          {/* 5. Quick Sell → Team (Manual Override) */}
          {!isCaptain && player.status !== 'sold' && teams.length > 0 && (
            <div className="relative">
              <button
                id={`admin-quicksell-toggle-${player.id}`}
                onClick={() => { setShowSellMenu((prev) => !prev); setSellTarget(''); }}
                disabled={!!loading}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-bold uppercase tracking-wider transition-all
                  ${showSellMenu
                    ? 'bg-gold-500/30 text-gold-300 border border-gold-400/60'
                    : 'bg-gold-500/15 text-gold-400 border border-gold-500/30 hover:bg-gold-500/25'}`}
                title="Manually sell this player to a specific team"
              >
                {isLoading('quickSell') ? '…' : '🏷️ Sell ▾'}
              </button>

              {/* Inline sell dropdown */}
              {showSellMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-surface-900 border border-gold-500/40 shadow-2xl p-2 z-50 animate-fade-in backdrop-blur-md">
                  <div className="text-[9px] font-rajdhani font-black text-gold-400 uppercase tracking-wider mb-1.5 px-1">
                    Assign to Franchise:
                  </div>
                  <select
                    value={sellTarget}
                    onChange={(e) => setSellTarget(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg font-rajdhani font-bold text-xs text-white
                               bg-surface-800 border border-gold-500/30 focus:border-gold-400 focus:outline-none cursor-pointer mb-2"
                  >
                    <option value="" disabled className="bg-surface-900">— Select Team —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-surface-900">
                        {t.team_name || t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!sellTarget) return;
                      const team = teams.find((t) => t.id === sellTarget);
                      if (!team) return;
                      setShowSellMenu(false);
                      run('quickSell', () =>
                        manualSellToTeam(
                          player.id,
                          sellTarget,
                          team.team_name || team.name,
                          player.current_bid || player.base_price || 0,
                        )
                      );
                    }}
                    disabled={!sellTarget}
                    className="w-full py-1.5 rounded-lg font-rajdhani font-black text-xs tracking-wider uppercase
                               bg-gradient-to-r from-gold-500 to-amber-500 text-black
                               hover:brightness-110 active:scale-95 transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓ Confirm Sell
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 6. Mark Unsold */}
          {!isCaptain && (
            <button
              id={`admin-unsold-${player.id}`}
              onClick={() => run('unsold', () => markUnsold(player.id))}
              disabled={!!loading || player.status !== 'active'}
              title="Mark player as unsold and clear the active slot"
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wide
                         bg-amber-500/15 text-amber-400 border border-amber-500/30
                         hover:bg-amber-500/25 disabled:opacity-30 transition-all active:scale-95"
            >
              {isLoading('unsold') ? '…' : 'Mark Unsold'}
            </button>
          )}

          {/* 7. Reset */}
          <button
            id={`admin-reset-${player.id}`}
            onClick={() => run('reset', () => resetPlayer(player.id))}
            disabled={!!loading || player.status === 'upcoming'}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wide
                       bg-surface-600 text-muted border border-surface-500/60
                       hover:bg-surface-500 hover:text-white disabled:opacity-30 transition-all active:scale-95"
          >
            {isLoading('reset') ? '…' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Message strip */}
      {msg && (
        <div className={`px-4 py-1.5 text-xs font-inter border-t ${msgOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {msg}
        </div>
      )}

      {/* ── Host control row ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pb-3 border-t border-surface-600/20 pt-3">
        <span className="text-[9px] text-muted font-inter uppercase tracking-widest flex-shrink-0">
          Host Controls
        </span>
        <div className="flex-1 h-px bg-surface-600/30" />

        {/* Pause / Resume */}
        <button
          id="admin-global-pause-btn"
          onClick={() => run('pause', toggleAuctionPause)}
          disabled={!!loading}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wider transition-all
            ${auctionPaused
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-surface-700 text-muted hover:text-white hover:bg-surface-600 border border-surface-600'}`}
        >
          <PauseIcon paused={auctionPaused} />
          <span>{auctionPaused ? 'Resume Auction' : 'Pause Auction'}</span>
        </button>

        {/* Next Player */}
        <button
          id="admin-global-next-btn"
          onClick={() => run('next', activateNextPlayer)}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-inter font-semibold uppercase tracking-wider
                     bg-surface-700 text-muted hover:text-white hover:bg-surface-600 border border-surface-600 transition-all"
        >
          <SkipIcon />
          <span>Next Player</span>
        </button>
      </div>
    </div>
  );
}

export default PlayerControlCard;
