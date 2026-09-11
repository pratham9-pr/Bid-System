import React, { useState, useEffect } from 'react';
// Import your Supabase client here

export default function Leaderboard() {
  const [teams, setTeams] = useState([]); // STRICTLY EMPTY

  // IF NO TEAMS EXIST, RENDER THE BLANK STATE:
  if (!teams || teams.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-8">
        <div className="border-b border-white/10 w-full max-w-5xl pb-4 mb-8">
            <h1 className="text-white/50 text-xl tracking-[0.3em] font-bold uppercase text-center">
              Official Standings
            </h1>
        </div>
        <h2 className="text-white/30 text-lg tracking-widest uppercase">
          Awaiting Tournament Data...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-8 text-white">
      {/* Your dynamic mapping code will go here once the database is connected */}
    </div>
  );
}
