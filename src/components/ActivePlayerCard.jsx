import React from 'react';
import { PlayerRevealCard } from './PlayerRevealCard';

/**
 * ActivePlayerCard
 * Renders the 3D Flip Reveal Card for the active player.
 */
export function ActivePlayerCard({ player, isRevealed }) {
  return <PlayerRevealCard player={player} isRevealed={isRevealed} />;
}

export default ActivePlayerCard;
