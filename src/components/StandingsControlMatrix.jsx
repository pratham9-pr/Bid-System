import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { getTeamDisplayName, getTeamOwner, getTeamLogo, TEAMS_CONFIG, getTeamConfig } from '../config/teamsConfig';

export function StandingsControlMatrix({ teams = [], onRefresh }) {
  const [standingsData, setStandingsData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { success: boolean, message: string }
  const isDirtyRef = useRef(false);

  // Broadcast helper to immediately notify all overlay clients
  const broadcastStandingsUpdate = async () => {
    try {
      const channel = supabase.channel('teams_realtime_broadcast_bus');
      await channel.send({
        type: 'broadcast',
        event: 'standings_updated',
        payload: { timestamp: Date.now() },
      });
    } catch (e) {
      console.warn('Broadcast sync notice warning:', e);
    }
  };

  // Sync from teams or fallback to TEAMS_CONFIG so host can always edit
  useEffect(() => {
    // If user is currently editing, do not clobber their unsaved inputs
    if (isDirtyRef.current) return;

    const matrix = {};
    (teams || []).forEach((team) => {
      const liveId = team.id;
      const rawDiff = team.score_diff ?? team.diff ?? 0;
      const numDiff = typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : (Number(rawDiff) || 0);

      const wins = typeof team.wins === 'number' ? team.wins : 0;
      const losses = typeof team.losses === 'number' ? team.losses : 0;
      const points = typeof team.points === 'number'
        ? team.points
        : (typeof team.pts === 'number' ? team.pts : 0);

      matrix[liveId] = {
        id: liveId,
        name: getTeamDisplayName(liveId, team.team_name || team.name),
        owner: getTeamOwner(liveId, team.owner_name || team.owner),
        logo: team.logo_url || team.logo || getTeamLogo(liveId),
        matches_played: Number(team.matches_played ?? (wins + losses)),
        wins: Number(wins),
        losses: Number(losses),
        score_diff: numDiff,
        points: Number(points),
        balance: team.fire_coin_balance ?? 40000,
      };
    });

    setStandingsData(matrix);
  }, [teams]);

  // Handler for numerical changes
  const handleFieldChange = (liveTeamId, field, value) => {
    isDirtyRef.current = true;
    const num = parseInt(value, 10);
    setStandingsData((prev) => ({
      ...prev,
      [liveTeamId]: {
        ...prev[liveTeamId],
        [field]: isNaN(num) ? 0 : num,
      },
    }));
  };

  const handleStep = (liveTeamId, field, delta) => {
    isDirtyRef.current = true;
    setStandingsData((prev) => {
      const current = prev[liveTeamId]?.[field] ?? 0;
      const next = current + delta;
      return {
        ...prev,
        [liveTeamId]: {
          ...prev[liveTeamId],
          [field]: field === 'score_diff' ? next : Math.max(0, next),
        },
      };
    });
  };

  // Auto-calculate Points helper: (Wins * 3) + Math.floor(Diff / 5)
  const handleAutoCalcPoints = (liveTeamId) => {
    isDirtyRef.current = true;
    setStandingsData((prev) => {
      const team = prev[liveTeamId];
      if (!team) return prev;
      const calculatedPts = (team.wins * 3) + Math.max(0, Math.floor(team.score_diff / 5));
      return {
        ...prev,
        [liveTeamId]: {
          ...team,
          points: Math.max(0, calculatedPts),
        },
      };
    });
  };

  // Direct Supabase Upsert by live database team.id
  const handleSaveTeam = async (liveTeamId) => {
    setSaving(true);
    setSaveStatus(null);
    const item = standingsData[liveTeamId];
    if (!item) {
      setSaving(false);
      return;
    }

    try {
      const payload = {
        id: liveTeamId,
        team_name: item.name || getTeamDisplayName(liveTeamId),
        owner_name: item.owner || getTeamOwner(liveTeamId),
        owner_email: `${liveTeamId}@tournament.auction`,
        matches_played: parseInt(item.matches_played, 10) || ((parseInt(item.wins, 10) || 0) + (parseInt(item.losses, 10) || 0)),
        wins:           parseInt(item.wins, 10) || 0,
        losses:         parseInt(item.losses, 10) || 0,
        score_diff:     parseInt(item.score_diff, 10) || 0,
        points:         parseInt(item.points, 10) || 0,
        fire_coin_balance: item.balance ?? 40000,
      };

      const { error } = await supabase
        .from('teams')
        .upsert(payload, { onConflict: 'id' });

      setSaving(false);

      if (error) {
        // Fallback: try direct update only
        const { error: updateErr } = await supabase
          .from('teams')
          .update({
            matches_played: payload.matches_played,
            wins: payload.wins,
            losses: payload.losses,
            score_diff: payload.score_diff,
            points: payload.points,
          })
          .eq('id', liveTeamId);

        if (updateErr) {
          setSaveStatus({
            success: false,
            message: `Database Error: ${error.message}. Standings saved to memory.`,
          });
        } else {
          isDirtyRef.current = false;
          setSaveStatus({ success: true, message: `Updated ${item.name} in database successfully!` });
          await broadcastStandingsUpdate();
          onRefresh?.();
          setTimeout(() => setSaveStatus(null), 3500);
        }
      } else {
        isDirtyRef.current = false;
        setSaveStatus({ success: true, message: `Updated ${item.name} in database successfully!` });
        await broadcastStandingsUpdate();
        onRefresh?.();
        setTimeout(() => setSaveStatus(null), 3500);
      }
    } catch (err) {
      setSaving(false);
      setSaveStatus({ success: false, message: `Exception: ${err.message}` });
    }
  };

  // Save all teams simultaneously by their exact live database team.id
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const entries = Object.entries(standingsData);
      const errors = [];

      for (const [liveTeamId, item] of entries) {
        const payload = {
          id: liveTeamId,
          team_name: item.name || getTeamDisplayName(liveTeamId),
          owner_name: item.owner || getTeamOwner(liveTeamId),
          owner_email: `${liveTeamId}@tournament.auction`,
          matches_played: parseInt(item.matches_played, 10) || ((parseInt(item.wins, 10) || 0) + (parseInt(item.losses, 10) || 0)),
          wins:           parseInt(item.wins, 10) || 0,
          losses:         parseInt(item.losses, 10) || 0,
          score_diff:     parseInt(item.score_diff, 10) || 0,
          points:         parseInt(item.points, 10) || 0,
          fire_coin_balance: item.balance ?? 40000,
        };

        const { error } = await supabase
          .from('teams')
          .upsert(payload, { onConflict: 'id' });

        if (error) {
          // Fallback update
          await supabase
            .from('teams')
            .update({
              matches_played: payload.matches_played,
              wins: payload.wins,
              losses: payload.losses,
              score_diff: payload.score_diff,
              points: payload.points,
            })
            .eq('id', liveTeamId);
        }
      }

      setSaving(false);
      isDirtyRef.current = false;
      setSaveStatus({ success: true, message: 'All live franchise standings saved and broadcast to overlay!' });
      await broadcastStandingsUpdate();
      onRefresh?.();
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaving(false);
      setSaveStatus({ success: false, message: `Exception: ${err.message}` });
    }
  };

  // Reset all live teams in database
  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to reset all team match records and points to 0?')) return;
    setSaving(true);

    try {
      const resetEntries = (teams || []).map((team) => ({
        id: team.id,
        team_name: team.team_name || team.name,
        owner_name: team.owner_name || team.owner,
        owner_email: team.owner_email || `${team.id}@tournament.auction`,
        matches_played: 0,
        wins: 0,
        losses: 0,
        score_diff: 0,
        points: 0,
        fire_coin_balance: 40000,
      }));

      await supabase
        .from('teams')
        .upsert(resetEntries, { onConflict: 'id' });

      setSaving(false);
      isDirtyRef.current = false;
      setSaveStatus({ success: true, message: 'All team standings successfully reset to 0 in database.' });
      await broadcastStandingsUpdate();
      onRefresh?.();
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err) {
      setSaving(false);
      setSaveStatus({ success: false, message: `Exception: ${err.message}` });
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
            Real-time database updates for Wins, Losses, Differential, and Points (queries live database table directly by ID).
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

      {/* ── 4-Team Dynamic Input Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {teams.map((team) => {
          const liveTeamId = team.id;
          const item = standingsData[liveTeamId] || {
            id: liveTeamId,
            name: getTeamDisplayName(liveTeamId, team.team_name || team.name),
            owner: getTeamOwner(liveTeamId, team.owner_name || team.owner),
            logo: getTeamLogo(liveTeamId),
            matches_played: 0,
            wins: 0,
            losses: 0,
            score_diff: 0,
            points: 0,
          };

          const cleanName = (item.name || '').toUpperCase();
          const isPower = cleanName.includes('POWER') || cleanName.includes('ALPHA');
          const isVortex = cleanName.includes('VORTEX') || cleanName.includes('BETA');
          const isAbyssal = cleanName.includes('ABYSSAL') || cleanName.includes('EBON') || cleanName.includes('GAMMA');

          const accentBorder = isPower
            ? 'border-amber-500/40 hover:border-amber-400'
            : isVortex
            ? 'border-sky-500/40 hover:border-sky-400'
            : isAbyssal
            ? 'border-emerald-500/40 hover:border-emerald-400'
            : 'border-purple-500/40 hover:border-purple-400';

          return (
            <div
              key={liveTeamId}
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
                      src={item.logo}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black italic text-lg sm:text-xl text-white uppercase tracking-wider truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      Owner: <span className="text-amber-300">{item.owner}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveTeam(liveTeamId)}
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
                      onClick={() => handleStep(liveTeamId, 'wins', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.wins}
                      onChange={(e) => handleFieldChange(liveTeamId, 'wins', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-lg text-emerald-300 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(liveTeamId, 'wins', 1)}
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
                      onClick={() => handleStep(liveTeamId, 'losses', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.losses}
                      onChange={(e) => handleFieldChange(liveTeamId, 'losses', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-lg text-rose-300 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(liveTeamId, 'losses', 1)}
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
                      onClick={() => handleStep(liveTeamId, 'score_diff', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-white font-black text-xs flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.score_diff}
                      onChange={(e) => handleFieldChange(liveTeamId, 'score_diff', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-base text-slate-200 focus:outline-none"
                    />
                    <button
                      onClick={() => handleStep(liveTeamId, 'score_diff', 1)}
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
                      onClick={() => handleStep(liveTeamId, 'points', -1)}
                      className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.points}
                      onChange={(e) => handleFieldChange(liveTeamId, 'points', e.target.value)}
                      className="w-12 bg-transparent text-center font-black italic text-xl text-amber-300 focus:outline-none tabular-nums"
                    />
                    <button
                      onClick={() => handleStep(liveTeamId, 'points', 1)}
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
                  onClick={() => handleAutoCalcPoints(liveTeamId)}
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
