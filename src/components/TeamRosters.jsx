import React from 'react';
import { RoleBadge } from './RoleBadge';

// ─── Player thumbnail inside a roster card ────────────────────────────────────
function RosterPlayerCell({ player }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl
                 bg-surface-700/50 border border-surface-600/30
                 hover:bg-surface-700 hover:border-gold-500/20
                 transition-all duration-200 group"
    >
      {/* Photo */}
      <div
        className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0
                   border border-gold-500/20 group-hover:border-gold-500/40
                   transition-colors duration-200"
      >
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.in_game_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gold-500/10 flex items-center justify-center
                          font-rajdhani font-bold text-xl text-gold-400">
            {player.in_game_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className="font-rajdhani font-semibold text-xs text-slate-300
                   text-center leading-tight w-full truncate text-center"
        title={player.in_game_name}
      >
        {player.in_game_name}
      </span>

      {/* Role badge */}
      {player.role && <RoleBadge role={player.role} size="xs" />}

      {/* Sale price */}
      <span className="text-[9px] text-gold-500/80 font-inter tabular-nums">
        ₣{player.current_bid.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Balance bar — proportion of starting budget spent ───────────────────────
function BalanceBar({ balance, starting = 50000 }) {
  const pct = Math.min(100, (balance / starting) * 100);
  return (
    <div className="h-1 bg-surface-600 rounded-full overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all duration-700
          ${pct > 40 ? 'bg-fire-gradient'
          : pct > 15 ? 'bg-amber-500'
          : 'bg-red-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Individual team card ─────────────────────────────────────────────────────
function TeamRosterCard({ team, soldPlayers }) {
  const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.current_bid ?? 0), 0);
  const isBankrupt = (team.fire_coin_balance ?? 0) === 0;
  const isLow      = !isBankrupt && (team.fire_coin_balance ?? 0) < 500;

  return (
    <div
      className={`card-elevated overflow-hidden flex flex-col transition-all duration-300
        ${isBankrupt ? 'opacity-60' : ''}`}
    >
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-600/40">
        <div className="flex items-start justify-between gap-3">
          {/* Team identity */}
          <div className="min-w-0">
            <h3 className="font-rajdhani font-bold text-base text-white leading-tight truncate">
              {team.team_name}
            </h3>
            <p className="text-[10px] text-muted font-inter mt-0.5">{team.owner_name}</p>
          </div>

          {/* Balance */}
          <div className="flex-shrink-0 text-right">
            <div className={`font-rajdhani font-bold text-lg leading-none tabular-nums
              ${isBankrupt ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>
              ₣{(team.fire_coin_balance ?? 0).toLocaleString()}
            </div>
            {isBankrupt ? (
              <span className="text-[9px] text-red-500/80 font-rajdhani font-bold
                               uppercase tracking-widest">Bankrupt</span>
            ) : isLow ? (
              <span className="text-[9px] text-amber-500/80 font-inter uppercase tracking-widest">Low</span>
            ) : (
              <span className="text-[9px] text-muted font-inter">remaining</span>
            )}
          </div>
        </div>

        {/* Budget bar + stats row */}
        <BalanceBar balance={team.fire_coin_balance ?? 0} />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-muted font-inter">
            {soldPlayers.length} player{soldPlayers.length !== 1 ? 's' : ''} acquired
          </span>
          {totalSpent > 0 && (
            <span className="text-[9px] text-gold-500/70 font-inter tabular-nums">
              ₣{totalSpent.toLocaleString()} spent
            </span>
          )}
        </div>
      </div>

      {/* ── Player grid ──────────────────────────────────────────────────── */}
      <div className="p-4 flex-1">
        {soldPlayers.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5">
            {soldPlayers.map((player) => (
              <RosterPlayerCell key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[100px]
                          text-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-surface-700 flex items-center
                            justify-center text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.5" className="w-4 h-4">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[10px] text-muted font-inter leading-snug">
              No players<br />acquired yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TeamRosters — main export
//  Renders a responsive grid of team cards, each listing sold players.
//  Accepts teams + players arrays from AdminPanel (already real-time via hooks).
// ─────────────────────────────────────────────────────────────────────────────
export function TeamRosters({ teams, players, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 rounded-2xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="card p-12 text-center text-muted font-inter text-sm">
        No teams found. Use ⚡ Seed Data to populate the database.
      </div>
    );
  }

  // Sort teams by number of acquired players desc (most active roster first)
  const sorted = [...teams].sort(
    (a, b) => {
      const soldA = players.filter(p => p.status === 'sold' && p.current_highest_bidder === a.id).length;
      const soldB = players.filter(p => p.status === 'sold' && p.current_highest_bidder === b.id).length;
      return soldB - soldA;
    },
  );

  // Summary stats bar
  const totalSold    = players.filter(p => p.status === 'sold').length;
  const totalUnsold  = players.filter(p => p.status === 'unsold').length;
  const totalUpcoming = players.filter(p => p.status === 'upcoming').length;
  const totalCoinsSpent = players
    .filter(p => p.status === 'sold')
    .reduce((s, p) => s + (p.current_bid ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Players Sold',    value: totalSold,              color: 'text-gold-400'  },
          { label: 'Upcoming',        value: totalUpcoming,          color: 'text-slate-300' },
          { label: 'Unsold',          value: totalUnsold,            color: 'text-amber-400' },
          { label: 'Total Coins Spent', value: `₣${totalCoinsSpent.toLocaleString()}`, color: 'text-fire-400' },
        ].map(({ label, value, color }) => (
          <div key={label}
               className="card px-4 py-3 flex flex-col gap-0.5 border border-surface-600/40">
            <span className="text-[9px] text-muted font-inter uppercase tracking-widest">{label}</span>
            <span className={`font-rajdhani font-bold text-xl leading-tight ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Team roster cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
        {sorted.map((team) => {
          const soldPlayers = players.filter(
            (p) => p.status === 'sold' && p.current_highest_bidder === team.id,
          );
          return (
            <TeamRosterCard
              key={team.id}
              team={team}
              soldPlayers={soldPlayers}
            />
          );
        })}
      </div>
    </div>
  );
}
