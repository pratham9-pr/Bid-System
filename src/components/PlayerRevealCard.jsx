import React from 'react';
import { motion } from 'framer-motion';

// ─── Demons Reign Emblem for Card Front ──────────────────────────────────────
const CardFrontLogo = () => (
  <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 select-none">
    <div className="relative">
      <div className="absolute -inset-3 rounded-full bg-red-600/30 blur-2xl animate-pulse" />
      <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative z-10 bg-black p-0.5">
        <img
          src="/demons_reign_logo.jpg"
          alt="Demons Reign"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    </div>
    <div className="text-center space-y-0.5 sm:space-y-1">
      <h3 className="font-rajdhani font-black text-xl sm:text-2xl tracking-[0.25em] text-white uppercase leading-tight">
        DEMONS REIGN
      </h3>
      <p className="font-rajdhani font-black text-[10px] sm:text-xs tracking-[0.35em] text-fire-400 uppercase">
        OFFICIAL AUCTION CARD
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  PlayerRevealCard — Fail-Safe 3D Flip Card for Broadcast Overlay & OBS
// ─────────────────────────────────────────────────────────────────────────────
export function PlayerRevealCard({ player, activePlayer, isRevealed, auctionState, className = '' }) {
  // Support both 'player' and 'activePlayer' prop naming
  const currentActivePlayer = activePlayer || player;

  // Enforce strict boolean evaluation against auction_state.is_revealed
  const isPlayerRevealed = Boolean(
    auctionState?.is_revealed === true || isRevealed === true
  );

  // The card is flipped ONLY when there is a valid active player AND is_revealed is true
  const shouldFlip = Boolean(currentActivePlayer && currentActivePlayer.id && isPlayerRevealed);

  // When revealed, pull custom_card_url, photo_url, image_url; otherwise fallback placeholder
  const cardImageUrl = isPlayerRevealed
    ? currentActivePlayer?.custom_card_url ||
      currentActivePlayer?.photo_url ||
      currentActivePlayer?.image_url ||
      '/players/default.jpg'
    : '/players/default.jpg';

  const cardAltText = isPlayerRevealed
    ? currentActivePlayer?.name || currentActivePlayer?.in_game_name || 'Player Card'
    : 'Waiting for reveal…';

  return (
    <div className={`w-full h-full flex-1 min-h-0 [perspective:1200px] flex flex-col relative ${className}`}>
      {/* ── 3D Rotating Card Container (No overflow-hidden to preserve 3D context) ── */}
      <motion.div
        animate={{ rotateY: shouldFlip ? 180 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 160,
          damping: 18,
          mass: 0.9,
        }}
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        }}
        className="relative w-full h-full max-h-full rounded-2xl cursor-default shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col"
      >
        {/* ================================================================= */}
        {/* FRONT FACE: Demons Reign Emblem & Standby Suspense                */}
        {/* ================================================================= */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            zIndex: shouldFlip ? 0 : 2,
          }}
          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden
                     border-2 border-fire-500/30 bg-surface-900 flex flex-col items-center justify-between
                     p-4 sm:p-6 text-center select-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]
                     transition-opacity duration-200 ${shouldFlip ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          {/* Holographic background glow & scanlines */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.14)_0%,transparent_70%)] pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 8px)',
            }}
          />

          {/* Accent Bars */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-fire-gradient" />
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-fire-gradient" />

          {/* Header Status */}
          <div className="relative z-10 w-full flex items-center justify-between">
            <span className="text-[9px] font-rajdhani font-black text-fire-500/80 uppercase tracking-widest">
              OFFICIAL LEAGUE
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fire-500 animate-ping" />
              <span className="text-[9px] font-rajdhani font-bold text-slate-300 uppercase tracking-widest">
                {currentActivePlayer ? 'STAGE LOCKED' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Center Flame Logo */}
          <div className="relative z-10 my-auto py-2">
            <CardFrontLogo />
          </div>

          {/* Bottom Suspenseful Standby Badge */}
          <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-surface-800/95 border border-fire-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            <span className="w-2.5 h-2.5 rounded-full bg-fire-500 animate-pulse" />
            <span className="font-rajdhani font-black text-[10px] sm:text-xs text-fire-300 tracking-widest uppercase">
              {currentActivePlayer
                ? 'WAITING FOR AUCTIONEER REVEAL…'
                : 'AWAITING NEXT PLAYER…'}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BACK FACE: Single Full-Bleed Custom Image Card (rotateY: 180deg)  */}
        {/* ================================================================= */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            zIndex: shouldFlip ? 2 : 0,
          }}
          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden
                     border-2 border-fire-500/40 bg-surface-950 select-none
                     shadow-[0_0_40px_rgba(249,115,22,0.25)] flex flex-col p-0
                     transition-opacity duration-200 ${shouldFlip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Full-Bleed Image Container stretching completely to edges */}
          <div className="flex-1 w-full h-full relative bg-cover bg-center overflow-hidden flex items-center justify-center">
            <img
              src={cardImageUrl}
              alt={cardAltText}
              onError={(e) => {
                e.currentTarget.src = '/players/default.jpg';
              }}
              className="w-full h-full object-cover object-center rounded-2xl"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PlayerRevealCard;
