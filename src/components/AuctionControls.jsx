import React from 'react';
import { getTeamDisplayName, getTeamOwner, getTeamLogo, getTeamTheme } from '../config/teamsConfig';
import { getTeamFullRoster, MAX_ROSTER_SIZE } from '../config/franchiseCaptains';

/**
 * TeamCard component for Host Panel Auction Controls
 * Renders individual franchise tile with live balance, roster slots, and quick actions
 */
export function TeamCard({ team, allPlayers = [], onSelectTeam, isSelected = false }) {
  const teamId = team.id;
  const theme = getTeamTheme(teamId);
  const displayName = getTeamDisplayName(teamId, team.team_name || team.name);
  const ownerName = getTeamOwner(teamId, team.owner_name || team.owner);
  const logoUrl = team.logo_url || team.logo || getTeamLogo(teamId);
  const balance = team.fire_coin_balance ?? team.purse ?? 40000;
  const { totalCount, remainingSlots, isFull } = getTeamFullRoster(teamId, allPlayers);

  return (
    <div
      className={`card p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-3
        ${theme?.card || 'bg-surface-900 border-surface-600/40'}
        ${isSelected ? 'ring-2 ring-fire-500 shadow-[0_0_25px_rgba(249,115,22,0.3)]' : ''}
        ${isFull ? 'border-gold-500/50' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 p-0.5 flex-shrink-0 flex items-center justify-center">
            <img
              src={logoUrl}
              alt={displayName}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-rajdhani font-black text-base text-white truncate uppercase">
                {displayName}
              </h4>
              {isFull && (
                <span className="px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[8px] font-rajdhani font-black uppercase">
                  Full
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted font-inter truncate">
              Owner: <span className="text-slate-300 font-semibold">{ownerName}</span>
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-[9px] text-muted font-inter uppercase block leading-none">Purse</span>
          <span className="font-rajdhani font-black text-base text-gold-400 tabular-nums">
            ₣{balance.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-rajdhani font-bold">
        <span className="text-slate-400 uppercase tracking-wider">
          Roster: <span className="text-white font-black">{totalCount}/{MAX_ROSTER_SIZE}</span> ({remainingSlots} open)
        </span>
        {onSelectTeam && (
          <button
            onClick={() => onSelectTeam(team.id)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-rajdhani font-black uppercase tracking-wider bg-fire-500/20 text-fire-400 border border-fire-500/40 hover:bg-fire-500/30 transition-colors"
          >
            Select Team
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AuctionControls Component
 * Dynamic Host Panel visual panels mapped over active teams
 */
export function AuctionControls({ teams = [], allPlayers = [], onSelectTeam, selectedTeamId }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="card p-12 text-center text-muted font-inter text-sm rounded-2xl bg-surface-900/60 border border-surface-600/40">
        No teams found. Please configure franchises in the Setup Wizard
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          allPlayers={allPlayers}
          onSelectTeam={onSelectTeam}
          isSelected={selectedTeamId === team.id}
        />
      ))}
    </div>
  );
}

export default AuctionControls;
