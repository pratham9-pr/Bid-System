import React, { useState, useEffect, useRef, useCallback } from 'react';
import { placeBid, MAX_BID_LIMIT } from '../services/auctionService';

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

// ─────────────────────────────────────────────────────────────────────────────
//  BidPanel — main export
// ─────────────────────────────────────────────────────────────────────────────
export function BidPanel({ activePlayer, team, onNotify, auctionPaused, isRevealed = true }) {
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const teamBalance = team?.fire_coin_balance ?? 0;
  const currentBid  = activePlayer?.current_bid ?? 0;
  const isInsufficient = Boolean(activePlayer && teamBalance < (currentBid + 1));
  const isCapReached   = currentBid >= MAX_BID_LIMIT;
  const isSold         = activePlayer?.status === 'sold';
  const isDisabled     = !activePlayer || !isRevealed || isSold || isCapReached || auctionPaused || isInsufficient;

  useEffect(() => {
    if (activePlayer) {
      const nextSuggested = Math.min(MAX_BID_LIMIT, activePlayer.current_bid + 500);
      setBidAmount(String(nextSuggested));
    } else {
      setBidAmount('');
    }
  }, [activePlayer?.id, activePlayer?.current_bid]);

  const adjustBid = (delta) => {
    setBidAmount((prev) => {
      const current = Number(prev) || (activePlayer?.current_bid ?? 0);
      const updated = Math.min(MAX_BID_LIMIT, Math.max(0, current + delta));
      return String(updated);
    });
  };

  const handleBid = useCallback(async () => {
    if (!activePlayer || !team) return;
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
    if (amount > MAX_BID_LIMIT) {
      onNotify?.({ type: 'error', message: `Bid cannot exceed global limit of ₣${MAX_BID_LIMIT.toLocaleString()} FC.` });
      return;
    }

    setIsLoading(true);
    const result = await placeBid(activePlayer.id, team.id, amount);
    setIsLoading(false);

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
  }, [bidAmount, activePlayer, team, teamBalance, onNotify]);

  return (
    <div className="card-elevated p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-rajdhani font-bold text-lg text-white tracking-wide">Place Bid</h3>
        {isSold ? (
          <span className="badge-sold text-[10px]">Auction Closed</span>
        ) : !isRevealed && activePlayer ? (
          <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-amber-400">
            Stage Locked
          </span>
        ) : (
          <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-amber-400">
            Cap: ₣{MAX_BID_LIMIT.toLocaleString()} FC
          </span>
        )}
      </div>

      {/* ── UNREVEALED SUSPENSE BANNER ─────────────────────────────────── */}
      {activePlayer && !isRevealed && (
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
      {auctionPaused && (
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
      {isInsufficient && !auctionPaused && !isSold && isRevealed && (
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
            max={MAX_BID_LIMIT}
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
            const amount = Math.min(MAX_BID_LIMIT, activePlayer.current_bid + preset);
            return (
              <button
                key={preset}
                id={`quick-bid-${preset}`}
                onClick={() => setBidAmount(String(amount))}
                disabled={isDisabled || amount > teamBalance}
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
              : activePlayer
                ? `Min bid: ₣${(activePlayer.current_bid + 1).toLocaleString()} · Global Auto-sell Cap: ₣${MAX_BID_LIMIT.toLocaleString()} FC`
                : 'Waiting for the auctioneer to start…'}
      </p>

      {/* Cooldown visual indicator strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-700/40 rounded-lg border border-surface-600/30">
        <div className="w-1.5 h-1.5 rounded-full bg-fire-500/60 animate-pulse flex-shrink-0" />
        <p className="text-[10px] text-muted font-inter">
          Purse: ₣{teamBalance.toLocaleString()} FC · 3s server cooldown between bids
        </p>
      </div>
    </div>
  );
}
