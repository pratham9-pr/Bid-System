import React, { useState, useEffect } from 'react';
import { TEAMS_CONFIG, getTeamDisplayName, getTeamOwner, getTeamLogo } from '../config/teamsConfig';
import { updateTeamStandings, updateAllTeamStandings, resetAllTeamStandings } from '../services/auctionService';

export function StandingsControlMatrix({ teams = [], onRefresh }) {
  const [standingsData, setStandingsData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { success: boolean, message: string }

  // Sync teams state into local matrix state on load or change
  useEffect(() => {
    const matrix = {};
    TEAMS_CONFIG.forEach((config) => {
      const dbMatch = (teams || []).find(
        (t) =>
          String(t.id).toLowerCase() === config.id.toLowerCase() ||
          config.aliases?.includes(String(t.id).toLowerCase())
      );

      const defaults = config.defaultStats || { wins: 0, losses: 0, diff: '0', pts: 0 };
      const rawDiff = dbMatch?.score_diff ?? defaults.diff;
      const numDiff = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (rawDiff || 0);

      matrix[config.id] = {
        id: dbMatch?.id || config.id,
        name: config.name,
        owner: config.owner,
        logo: config.logo,
        matches_played: dbMatch?.matches_played ?? (defaults.wins + defaults.losses),
        wins: dbMatch?.wins ?? defaults.wins,
        losses: dbMatch?.losses ?? defaults.losses,
        score_diff: numDiff,
        points: dbMatch?.points ?? defaults.pts,
      };
    });
    setStandingsData(matrix);
  }, [teams]);

  // Handler for stepper / input changes
  const handleFieldChange = (teamId, field, value) => {
    const num = parseInt(value, 10);
    setStandingsData((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: isNaN(num) ? 0 : num,
      },
    }));
  };

  const handleStep = (teamId, field, delta) => {
    setStandingsData((prev) => {
      const current = prev[teamId]?.[field] ?? 0;
      const next = current + delta;
      return {
        ...prev,
        [teamId]: {
          ...prev[teamId],
          [field]: field === 'score_diff' ? next : Math.max(0, next),
        },
      };
    });
  };

  // Auto-calculate Points helper: Wins * 2 (or custom)
  const handleAutoCalcPoints = (teamId) => {
    setStandingsData((prev) => {
      const team = prev[teamId];
      if (!team) return prev;
      const calculatedPts = (team.wins * 3) + Math.max(0, Math.floor(team.score_diff / 5));
      return {
        ...prev,
        [teamId]: {
          ...team,
          points: Math.max(0, calculatedPts),
        },
      };
    });
  };

  // Save single team to Supabase
  const handleSaveTeam = async (teamId) => {
    setSaving(true);
    setSaveStatus(null);
    const item = standingsData[teamId];
    if (!item) return;

    const res = await updateTeamStandings(item.id || teamId, item);
    setSaving(false);
    if (res.success) {
      setSaveStatus({ success: true, message: `Updated ${item.name} stats successfully!` });
      onRefresh?.();
      setTimeout(() => setSaveStatus(null), 3500);
    } else {
      setSaveStatus({ success: false, message: `Failed to update ${item.name}: ${res.error}` });
    }
  };

  // Save all 4 teams to Supabase simultaneously
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveStatus(null);
    const items = Object.values(standingsData);
    const res = await updateAllTeamStandings(items);
    setSaving(false);

    if (res.success) {
      setSaveStatus({ success: true, message: 'All 4 Franchise Standings updated and broadcast live!' });
      onRefresh?.();
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus({ success: false, message: `Error updating standings: ${res.error}` });
    }
  };

  // Reset all to 0
  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to reset all team match records and points to 0?')) return;
    setSaving(true);
    const res = await resetAllTeamStandings();
    setSaving(false);
    if (res.success) {
      setSaveStatus({ success: true, message: 'All standings successfully reset to 0.' });
      onRefresh?.();
      setTimeout(() => setSaveStatus(null), 3500);
    } else {
      setSaveStatus({ success: false, message: res.error || 'Failed to reset standings' });
    }
  };

  return (
    <div className="space-y-6 font-rajdhani">
      {/* ── Header Control Bar ────────────────────────────────────────── */}
      <div
        style={{
          clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 16px, 100% 100%, 16px 100%, 0% calc(100% - 16px))',
        }}
        className="p-5 bg-[#0e1017] border-2 border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black italic text-xl sm:text-2xl text-white tracking-widest uppercase">
              STANDINGS & MATCH MATRIX CONTROLS
            </h2>
            <span
              style={{
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}
              className="bg-amber-500 text-black font-black italic text-[10px] px-2.5 py-0.5 uppercase tracking-wider"
            >
              HOST PANEL
            </span>
          </div>
          <p className="text-xs text-slate-400 font-inter mt-0.5">
            Adjust Wins, Losses, Score Differential, and Total Points. Changes instantly sync to the 1080p OBS Broadcast.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAll}
            disabled={saving}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 hover:border-red-600 font-black italic text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            ↺ ZERO ALL STATS
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black italic text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <span>💾 SAVE & BROADCAST ALL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Toast ──────────────────────────────────────────────── */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
            saveStatus.success
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/50 border-red-500/50 text-red-300'
          }`}
        >
          <span>{saveStatus.message}</span>
          <button onClick={() => setSaveStatus(null)} className="text-slate-400 hover:text-white font-black text-sm">
            ✕
          </button>
        </div>
      )}

      {/* ── 4-Team Input Matrix Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {TEAMS_CONFIG.map((config) => {
          const item = standingsData[config.id] || {
            matches_played: 0,
            wins: 0,
            losses: 0,
            score_diff: 0,
            points: 0,
          };

          const isPower = config.id.includes('alpha');
          const isVortex = config.id.includes('beta');
          const isAbyssal = config.id.includes('gamma');

          const accentBorder = isPower
            ? 'border-amber-500/40 hover:border-amber-400'
            : isVortex
            ? 'border-sky-500/40 hover:border-sky-400'
            : isAbyssal
            ? 'border-emerald-500/40 hover:border-emerald-400'
            : 'border-purple-500/40 hover:border-purple-400';

          return (
            <div
              key={config.id}
              style={{
                clipPath: 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 16px, 100% 100%, 16px 100%, 0% calc(100% - 16px))',
              }}
              className={`bg-[#11131a] border-2 ${accentBorder} p-4 sm:p-5 shadow-lg flex flex-col justify-between gap-4 relative overflow-hidden transition-all`}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                    className="w-10 h-10 bg-black border border-white/20 p-0.5 flex-shrink-0 flex items-center justify-center"
                  >
                    <img
                      src={config.logo}
                      alt={config.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black italic text-lg sm:text-xl text-white uppercase tracking-wider truncate">
                      {config.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Owner: <span className="text-amber-300">{config.owner}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveTeam(config.id)}
                  disabled={saving}
                  className="px-3 py-1 bg-surface-800 hover:bg-surface-700 text-slate-200 hover:text-white border border-white/20 hover:border-amber-400 font-black italic text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  SAVE
                </button>
              </div>

              {/* ── Inputs Matrix (MP, W, L, DIFF, PTS) ────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Wins (W) */}
                <div className="bg-black/50 p-2.5 rounded-lg border border-emerald-500/20 flex flex-col items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                    WINS (W)
                  </span>
                  <div className="flex items-center gap-1.5 my-1.5">
                    <button
                      onClick={() => handleStep(config.id, 'wins', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.wins}
                      onChange={(e) => handleFieldChange(config.id, 'wins', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-lg text-emerald-300 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(config.id, 'wins', 1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Losses (L) */}
                <div className="bg-black/50 p-2.5 rounded-lg border border-rose-500/20 flex flex-col items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase">
                    LOSSES (L)
                  </span>
                  <div className="flex items-center gap-1.5 my-1.5">
                    <button
                      onClick={() => handleStep(config.id, 'losses', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.losses}
                      onChange={(e) => handleFieldChange(config.id, 'losses', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-lg text-rose-300 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(config.id, 'losses', 1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Score Diff (+/-) */}
                <div className="bg-black/50 p-2.5 rounded-lg border border-white/10 flex flex-col items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">
                    DIFF (+/-)
                  </span>
                  <div className="flex items-center gap-1.5 my-1.5">
                    <button
                      onClick={() => handleStep(config.id, 'score_diff', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.score_diff}
                      onChange={(e) => handleFieldChange(config.id, 'score_diff', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-base text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(config.id, 'score_diff', 1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total Points (PTS) */}
                <div className="bg-black/70 p-2.5 rounded-lg border-2 border-amber-500/50 flex flex-col items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                    POINTS (PTS)
                  </span>
                  <div className="flex items-center gap-1.5 my-1.5">
                    <button
                      onClick={() => handleStep(config.id, 'points', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.points}
                      onChange={(e) => handleFieldChange(config.id, 'points', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-xl text-amber-300 focus:outline-none tabular-nums"
                    />
                    <button
                      onClick={() => handleStep(config.id, 'points', 1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action Strip */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
                <span>Total Matches: {(item.wins || 0) + (item.losses || 0)}</span>
                <button
                  onClick={() => handleAutoCalcPoints(config.id)}
                  className="text-amber-400 hover:text-amber-300 font-black uppercase tracking-wider text-[10px] underline cursor-pointer"
                >
                  ⚡ Auto-Calc PTS (3×W + Diff)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
