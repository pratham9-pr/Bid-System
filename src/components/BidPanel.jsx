import React, { useState, useEffect, useRef, useCallback } from 'react';
import { placeBid, MAX_BID_LIMIT, MIN_BASE_PRICE, computeMaxAllowedBid } from '../services/auctionService';
import { useAllPlayers } from '../hooks/useAllPlayers';
import { isTeamRosterFull, MAX_ROSTER_SIZE, MAX_AUCTION_SLOTS } from '../config/franchiseCaptains';

// ─── SVG Ring Constants ──────────────────────────────────────────────────────
const RING_SIZE       = 72;   // px — total SVG canvas size
const RING_STROKE     = 3;    // px — ring stroke width
const RADIUS          = (RING_SIZE - RING_STROKE) / 2 - 2;
const CIRCUMFERENCE   = 2 * Math.PI * RADIUS;
const COOLDOWN_MS     = 3000; // 3 seconds

// ─── Sub-components ──────────────────────────────────────────────────────────
const ChevronUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
    <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Cooldown Ring Button ─────────────────────────────────────────────────────
function CooldownRingButton({ onBid, disabled, isSold, isPaused, isInsufficient }) {
  const [onCooldown, setOnCooldown] = useState(false);
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);
  const timeoutRef = useRef(null);

  const handleClick = useCallback(async () => {
    if (onCooldown || disabled || isPaused || isInsufficient) return;

    setOnCooldown(true);
    setDashOffset(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDashOffset(CIRCUMFERENCE);
      });
    });

    await onBid();

    timeoutRef.current = setTimeout(() => {
      setOnCooldown(false);
    }, COOLDOWN_MS);
  }, [onCooldown, disabled, isPaused, isInsufficient, onBid]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if ((disabled || isPaused || isInsufficient) && !onCooldown) setDashOffset(CIRCUMFERENCE);
  }, [disabled, isPaused, isInsufficient, onCooldown]);

  const isBlocked = onCooldown || disabled || isPaused || isInsufficient;

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      {/* ── SVG Progress Ring ─────────────────────────────────────────── */}
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="absolute"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={
            isPaused       ? 'rgba(245,158,11,0.15)'
            : isInsufficient ? 'rgba(239,68,68,0.15)'
            : onCooldown   ? 'rgba(249,115,22,0.12)'
            : 'rgba(255,255,255,0.04)'
          }
          strokeWidth={RING_STROKE}
        />
        {/* Draining arc */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={onCooldown ? '#f97316' : 'transparent'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{
            transition: onCooldown
              ? `stroke-dashoffset ${COOLDOWN_MS}ms linear`
              : 'none',
          }}
        />
      </svg>

      {/* ── Button ─────────────────────────────────────────────────────── */}
      <button
        id="bid-place-btn"
        onClick={handleClick}
        disabled={isBlocked || isSold}
        aria-label={
          isPaused        ? 'Auction paused'
          : isInsufficient ? 'Insufficient balance'
          : onCooldown     ? 'Cooldown active'
          : 'Place bid'
        }
        className={[
          'relative w-14 h-14 rounded-full font-rajdhani font-black text-[10px]',
          'tracking-widest uppercase transition-all duration-500 focus:outline-none',
          'flex flex-col items-center justify-center leading-tight',
          isPaused
            ? 'bg-amber-500/15 text-amber-400 cursor-not-allowed shadow-none border border-amber-500/25'
            : isInsufficient
              ? 'bg-red-500/15 text-red-400 cursor-not-allowed shadow-none border border-red-500/25'
              : onCooldown
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
                : isBlocked || isSold
                  ? 'bg-surface-600 text-muted cursor-not-allowed shadow-none'
                  : 'bg-fire-gradient text-white cursor-pointer hover:brightness-110 active:scale-95',
          !isPaused && !isInsufficient && !onCooldown && !isBlocked && !isSold
            ? '[box-shadow:0_4px_18px_rgba(249,115,22,0.45)]'
            : '',
        ].join(' ')}
      >
        {isPaused ? (
          <>
            <span className="block text-[9px]">⏸</span>
            <span className="block text-[8px] leading-none">PAUSED</span>
          </>
        ) : isInsufficient ? (
          <>
            <span className="block text-[9px]">₣✕</span>
            <span className="block text-[8px] leading-none">LOW FC</span>
          </>
        ) : (
          <span className="block">BID</span>
        )}
      </button>
    </div>
  );
}

// ─── MaxBidMeter — visual gauge showing dynamic soft cap ─────────────────────
function MaxBidMeter({ teamBalance, remainingSlots, currentBid }) {
  const maxAllowed = computeMaxAllowedBid(teamBalance, remainingSlots);
  const reserved   = MIN_BASE_PRICE * Math.max(0, (remainingSlots || 1) - 1);
  const pct        = teamBalance > 0 ? Math.min(100, (maxAllowed / teamBalance) * 100) : 0;

  const isWarning  = maxAllowed < MIN_BASE_PRICE * 2;
  const isDanger   = maxAllowed <= currentBid;

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors duration-300
      ${isDanger
        ? 'bg-red-500/10 border-red-500/30'
        : isWarning
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-surface-700/50 border-surface-600/40'}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-rajdhani font-black uppercase tracking-widest
            ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
            Max You Can Bid
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-rajdhani font-bold uppercase
            ${isDanger
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : isWarning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-surface-600/60 text-slate-400 border border-surface-500/40'}`}>
            {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left
          </span>
        </div>
        <span className={`font-rajdhani font-black text-base tabular-nums
          ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-300' : 'text-white'}`}>
          ₣{maxAllowed.toLocaleString()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden bg-surface-800/80">
        <div
          className={`h-full rounded-full transition-all duration-500
            ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="flex items-center justify-between text-[9px] font-inter text-muted gap-2">
        <span>
          ₣{teamBalance.toLocaleString()} purse
          {reserved > 0 && <span className="text-amber-500/70"> − ₣{reserved.toLocaleString()} reserved</span>}
        </span>
        <span className="text-[9px] text-muted">
          Formula: purse − (₣{MIN_BASE_PRICE.toLocaleString()} × {Math.max(0, (remainingSlots || 1) - 1)} slots)
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BidPanel — main export
// ─────────────────────────────────────────────────────────────────────────────
export function BidPanel({ activePlayer, team, onNotify, auctionPaused, isRevealed = true, biddingOpen = false }) {
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { players } = useAllPlayers();

  const isPendingTeam = team?.isPending === true;

  if (isPendingTeam) {
    return (
      <div className="card-elevated p-8 text-center bg-surface-900/60 border border-slate-700/40 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-xl mb-3 shadow-inner">
          🔒
        </div>
        <h3 className="font-rajdhani font-black text-lg text-white uppercase tracking-wider">
          Franchise Inactive / Pending
        </h3>
        <p className="text-xs text-slate-400 font-inter mt-1.5 max-w-xs mx-auto leading-relaxed">
          This franchise is currently inactive. Bidding controls are disabled for this account.
        </p>
      </div>
    );
  }

  const teamBalance    = team?.fire_coin_balance ?? 0;
  const currentBid     = activePlayer?.current_bid ?? 0;

  // ── Roster state ────────────────────────────────────────────────────────────
  const { slots, totalCount, remainingSlots, isFull: isRosterFull, captain } = getTeamFullRoster(team?.id, players);

  // ── Dynamic max bid (anti-soft-lock formula) ────────────────────────────────
  const dynamicMaxBid   = computeMaxAllowedBid(teamBalance, remainingSlots);
  const effectiveMax    = dynamicMaxBid; // respects both formula and global cap

  // ── Derived flags ────────────────────────────────────────────────────────────
  const isInsufficient  = Boolean(activePlayer && teamBalance < (currentBid + 1));
  const isCapReached    = currentBid >= MAX_BID_LIMIT;
  const isSold          = activePlayer?.status === 'sold';
  const isFloorLocked   = isRevealed && activePlayer && !biddingOpen;
  const isDisabled      = !activePlayer || !isRevealed || isSold || isCapReached ||
                          auctionPaused || isInsufficient || isRosterFull || !biddingOpen;

  // ── Sync bid amount when player changes ─────────────────────────────────────
  useEffect(() => {
    if (activePlayer) {
      const nextSuggested = Math.min(effectiveMax, activePlayer.current_bid + 500);
      setBidAmount(String(Math.max(activePlayer.current_bid + 1, nextSuggested)));
    } else {
      setBidAmount('');
    }
  }, [activePlayer?.id, activePlayer?.current_bid, effectiveMax]);

  const adjustBid = (delta) => {
    setBidAmount((prev) => {
      const current = Number(prev) || (activePlayer?.current_bid ?? 0);
      const updated = Math.min(effectiveMax, Math.max(0, current + delta));
      return String(updated);
    });
  };

  const isSubmittingRef = useRef(false);

  const handleBid = useCallback(async () => {
    if (isSubmittingRef.current || isLoading) return;
    if (!activePlayer || !team || isSold || !biddingOpen || auctionPaused || isFloorLocked) return;

    if (isRosterFull) {
      onNotify?.({
        type: 'error',
        message: captain
          ? 'Roster is full! You have 1 Captain + 3 Drafted Players.'
          : 'Roster is full! All 4 player slots are filled.',
      });
      return;
    }
    const amount = Number(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      onNotify?.({ type: 'error', message: 'Enter a valid bid amount.' });
      return;
    }
    if (amount <= activePlayer.current_bid && activePlayer.current_highest_bidder) {
      onNotify?.({
        type: 'error',
        message: `Bid must exceed current bid of ₣${activePlayer.current_bid.toLocaleString()}`,
      });
      return;
    }
    if (amount < activePlayer.base_price) {
      onNotify?.({
        type: 'error',
        message: `Bid cannot be lower than base price of ₣${activePlayer.base_price.toLocaleString()}`,
      });
      return;
    }
    if (amount > teamBalance) {
      onNotify?.({ type: 'error', message: `Insufficient Fire Coins! Balance: ₣${teamBalance.toLocaleString()}` });
      return;
    }
    if (amount > effectiveMax) {
      onNotify?.({
        type: 'error',
        message: `Max allowed bid is ₣${effectiveMax.toLocaleString()} FC — you need to keep ₣${MIN_BASE_PRICE.toLocaleString()} reserved for each remaining open slot.`,
      });
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const result = await placeBid(activePlayer.id, team.id, amount);

      if (result.success) {
        if (result.auto_sold) {
          onNotify?.({ type: 'success', message: `🏆 MAX CAP REACHED! Player auto-sold at ₣${amount.toLocaleString()} FC!` });
        } else {
          onNotify?.({ type: 'success', message: `Bid of ₣${amount.toLocaleString()} placed!` });
        }
      } else {
        const msg = result.error || 'Bid failed.';
        if (msg.startsWith('COOLDOWN_ACTIVE:')) {
          const rem = msg.split(':')[1];
          onNotify?.({ type: 'cooldown', message: `Server cooldown active — ${rem}s remaining` });
        } else {
          onNotify?.({ type: 'error', message: msg });
        }
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }, [bidAmount, activePlayer, team, teamBalance, effectiveMax, isRosterFull, onNotify, captain, isLoading, isSold, biddingOpen, auctionPaused, isFloorLocked]);

  return (
    <div className="card-elevated p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-rajdhani font-bold text-lg text-white tracking-wide">Place Bid</h3>
        {isSold ? (
          <span className="badge-sold text-[10px]">Auction Closed</span>
        ) : isRosterFull ? (
          <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/40 text-[9px] font-rajdhani font-black uppercase">
            Roster Full (4/4)
          </span>
        ) : biddingOpen && isRevealed ? (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-rajdhani font-black uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Floor Open
          </span>
        ) : !isRevealed && activePlayer ? (
          <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-amber-400">
            Stage Locked
          </span>
        ) : (
          <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-slate-400">
            ₣{effectiveMax.toLocaleString()} Max
          </span>
        )}
      </div>

      {/* ── ROSTER FULL BANNER ─────────────────────────────────────────── */}
      {isRosterFull && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400">
          <span className="text-sm">👑</span>
          <div className="flex-1">
            <p className="text-xs font-rajdhani font-black uppercase tracking-widest text-gold-400">
              Team Roster Complete (4/4)
            </p>
            <p className="text-[9px] text-slate-300 font-inter mt-0.5">
              {captain
                ? 'Your franchise has acquired 1 Captain + 3 Drafted Players. Bidding is complete!'
                : 'Your franchise has acquired 4 Drafted Players. Roster is complete!'}
            </p>
          </div>
        </div>
      )}

      {/* ── WAITING FOR HOST — bidding floor not yet open ─────────────── */}
      {isFloorLocked && !isRosterFull && !auctionPaused && (
        <div className="relative flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-2xl
                        bg-gradient-to-br from-surface-800/80 via-surface-900 to-surface-800/80
                        border-2 border-amber-500/40 overflow-hidden">
          {/* Sweeping shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent animate-[shimmer_2s_infinite]" />
          {/* Lock icon pulsing */}
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center
                          shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
            <span className="text-2xl">🔒</span>
          </div>
          <div className="text-center">
            <p className="font-rajdhani font-black text-base text-amber-300 uppercase tracking-wider leading-snug">
              Waiting for Host to Start Bidding…
            </p>
            <p className="text-[10px] text-slate-400 font-inter mt-1">
              The floor is locked. The auctioneer will open bidding shortly.
            </p>
          </div>
          {/* Animated dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400/70"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── UNREVEALED SUSPENSE BANNER ─────────────────────────────────── */}
      {activePlayer && !isRevealed && !isRosterFull && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                        bg-amber-500/10 border border-amber-500/30 animate-pulse">
          <span className="text-amber-400 text-sm">🔒</span>
          <div className="flex-1">
            <p className="text-xs font-rajdhani font-bold text-amber-400 uppercase tracking-widest">
              Awaiting Player Reveal
            </p>
            <p className="text-[9px] text-slate-400 font-inter mt-0.5">
              Bidding opens as soon as the auctioneer drops the player card.
            </p>
          </div>
        </div>
      )}

      {/* ── AUCTION PAUSED banner ──────────────────────────────────────── */}
      {auctionPaused && !isRosterFull && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                        bg-amber-500/10 border border-amber-500/25 animate-fade-in">
          <span className="text-amber-400 text-sm">⏸</span>
          <div className="flex-1">
            <p className="text-xs font-rajdhani font-bold text-amber-400 uppercase tracking-widest">
              Auction Paused
            </p>
            <p className="text-[9px] text-amber-500/70 font-inter mt-0.5">
              Bidding is disabled — wait for the host to resume.
            </p>
          </div>
        </div>
      )}

      {/* ── INSUFFICIENT BALANCE WARNING ────────────────────────────────── */}
      {isInsufficient && !auctionPaused && !isSold && isRevealed && !isRosterFull && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                        bg-red-500/10 border border-red-500/25 animate-fade-in text-red-400">
          <span className="text-sm">⚠️</span>
          <div className="flex-1">
            <p className="text-xs font-rajdhani font-bold uppercase tracking-wide">
              Insufficient Fire Coins
            </p>
            <p className="text-[9px] text-red-400/80 font-inter mt-0.5">
              Your balance (₣{teamBalance.toLocaleString()}) is lower than the required bid.
            </p>
          </div>
        </div>
      )}

      {/* ── DYNAMIC MAX BID METER ───────────────────────────────────────── */}
      {biddingOpen && isRevealed && !isRosterFull && !isSold && !auctionPaused && (
        <MaxBidMeter
          teamBalance={teamBalance}
          remainingSlots={remainingSlots}
          currentBid={currentBid}
        />
      )}

      {/* Bid amount input row */}
      <div className="flex gap-2 items-center">
        {/* Decrement */}
        <div className="flex flex-col gap-1">
          <button
            id="bid-increment-btn"
            onClick={() => adjustBid(500)}
            disabled={isDisabled || isSold}
            className="w-8 h-8 rounded-lg bg-surface-600 border border-surface-500/60
                       flex items-center justify-center text-slate-400
                       hover:bg-surface-500 hover:text-white disabled:opacity-30
                       transition-all duration-150 active:scale-90"
            aria-label="Increase bid by 500"
          >
            <ChevronUp />
          </button>
          <button
            id="bid-decrement-btn"
            onClick={() => adjustBid(-500)}
            disabled={isDisabled || isSold}
            className="w-8 h-8 rounded-lg bg-surface-600 border border-surface-500/60
                       flex items-center justify-center text-slate-400
                       hover:bg-surface-500 hover:text-white disabled:opacity-30
                       transition-all duration-150 active:scale-90"
            aria-label="Decrease bid by 500"
          >
            <ChevronDown />
          </button>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-rajdhani font-bold text-xl text-gold-500 pointer-events-none select-none">
            ₣
          </span>
          <input
            id="bid-amount-input"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            disabled={isDisabled || isSold}
            placeholder="Enter amount"
            min={activePlayer ? activePlayer.current_bid + 1 : 0}
            max={effectiveMax}
            className="input-field pl-9 text-xl font-rajdhani font-bold pr-3
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        {/* Cooldown ring bid button */}
        <CooldownRingButton
          onBid={handleBid}
          disabled={isDisabled || isSold}
          isSold={isSold}
          isPaused={auctionPaused}
          isInsufficient={isInsufficient}
        />
      </div>

      {/* Quick bid buttons */}
      {!isSold && activePlayer && (
        <div className="grid grid-cols-3 gap-2">
          {[1000, 2500, 5000].map((preset) => {
            const amount = Math.min(effectiveMax, activePlayer.current_bid + preset);
            const isOverMax = amount > effectiveMax || amount > teamBalance;
            return (
              <button
                key={preset}
                id={`quick-bid-${preset}`}
                onClick={() => setBidAmount(String(amount))}
                disabled={isDisabled || isOverMax}
                className="py-2 px-1 rounded-lg text-xs font-inter font-semibold
                           bg-surface-700 border border-surface-500/60
                           text-slate-400 hover:bg-surface-600 hover:text-white
                           hover:border-fire-500/30 disabled:opacity-30
                           transition-all duration-150 active:scale-95"
              >
                +{preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            );
          })}
        </div>
      )}

      {/* Hint */}
      <p className="text-[10px] text-muted font-inter text-center leading-relaxed">
        {isSold
          ? 'This player has been sold. Wait for the next one.'
          : isInsufficient
            ? 'Cannot bid: your remaining balance is lower than the active player bid.'
            : auctionPaused
              ? 'The host has paused the auction. Bidding will resume shortly.'
              : isFloorLocked
                ? 'Bidding floor is locked — the host will open bids momentarily.'
                : activePlayer && biddingOpen
                  ? `Min bid: ₣${(activePlayer.current_bid + 1).toLocaleString()} · Your max: ₣${effectiveMax.toLocaleString()} FC`
                  : 'Waiting for the auctioneer to start…'}
      </p>

      {/* Purse / cooldown strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-700/40 rounded-lg border border-surface-600/30">
        <div className="w-1.5 h-1.5 rounded-full bg-fire-500/60 animate-pulse flex-shrink-0" />
        <p className="text-[10px] text-muted font-inter">
          Purse: ₣{teamBalance.toLocaleString()} FC
          {remainingSlots > 0 && ` · ${remainingSlots} draft slot${remainingSlots !== 1 ? 's' : ''} remaining`}
          {' · 3s server cooldown between bids'}
        </p>
      </div>
    </div>
  );
}
