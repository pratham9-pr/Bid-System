import React from 'react';
import Leaderboard from '../Leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen w-full bg-[#05060a] bg-radial-gradient flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] rounded-full bg-red-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      
      <Leaderboard isOverlay={true} />
    </div>
  );
}
