import React from 'react';
import { getTeamDisplayName, getTeamOwner } from '../config/teamsConfig';

const medals = ['🥇', '🥈', '🥉'];

export function TeamLeaderboard({ teams }) {
  const sorted = [...teams].sort((a, b) => b.fire_coin_balance - a.fire_coin_balance);
  const maxBalance = sorted[0]?.fire_coin_balance || 1;

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-surface-600/40">
        <h2 className="font-rajdhani font-bold text-lg text-white tracking-wide">Team Leaderboard</h2>
        <p className="text-xs text-muted font-inter mt-0.5">Ranked by remaining Fire Coins</p>
      </div>

      <div className="divide-y divide-surface-600/30">
        {sorted.map((team, index) => {
          const pct = (team.fire_coin_balance / maxBalance) * 100;
          return (
            <div key={team.id} className="px-5 py-4 flex items-center gap-4 hover:bg-surface-700/30 transition-colors">
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                {index < 3
                  ? <span className="text-xl">{medals[index]}</span>
                  : <span className="font-rajdhani font-bold text-muted text-sm">{index + 1}</span>
                }
              </div>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-rajdhani font-bold text-sm text-white">
                    {getTeamDisplayName(team.id, team.team_name || team.name)}
                  </span>
                  <span className={`font-rajdhani font-bold text-base
                    ${index === 0 ? 'text-gold-400' : 'text-slate-300'}`}>
                    ₣{team.fire_coin_balance.toLocaleString()}
                  </span>
                </div>
                {/* Balance bar */}
                <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700
                      ${index === 0 ? 'bg-gold-gradient' : 'bg-fire-gradient'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted font-inter">Owner: {getTeamOwner(team.id, team.owner_name || team.owner)}</span>
                  <span className="text-[10px] text-muted font-inter">{team.id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="px-5 py-10 text-center text-muted font-inter text-sm">
          No teams loaded
        </div>
      )}
    </div>
  );
}
