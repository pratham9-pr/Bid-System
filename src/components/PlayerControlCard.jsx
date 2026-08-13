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
} from '../services/auctionService';
import { RoleBadge } from './RoleBadge';

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
//  PlayerControlCard — displays a single player with:
//   • Per-player controls: Set Active, Reveal, Force Sell, Reset, Mark Unsold
//   • Global host controls: Pause/Resume Auction, Next Player
// ─────────────────────────────────────────────────────────────────────────────
export function PlayerControlCard({ player, isActive, isRevealed, auctionPaused }) {
  const [loading, setLoading] = useState('');
  const [msg, setMsg]         = useState('');
  const [msgOk, setMsgOk]     = useState(false);

  const run = async (action, fn) => {
    setLoading(action);
    setMsg('');
    const result = await fn();
    setLoading('');
    if (result.success) {
      const info = result.playerName ? `→ ${result.playerName}` : '';
      if (info) { setMsgOk(true); setMsg(info); setTimeout(() => setMsg(''), 3000); }
    } else {
      setMsgOk(false);
      setMsg(result.error || 'Error');
    }
  };

  const isLoading = (key) => loading === key;

  return (
    <div className={`card overflow-hidden transition-all duration-200
      ${isActive ? 'border-fire-500/40 bg-fire-500/5' : 'hover:bg-surface-700/40'}`}>

      {/* ── Main row: avatar + info + per-player buttons ───────────────── */}
      <div className="flex items-center gap-3 p-4">

        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden
          ${player.status === 'active' ? 'ring-2 ring-fire-500/50' : ''}
          ${player.status === 'sold'   ? 'ring-2 ring-gold-500/40' : ''}
          ${player.status === 'unsold' ? 'ring-2 ring-amber-600/40' : ''}`}>
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.in_game_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center
              font-rajdhani font-black text-lg
              ${player.status === 'active'   ? 'bg-fire-500/15 text-fire-400'
              : player.status === 'sold'     ? 'bg-gold-500/15 text-gold-400'
              : player.status === 'unsold'   ? 'bg-amber-600/15 text-amber-500'
              : 'bg-surface-600 text-muted'}`}>
              {player.in_game_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusDot status={player.status} />
            <span className="font-rajdhani font-bold text-sm text-white truncate">
              {player.in_game_name}
            </span>
            {isActive && <span className="badge-active text-[9px] px-1.5 py-0.5">Live</span>}
            {player.status === 'unsold' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-rajdhani font-bold
                               bg-amber-500/10 text-amber-500 border border-amber-500/25 uppercase tracking-wide">
                Unsold
              </span>
            )}
            {player.role && <RoleBadge role={player.role} size="xs" />}
          </div>
          <div className="flex gap-3 mt-0.5">
            <span className="text-[10px] text-muted font-inter">
              Base ₣{player.base_price.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted font-inter">
              Max ₣{player.max_limit.toLocaleString()}
            </span>
          </div>
          {player.current_highest_bidder && (
            <div className="text-[10px] font-inter mt-0.5">
              <span className="text-gold-400">{player.current_highest_bidder_name}</span>
              <span className="text-muted"> @ ₣{player.current_bid.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* ── Per-player action buttons ─────────────────────────────────── */}
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {/* 1. Set Active (Queue on stage without revealing) */}
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

          {/* 2. REVEAL PLAYER Button (Direct Supabase update requested) */}
          <button
            id={`admin-reveal-${player.id}`}
            onClick={() =>
              run('reveal', async () => {
                // Mark player active
                await supabase.from('players').update({ status: 'active' }).eq('id', player.id);
                // Reset any other active players
                await supabase.from('players').update({ status: 'upcoming' }).neq('id', player.id).eq('status', 'active');
                // Exact Supabase update on auction_state
                const response = await supabase
                  .from('auction_state')
                  .update({ active_player_id: player.id, is_revealed: true, status: 'bidding' })
                  .eq('id', 1);
                console.log('Reveal payload sent:', response);
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

      {/* ── Host control row ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pb-3 border-t border-surface-600/20 pt-3">
        <span className="text-[9px] text-muted font-inter uppercase tracking-widest flex-shrink-0">
          Host Controls
        </span>
        <div className="flex-1 h-px bg-surface-600/30" />

        {/* Pause / Resume */}
        <button
          id={`host-pause-${player.id}`}
          onClick={() => run('pause', () => toggleAuctionPause())}
          disabled={!!loading}
          title={auctionPaused ? 'Resume bidding' : 'Pause bidding for all teams'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]
                      font-inter font-semibold uppercase tracking-wide border
                      disabled:opacity-40 transition-all active:scale-95
            ${auctionPaused
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
            }`}
        >
          <PauseIcon paused={auctionPaused} />
          {isLoading('pause') ? '…' : auctionPaused ? 'Resume' : 'Pause'}
        </button>

        {/* Next Player */}
        <button
          id={`host-next-${player.id}`}
          onClick={() => run('next', () => activateNextPlayer())}
          disabled={!!loading}
          title="Activate the next upcoming player in the queue"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]
                     font-inter font-semibold uppercase tracking-wide border
                     bg-sky-500/15 text-sky-400 border-sky-500/30
                     hover:bg-sky-500/25 disabled:opacity-40 transition-all active:scale-95"
        >
          <SkipIcon />
          {isLoading('next') ? '…' : 'Next Player'}
        </button>
      </div>

      {/* ── Inline feedback ────────────────────────────────────────────── */}
      {msg && (
        <p className={`px-4 pb-3 text-[10px] font-inter -mt-1.5
          ${msgOk ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
