import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase";

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
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch tournament record
        const { data: t, error: tErr } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .single();
        if (tErr) throw tErr;
        setTournament(t);

        // Fetch all teams belonging to this tournament
        const { data: ts, error: tsErr } = await supabase
          .from("teams")
          .select("*")
          .eq("tournament_id", id)
          .order("name");
        if (tsErr) throw tsErr;
        setTeams(ts ?? []);
      } catch (err) {
        console.error("[TournamentAdminDashboard] Load failed:", err);
        setError(err?.message || "Failed to load tournament data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

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
    <div className="min-h-screen bg-[#08080f] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2
        w-[600px] h-64 rounded-full bg-purple-600/10 blur-3xl" />

      {/* Header */}
      <header className="relative border-b border-white/8 px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/70 mb-0.5">
            Tournament Dashboard
          </p>
          <h1 className="text-xl font-bold tracking-tight">{tournament.name}</h1>
          <p className="text-xs text-white/40 mt-0.5">{tournament.sport_type}</p>
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
      <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Sport",          value: tournament.sport_type },
          {
            label: "Starting Purse",
            value: `₹${Number(tournament.starting_purse).toLocaleString("en-IN")}`,
          },
          { label: "Max Players",    value: `${tournament.max_players} / team` },
          { label: "Franchises",     value: teams.length },
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
      <div className="px-6 pb-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
          Franchises
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
                    <td className="px-5 py-3.5 font-medium text-white">{team.name}</td>
                    <td className="px-5 py-3.5 text-white/60">{team.owner || "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-purple-300">
                      ₹{Number(team.purse).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
