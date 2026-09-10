import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";
import { TournamentContext } from "../context/TournamentContext";

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="w-10 h-10 rounded-xl border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
);

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * TournamentAdminDashboard
 *
 * Reached at /admin/tournament/:id after launching a tournament from the wizard.
 * Loads the tournament record and its registered teams from Supabase.
 */
export default function TournamentAdminDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams]           = useState([]);
  const [players, setPlayers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch tournament record using active :id from URL
        const { data: t, error: tErr } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .single();
        if (tErr) throw tErr;
        if (isMounted) setTournament(t);

        // Fetch all teams belonging to this tournament
        const { data: ts, error: tsErr } = await supabase
          .from("teams")
          .select("*")
          .eq("tournament_id", id)
          .order("name");
        if (tsErr) throw tsErr;
        if (isMounted) setTeams(ts ?? []);

        // Fetch all players belonging to this tournament
        const { data: ps, error: psErr } = await supabase
          .from("players")
          .select("*")
          .eq("tournament_id", id)
          .order("in_game_name");
        if (psErr) throw psErr;
        if (isMounted) setPlayers(ps ?? []);
      } catch (err) {
        console.error("[TournamentAdminDashboard] Load failed:", err);
        if (isMounted) setError(err?.message || "Failed to load tournament data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    // Realtime subscriptions filtered by active tournament id
    const channelId = `admin_dash_${id}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` },
        () => { if (isMounted) load(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `tournament_id=eq.${id}` },
        () => { if (isMounted) load(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `tournament_id=eq.${id}` },
        () => { if (isMounted) load(); }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Keep browser tab title in sync with active tournament
  useEffect(() => {
    if (tournament?.name) {
      document.title = `${tournament.name} — Tournament Dashboard`;
    }
  }, [tournament?.name]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#08080f] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <p className="text-white/60 text-sm max-w-xs">{error ?? "Tournament not found."}</p>
        <button
          onClick={() => navigate("/admin")}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium
            bg-white/8 border border-white/10 text-white hover:bg-white/12
            hover:border-white/20 transition-all duration-200"
        >
          ← Back to Admin
        </button>
      </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <TournamentContext.Provider value={{ tournament, teams, players, loading }}>
      <div className="min-h-screen bg-[#08080f] text-white">
        {/* Ambient glow */}
        <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2
          w-[600px] h-64 rounded-full bg-purple-600/10 blur-3xl" />

        {/* Header */}
        <header className="relative border-b border-white/8 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black italic uppercase tracking-widest text-purple-400 mb-0.5">
              OFFICIAL TOURNAMENT DASHBOARD
            </p>
            <h1 className="font-rajdhani font-black italic text-2xl sm:text-3xl text-white tracking-wider uppercase leading-none drop-shadow-[0_2px_12px_rgba(168,85,247,0.3)]">
              {tournament.name}
            </h1>
            <p className="font-rajdhani font-bold text-xs text-purple-300/60 uppercase tracking-widest mt-1">
              {tournament.sport_type}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              border border-white/10 text-white/50 hover:text-white hover:border-white/20
              hover:bg-white/5 transition-all duration-200"
          >
            ← Admin Home
          </button>
        </header>

        {/* Stats bar */}
        <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Sport",          value: tournament.sport_type },
            {
              label: "Starting Purse",
              value: `₹${Number(tournament.starting_purse).toLocaleString("en-IN")}`,
            },
            { label: "Max Players",    value: `${tournament.max_players} / team` },
            { label: "Franchises",     value: teams.length },
            { label: "Player Pool",    value: players.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/[0.03] border border-white/8 p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Teams table */}
        <div className="px-6 pb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
            Franchises ({teams.length})
          </h2>

          {teams.length === 0 ? (
            <p className="text-white/30 text-sm">No franchises registered yet.</p>
          ) : (
            <div className="rounded-2xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.02]">
                    {["#", "Team Name", "Owner"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-white/40 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                      Purse
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, idx) => (
                    <tr
                      key={team.id}
                      className="border-b border-white/5 last:border-none hover:bg-white/[0.02]
                        transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5 text-white/30 font-mono text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{team.name || team.team_name}</td>
                      <td className="px-5 py-3.5 text-white/60">{team.owner || team.owner_name || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-purple-300">
                        ₹{Number(team.purse ?? team.fire_coin_balance ?? 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Players table */}
        <div className="px-6 pb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
            Registered Players Pool ({players.length})
          </h2>

          {players.length === 0 ? (
            <p className="text-white/30 text-sm">No players registered yet.</p>
          ) : (
            <div className="rounded-2xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.02]">
                    {["#", "Player Name", "Role"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-white/40 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                      Base Price
                    </th>
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, idx) => (
                    <tr
                      key={player.id || idx}
                      className="border-b border-white/5 last:border-none hover:bg-white/[0.02]
                        transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5 text-white/30 font-mono text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-white">{player.in_game_name || player.name}</td>
                      <td className="px-5 py-3.5 text-white/60">{player.role || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-purple-300">
                        ₹{Number(player.base_price || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs uppercase text-white/50">
                        {player.status || "upcoming"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TournamentContext.Provider>
  );
}
