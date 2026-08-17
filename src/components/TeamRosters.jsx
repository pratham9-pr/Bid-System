import React, { useState } from 'react';
import { RoleBadge } from './RoleBadge';
import { getTeamFullRoster, isPlayerAssignedToTeam, MAX_ROSTER_SIZE, MAX_AUCTION_SLOTS } from '../config/franchiseCaptains';
import { appointTeamCaptain, removePlayerFromRoster, resetAllRostersAndCaptains, DEFAULT_TEAM_PURSE } from '../services/auctionService';
import { getTeamLogo, getTeamDisplayName, getTeamOwner } from '../config/teamsConfig';

// Team logo helper — uses central config so name/logo changes propagate everywhere
const getTeamLogoUrl = (teamId) => getTeamLogo(teamId);

// ─── Player thumbnail inside a roster card ────────────────────────────────────
function RosterPlayerCell({ player, slotIndex, isCaptain = false, teamId, teamName, allPlayers = [], onAppoint }) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading]   = useState(false);

  const eligibleForCaptain = Array.from(
    new Map(
      (allPlayers || [])
        .filter((p) => !p.is_captain || isPlayerAssignedToTeam(p, teamId) || !p.sold_to_team_id)
        .map((p) => [String(p.id), p])
    ).values()
  );

  if (!player) {
    if (isCaptain) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl
                     border-2 border-dashed border-amber-500/30 bg-amber-500/5
                     min-h-[170px] text-center select-none hover:border-amber-400/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 text-sm font-rajdhani font-black">
            👑
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-rajdhani font-black text-amber-300 uppercase tracking-widest block">
              Captain Slot
            </span>
            <span className="text-[9px] text-muted font-inter block">
              Unassigned
            </span>
          </div>

          <div className="relative inline-flex items-center mt-1">
            <select
              value=""
              onChange={async (e) => {
                const selectedPlayerId = e.target.value;
                if (!selectedPlayerId) return;
                setLoading(true);
                const res = await appointTeamCaptain(selectedPlayerId, teamId, teamName);
                setLoading(false);
                if (!res.success) {
                  alert('Error appointing captain: ' + (res.error || 'Unknown error'));
                }
                onAppoint?.();
              }}
              disabled={loading}
              className="appearance-none pl-2 pr-5 py-1 rounded text-[9px] font-rajdhani font-black uppercase tracking-widest
                         bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:border-amber-400
                         hover:bg-amber-500/25 transition-all cursor-pointer focus:outline-none"
              title="Appoint a Captain for this team"
            >
              <option value="" disabled className="bg-surface-900 text-muted">
                + APPOINT
              </option>
              {eligibleForCaptain.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface-900 text-white font-rajdhani font-bold">
                  {p.in_game_name || p.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl
                   border-2 border-dashed border-surface-600/40 bg-surface-800/20
                   min-h-[170px] text-center select-none hover:border-surface-500/60 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-700/30 border border-surface-600/30 flex items-center justify-center text-muted text-xs font-rajdhani font-black">
          #{slotIndex + 1}
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-rajdhani font-black text-slate-400 uppercase tracking-widest block">
            Draft Slot {slotIndex + 1}
          </span>
          <span className="text-[9px] text-muted font-inter block">
            Open for Auction
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-between p-3 rounded-2xl relative overflow-hidden min-h-[170px] transition-all duration-300 group
        ${isCaptain
          ? 'bg-gradient-to-b from-amber-500/20 via-surface-800/90 to-surface-900 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
          : 'bg-surface-700/50 border border-surface-600/40 hover:bg-surface-700/80 hover:border-gold-500/30'}`}
    >
      {/* ── Captain Distinct Header Ribbon / Badge ───────────────────────── */}
      {isCaptain ? (
        <div className="w-full flex items-center justify-between gap-1 mb-1 relative z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-rajdhani font-black text-[9px] uppercase tracking-wider shadow-md">
            <span>👑</span>
            <span>CAPTAIN</span>
          </div>
          <span className="text-[8px] font-rajdhani font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
            🔒 LOCKED
          </span>
        </div>
      ) : (
        <div className="w-full flex items-center justify-between mb-1 relative z-10">
          <span className="text-[9px] font-rajdhani font-bold text-slate-400 uppercase tracking-wider">
            Slot #{slotIndex + 1}
          </span>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm(`Release ${player.in_game_name || player.name} from this roster?`)) {
                setLoading(true);
                await removePlayerFromRoster(player.id);
                setLoading(false);
                onAppoint?.();
              }
            }}
            disabled={loading}
            className="text-[8px] font-rajdhani font-black text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/30 uppercase cursor-pointer transition-colors"
            title="Release this player back to upcoming pool"
          >
            ✕ Release
          </button>
        </div>
      )}

      {/* ── Photo Container ─────────────────────────────────────────────── */}
      <div
        className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative my-1 transition-transform group-hover:scale-105 duration-300
          ${isCaptain
            ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] ring-2 ring-amber-500/20 bg-black'
            : 'border border-gold-500/20 group-hover:border-gold-500/40 bg-surface-800'}`}
      >
        {player.photo_url || player.custom_card_url || player.image_url ? (
          <img
            src={player.photo_url || player.custom_card_url || player.image_url}
            alt={player.in_game_name || player.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/players/default.jpg';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gold-500/10 flex items-center justify-center font-rajdhani font-bold text-xl text-gold-400">
            {(player.in_game_name || player.name || 'P').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* ── Player Details ──────────────────────────────────────────────── */}
      <div className="w-full text-center space-y-0.5 relative z-10">
        <span
          className={`font-rajdhani font-black text-xs block truncate leading-tight
            ${isCaptain ? 'text-amber-200' : 'text-white'}`}
          title={player.in_game_name || player.name}
        >
          {player.in_game_name || player.name}
        </span>

        {/* Role badge (Defaulted to IGL for Captains) */}
        <div className="flex justify-center my-0.5">
          <RoleBadge role={isCaptain ? 'IGL' : player.role || 'Rusher'} size="xs" />
        </div>

        {/* Price / Locked status */}
        {isCaptain ? (
          <span className="text-[9px] text-amber-400 font-rajdhani font-black uppercase tracking-wider block">
            🔒 Franchise Leader
          </span>
        ) : (
          <span className="text-[9px] text-gold-400 font-inter font-bold tabular-nums block">
            ₣{(player.current_bid ?? player.sold_price ?? 0).toLocaleString()} FC
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Balance bar — proportion of starting budget remaining ────────────────────────────
function BalanceBar({ balance, starting = DEFAULT_TEAM_PURSE }) {
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
function TeamRosterCard({ team, allPlayers, onAppoint }) {
  const teamId = team.id;
  const { captain, auctionedPlayers, slots, totalCount, remainingSlots, isFull } = getTeamFullRoster(
    teamId,
    allPlayers
  );

  const totalSpent = auctionedPlayers.reduce((sum, p) => sum + (p.current_bid ?? p.sold_price ?? 0), 0);
  const isBankrupt = (team.fire_coin_balance ?? 0) === 0;
  const isLow      = !isBankrupt && (team.fire_coin_balance ?? 0) < 500;
  const teamLogo   = getTeamLogoUrl(teamId);

  return (
    <div
      className={`card-elevated overflow-hidden flex flex-col transition-all duration-300 relative
        ${isFull ? 'border-gold-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : ''}
        ${isBankrupt ? 'opacity-60' : ''}`}
    >
      {/* Watermarked Team Logo in Card Background */}
      <img
        src={teamLogo}
        alt=""
        className="absolute -right-8 -bottom-8 w-44 h-44 object-contain opacity-5 pointer-events-none select-none z-0"
      />

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-600/40 bg-surface-900/80 relative z-10">
        <div className="flex items-start justify-between gap-3">
          {/* Team identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/50 border border-white/10 p-1 flex-shrink-0">
              <img src={teamLogo} alt={team.name || team.team_name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-rajdhani font-black text-lg text-white leading-tight truncate">
                  {getTeamDisplayName(team.id, team.name || team.team_name)}
                </h3>
                {isFull && (
                  <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/40 text-[9px] font-rajdhani font-black uppercase tracking-wider">
                    Full (4/4)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted font-inter mt-0.5">
                Owner: <span className="text-slate-300 font-semibold">{getTeamOwner(team.id, team.owner || team.owner_name)}</span>
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="flex-shrink-0 text-right">
            <div className={`font-rajdhani font-black text-xl leading-none tabular-nums
              ${isBankrupt ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>
              ₣{(team.fire_coin_balance ?? 0).toLocaleString()}
            </div>
            {isBankrupt ? (
              <span className="text-[9px] text-red-500/80 font-rajdhani font-bold uppercase tracking-widest">
                Bankrupt
              </span>
            ) : isLow ? (
              <span className="text-[9px] text-amber-500/80 font-inter uppercase tracking-widest">Low</span>
            ) : (
              <span className="text-[9px] text-muted font-inter">remaining</span>
            )}
          </div>
        </div>

        {/* Budget bar + stats row */}
        <BalanceBar balance={team.fire_coin_balance ?? 0} />
        <div className="flex items-center justify-between mt-2 pt-1 text-[11px] font-rajdhani font-bold">
          <span className="text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>Lineup:</span>
            <span className="text-white font-black">{totalCount} / {MAX_ROSTER_SIZE} Players</span>
            <span className="text-muted font-normal">({remainingSlots} Open Draft Slot{remainingSlots !== 1 ? 's' : ''})</span>
          </span>
          {totalSpent > 0 ? (
            <span className="text-gold-400 font-inter font-semibold tabular-nums">
              ₣{totalSpent.toLocaleString()} spent
            </span>
          ) : (
            <span className="text-muted font-inter">0 coins spent</span>
          )}
        </div>
      </div>

      {/* ── 4-Player Roster Grid ─────────────────────────────────────────── */}
      <div className="p-4 flex-1 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {slots.map((player, idx) => (
            <RosterPlayerCell
              key={player?.id ? `roster-${teamId}-${player.id}` : `empty-${teamId}-slot-${idx}`}
              player={player}
              slotIndex={idx}
              isCaptain={Boolean(captain && idx === 0)}
              teamId={teamId}
              teamName={team.name || team.team_name}
              allPlayers={allPlayers}
              onAppoint={onAppoint}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TeamRosters — main export
// ─────────────────────────────────────────────────────────────────────────────
export function TeamRosters({ teams, players, loading, onAppoint }) {
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg]   = useState(null);

  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to completely empty all franchise rosters & reset balances to 40,000 FC?')) {
      return;
    }
    setResetting(true);
    setResetMsg(null);
    const result = await resetAllRostersAndCaptains();
    setResetting(false);
    if (result.success) {
      setResetMsg('✓ All rosters, captains, and balances have been successfully reset & emptied.');
      onAppoint?.();
      setTimeout(() => setResetMsg(null), 5000);
    } else {
      setResetMsg(`✗ Failed to reset: ${result.error}`);
    }
  };

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
        No teams found.
      </div>
    );
  }

  // Deduplicate all players by ID
  const uniquePlayersMap = new Map();
  for (const p of players || []) {
    if (p && p.id && !uniquePlayersMap.has(String(p.id))) {
      uniquePlayersMap.set(String(p.id), p);
    }
  }
  const uniquePlayers = Array.from(uniquePlayersMap.values());

  // Filter sold players (excluding captains) with distinct IDs
  const soldPlayers = uniquePlayers.filter((p) => p.status === 'sold' && !p.is_captain);
  
  // Calculate active captains count
  let activeCaptainsCount = 0;
  for (const t of teams) {
    const { captain } = getTeamFullRoster(t.id, uniquePlayers);
    if (captain) activeCaptainsCount++;
  }

  const totalDrafted  = soldPlayers.length;
  const totalRosterPlayers = activeCaptainsCount + totalDrafted;
  const totalAvailableAuctionSlots = Math.max(0, (teams.length * MAX_ROSTER_SIZE) - totalRosterPlayers);
  const totalCoinsSpent = soldPlayers.reduce((s, p) => s + (p.current_bid ?? p.sold_price ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Action Bar & Reset Notification ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-800/80 border border-surface-600/40">
        <div>
          <h3 className="font-rajdhani font-bold text-base text-white">Franchise Rosters Management</h3>
          <p className="text-xs text-muted font-inter">
            Appoint leaders for each team and view drafted players in real-time.
          </p>
        </div>

        <button
          id="admin-reset-all-rosters-btn"
          onClick={handleResetAll}
          disabled={resetting}
          className="px-3.5 py-2 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider
                     bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/60
                     transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
          title="Reset and clear all team rosters, captains, and drafted players"
        >
          <span>🗑️</span>
          <span>{resetting ? 'Resetting Rosters…' : 'Empty All Slots & Rosters'}</span>
        </button>
      </div>

      {resetMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-rajdhani font-bold uppercase tracking-wider border animate-fade-in
            ${resetMsg.startsWith('✓') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}
        >
          {resetMsg}
        </div>
      )}

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Lineup Slots',    value: `${totalRosterPlayers} / ${teams.length * MAX_ROSTER_SIZE}`, color: 'text-white' },
          { label: 'Franchise Captains',    value: `${activeCaptainsCount} Appointed`,                   color: 'text-amber-400' },
          { label: 'Auction Draft Slots',   value: `${totalDrafted} / ${teams.length * MAX_ROSTER_SIZE} (${totalAvailableAuctionSlots} Open)`, color: 'text-gold-400' },
          { label: 'Total Coins Spent',     value: `₣${totalCoinsSpent.toLocaleString()}`,                     color: 'text-fire-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-4 py-3 flex flex-col gap-0.5 border border-surface-600/40">
            <span className="text-[9px] text-muted font-inter uppercase tracking-widest">{label}</span>
            <span className={`font-rajdhani font-black text-xl leading-tight ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Team roster cards (4-slot grids) ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {teams.map((team) => (
          <TeamRosterCard
            key={team.id}
            team={team}
            allPlayers={players}
            onAppoint={onAppoint}
          />
        ))}
      </div>
    </div>
  );
}

export default TeamRosters;
