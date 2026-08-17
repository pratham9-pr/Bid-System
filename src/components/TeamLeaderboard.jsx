import React from 'react';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo } from '../config/teamsConfig';

export function TeamLeaderboard({ teams = [] }) {
  const activeTeamsList = (teams && teams.length > 0 ? teams : TEAMS_CONFIG).map((t, idx) => {
    const config = TEAMS_CONFIG.find((c) => c.id === t.id) || TEAMS_CONFIG[idx] || {};
    const teamId = t.id || config.id;
    const displayName = getTeamDisplayName(teamId, t.team_name || t.name || config.name);
    const ownerName = getTeamOwner(teamId, t.owner_name || t.owner || config.owner);
    const logoUrl = getTeamLogo(teamId);
    const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: '0', pts: 0 };

    const wins = typeof t.wins === 'number' ? t.wins : defaultStats.wins;
    const losses = typeof t.losses === 'number' ? t.losses : defaultStats.losses;
    const rawDiff = t.score_diff ?? t.diff ?? defaultStats.diff;
    const diffNum = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (rawDiff || 0);
    const pts = typeof t.points === 'number' ? t.points : (typeof t.pts === 'number' ? t.pts : defaultStats.pts);
    const balance = t.fire_coin_balance ?? 40000;

    return {
      ...t,
      teamId,
      displayName,
      ownerName,
      logoUrl,
      wins,
      losses,
      diff: diffNum,
      formattedDiff: diffNum > 0 ? `+${diffNum}` : `${diffNum}`,
      pts,
      balance,
    };
  });

  const sorted = [...activeTeamsList].sort((a, b) => {
    const ptsA = Number(a.pts) || 0;
    const ptsB = Number(b.pts) || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;

    const diffA = Number(a.diff) || 0;
    const diffB = Number(b.diff) || 0;
    if (diffB !== diffA) return diffB - diffA;

    const winsA = Number(a.wins) || 0;
    const winsB = Number(b.wins) || 0;
    if (winsB !== winsA) return winsB - winsA;

    const balA = Number(a.balance) || 0;
    const balB = Number(b.balance) || 0;
    return balB - balA;
  });

  return (
    <div
      style={{
        clipPath: 'polygon(0% 0%, calc(100% - 20px) 0%, 100% 20px, 100% 100%, 20px 100%, 0% calc(100% - 20px))',
      }}
      className="bg-[#0c0d12] border-2 border-white/15 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] font-rajdhani select-none relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black italic text-xl text-white tracking-widest uppercase">
              DEMONS REIGN LEADERBOARD
            </h2>
            <span
              style={{
                clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              }}
              className="bg-amber-500 text-black font-black italic text-[10px] px-2.5 py-0.5 uppercase"
            >
              LIVE STANDINGS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-0.5">
            OFFICIAL STAGE POINTS TABLE
          </p>
        </div>

        <a
          href="/leaderboard"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-black italic tracking-wider text-amber-400 hover:text-white px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 transition-colors uppercase flex items-center gap-1.5"
        >
          <span>↗ OPEN OBS BROADCAST</span>
        </a>
      </div>

      {/* Table Column Headers */}
      <div
        style={{
          clipPath: 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, 12px 100%, 0% calc(100% - 12px))',
        }}
        className="w-full bg-[#13151f] border-t border-b border-white/10 px-4 py-2 flex items-center justify-between text-slate-400 font-black italic tracking-widest text-xs uppercase mb-3"
      >
        <div className="w-16 text-center">RANK</div>
        <div className="flex-1 pl-3 text-left">FRANCHISE TEAM</div>
        <div className="w-12 text-center">W</div>
        <div className="w-12 text-center">L</div>
        <div className="w-16 text-center">DIFF</div>
        <div className="w-20 text-center text-amber-400">PTS</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2.5">
        {sorted.map((team, index) => {
          const rank = index + 1;
          const isRank1 = rank === 1;
          const isRank2 = rank === 2;

          const rowStyles = isRank1
            ? 'bg-gradient-to-r from-amber-500/25 via-yellow-600/15 to-[#0e0d08] border-2 border-yellow-500/80 shadow-[0_0_25px_rgba(234,179,8,0.2)]'
            : isRank2
            ? 'bg-gradient-to-r from-sky-500/20 via-slate-400/10 to-[#080d14] border-2 border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
            : 'bg-gradient-to-r from-[#14151c] via-[#101117] to-[#0a0a0d] border border-white/10 hover:border-white/20';

          return (
            <div
              key={team.teamId}
              style={{
                clipPath: 'polygon(0% 0%, calc(100% - 14px) 0%, 100% 14px, 100% 100%, 14px 100%, 0% calc(100% - 14px))',
              }}
              className={`w-full py-2.5 px-4 flex items-center justify-between transition-all ${rowStyles}`}
            >
              {/* Rank */}
              <div className="w-16 flex items-center justify-center">
                <div
                  style={{
                    clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)',
                  }}
                  className={`px-3 py-1 flex items-center justify-center gap-1 font-black italic text-sm
                    ${isRank1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'
                      : isRank2 ? 'bg-gradient-to-r from-sky-300 to-cyan-500 text-black'
                      : 'bg-surface-800 text-slate-300 border border-white/10'}`}
                >
                  #{rank}
                </div>
              </div>

              {/* Team Info */}
              <div className="flex-1 pl-3 flex items-center gap-3 min-w-0">
                <div
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                  className="w-9 h-9 p-0.5 flex-shrink-0 flex items-center justify-center bg-black border border-white/20"
                >
                  <img
                    src={team.logoUrl}
                    alt={team.displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className={`font-black italic text-base sm:text-lg uppercase tracking-wider truncate leading-tight
                    ${isRank1 ? 'text-gradient-gold' : 'text-white'}`}>
                    {team.displayName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold truncate">
                    Owner: <span className="text-amber-300">{team.ownerName}</span>
                  </p>
                </div>
              </div>

              {/* W */}
              <div className="w-12 text-center font-black italic text-base text-emerald-400 tabular-nums">
                {team.wins}
              </div>

              {/* L */}
              <div className="w-12 text-center font-black italic text-base text-rose-400 tabular-nums">
                {team.losses}
              </div>

              {/* DIFF */}
              <div className="w-16 text-center font-black italic text-sm tabular-nums">
                <span className={team.diff > 0 ? 'text-emerald-300' : team.diff < 0 ? 'text-rose-300' : 'text-slate-300'}>
                  {team.formattedDiff}
                </span>
              </div>

              {/* PTS */}
              <div className="w-20 text-center flex items-center justify-center">
                <span className={`font-black italic text-2xl tabular-nums
                  ${isRank1 ? 'text-gradient-gold drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]'
                    : isRank2 ? 'text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]'
                    : 'text-slate-100'}`}>
                  {team.pts}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
