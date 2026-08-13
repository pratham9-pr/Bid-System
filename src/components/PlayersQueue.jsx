import React from 'react';
import { RoleBadge } from './RoleBadge';

const StatusBadge = ({ status }) => {
  if (status === 'active')   return <span className="badge-active">● Live</span>;
  if (status === 'sold')     return <span className="badge-sold">✓ Sold</span>;
  if (status === 'unsold')   return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-rajdhani font-bold uppercase
                     tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/25">
      Unsold
    </span>
  );
  return <span className="badge-upcoming">Upcoming</span>;
};

export function PlayersQueue({ players, activePlayerId }) {
  // Captains are locked into rosters — permanently excluded from the bidding pool
  const biddablePlayers = players.filter((p) => !p.is_captain);

  // 'unsold' players are re-listable, so group them with upcoming
  const upcoming    = biddablePlayers.filter((p) => p.status === 'upcoming' || p.status === 'unsold');
  const sold        = biddablePlayers.filter((p) => p.status === 'sold');
  const captainCount = players.filter((p) => p.is_captain === true).length;

  const PlayerRow = ({ player }) => {
    const isActive = player.id === activePlayerId;
    return (
      <div
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200
          ${isActive
            ? 'bg-fire-500/10 border border-fire-500/30'
            : 'bg-surface-700/50 border border-surface-600/30 hover:bg-surface-700'
          }`}
      >
        {/* Thumbnail avatar */}
        <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0
          flex items-center justify-center
          ${isActive ? 'ring-1 ring-fire-500/50' : ''}`}>
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.in_game_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center
              font-rajdhani font-bold text-xs
              ${isActive ? 'bg-fire-500/20 text-fire-400'
              : player.status === 'sold' ? 'bg-gold-500/15 text-gold-400'
              : 'bg-surface-600 text-muted'}`}>
              {player.in_game_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <span className={`font-rajdhani font-semibold text-sm truncate block
            ${isActive ? 'text-fire-300' : player.status === 'sold' ? 'text-gold-400' : 'text-slate-300'}`}>
            {player.in_game_name}
          </span>
          {player.role && (
            <div className="mt-0.5">
              <RoleBadge role={player.role} size="xs" />
            </div>
          )}
        </div>

        <StatusBadge status={isActive ? 'active' : player.status} />
      </div>
    );
  };

  return (
    <div className="card-elevated flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-surface-600/40">
        <h2 className="font-rajdhani font-bold text-lg text-white tracking-wide">
          Player Queue
        </h2>
        <p className="text-xs text-muted font-inter mt-0.5">
          {upcoming.length} upcoming · {sold.length} drafted
          {captainCount > 0 && (
            <span className="text-amber-400/80"> · {captainCount} captain{captainCount !== 1 ? 's' : ''} locked</span>
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {/* Active first — only if non-captain */}
        {biddablePlayers.filter((p) => p.id === activePlayerId).map((p) => (
          <PlayerRow key={p.id} player={p} />
        ))}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1">
              <span className="stat-label text-[10px]">Upcoming</span>
            </div>
            {upcoming.map((p) => <PlayerRow key={p.id} player={p} />)}
          </>
        )}

        {/* Sold */}
        {sold.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1">
              <span className="stat-label text-[10px]">Sold</span>
            </div>
            {sold.map((p) => (
              <div key={p.id}>
                <PlayerRow player={p} />
                {p.current_highest_bidder_name && (
                  <div className="px-2.5 pb-1.5 -mt-0.5">
                    <span className="text-[10px] text-gold-500/70 font-inter">
                      → {p.current_highest_bidder_name} · ₣{p.current_bid.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {players.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted text-sm font-inter">
            No players loaded
          </div>
        )}
      </div>
    </div>
  );
}
