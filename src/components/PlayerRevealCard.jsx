import React from 'react';
import { motion } from 'framer-motion';

// ─── Demons Reign Emblem for Card Front ──────────────────────────────────────
const CardFrontLogo = () => (
  <div className="flex flex-col items-center justify-center gap-4 select-none">
    <div className="relative">
      <div className="absolute -inset-4 rounded-full bg-red-600/30 blur-2xl animate-pulse" />
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative z-10 bg-black">
        <img
          src="/demons_reign_logo.jpg"
          alt="Demons Reign"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
    <div className="text-center space-y-1">
      <h3 className="font-rajdhani font-black text-2xl tracking-[0.25em] text-white uppercase">
        DEMONS REIGN
      </h3>
      <p className="font-rajdhani font-black text-xs tracking-[0.35em] text-fire-400 uppercase">
        OFFICIAL AUCTION CARD
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  PlayerRevealCard — Full-Bleed 3D Flip Card for Broadcast Overlay
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
    <div className={`w-full h-full min-h-[520px] [perspective:1000px] flex items-center justify-center ${className}`}>
      {/* ── 3D Rotating Card Container ───────────────────────────────────── */}
      <motion.div
        animate={{ rotateY: shouldFlip ? 180 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 180,
          damping: 20,
          mass: 0.9,
        }}
        className="relative w-full h-full min-h-[520px] [transform-style:preserve-3d] rounded-3xl cursor-default shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]"
      >
        {/* ================================================================= */}
        {/* FRONT FACE: Demons Reign Emblem & Suspense State (rotateY: 0deg)  */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-3xl overflow-hidden
                     border-2 border-fire-500/30 bg-surface-900 flex flex-col items-center justify-between
                     p-8 text-center select-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
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
            <span className="text-[9px] font-rajdhani font-black text-fire-500/70 uppercase tracking-widest">
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
          <div className="relative z-10 my-auto">
            <CardFrontLogo />
          </div>

          {/* Bottom Suspenseful Standby Badge */}
          <div className="relative z-10 flex items-center gap-2 px-5 py-2 rounded-full bg-surface-800/95 border border-fire-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            <span className="w-2.5 h-2.5 rounded-full bg-fire-500 animate-pulse" />
            <span className="font-rajdhani font-black text-xs text-fire-300 tracking-widest uppercase">
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
          className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]
                     rounded-3xl overflow-hidden border-2 border-fire-500/40 bg-surface-900 select-none
                     shadow-[0_0_40px_rgba(249,115,22,0.25)]"
        >
          <img
            src={cardImageUrl}
            alt={cardAltText}
            onError={(e) => {
              e.currentTarget.src = '/players/default.jpg';
            }}
            className="w-full h-full object-cover rounded-3xl"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default PlayerRevealCard;
