import React, { useState, useEffect } from 'react';
import { supabase, subscribeToAuctionState, subscribeToTeams } from '../lib/supabaseClient';
import { useAllTeams } from '../hooks/useAllTeams';

export function HostTournamentSetup({ onRefresh }) {
  const { teams: existingTeams, refetch: refetchTeams } = useAllTeams();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DYNAMIC ROSTER GENERATOR STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [teamCount, setTeamCount] = useState(4);
  const [teamSlots, setTeamSlots] = useState(() => [
    { team_name: 'Team Alpha', owner_name: 'Captain 1', budget: 40000, access_pin: '1001' },
    { team_name: 'Team Beta', owner_name: 'Captain 2', budget: 40000, access_pin: '1002' },
    { team_name: 'Team Gamma', owner_name: 'Captain 3', budget: 40000, access_pin: '1003' },
    { team_name: 'Team Delta', owner_name: 'Captain 4', budget: 40000, access_pin: '1004' },
  ]);
  const [savingTeams, setSavingTeams] = useState(false);
  const [teamSaveMsg, setTeamSaveMsg] = useState(null);

  // Two-step Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isResettingTeams, setIsResettingTeams] = useState(false);

  // Sync team slots when count changes
  const handleTeamCountChange = (count) => {
    const num = Math.max(2, Math.min(16, parseInt(count, 10) || 2));
    setTeamCount(num);
    setTeamSlots((prev) => {
      const updated = [];
      for (let i = 0; i < num; i++) {
        if (prev[i]) {
          updated.push({ ...prev[i] });
        } else {
          updated.push({
            team_name: `Team ${String.fromCharCode(65 + i)}`,
            owner_name: `Owner ${i + 1}`,
            budget: 40000,
            access_pin: Math.floor(1000 + Math.random() * 9000).toString(),
          });
        }
      }
      return updated;
    });
  };

  const handleSlotChange = (index, field, value) => {
    setTeamSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Utility: Generate random 4-digit PINs for all slots
  const generateRandomPins = () => {
    const usedPins = new Set();
    setTeamSlots((prev) =>
      prev.map((slot) => {
        let pin;
        do {
          pin = Math.floor(1000 + Math.random() * 9000).toString();
        } while (usedPins.has(pin));
        usedPins.add(pin);
        return { ...slot, access_pin: pin };
      })
    );
  };

  // Save all configured teams to Supabase
  const handleSaveTeams = async (e) => {
    if (e) e.preventDefault();
    setSavingTeams(true);
    setTeamSaveMsg(null);

    try {
      // Validate inputs
      for (let i = 0; i < teamSlots.length; i++) {
        const slot = teamSlots[i];
        if (!slot.team_name.trim() || !slot.owner_name.trim() || !slot.access_pin.trim()) {
          throw new Error(`Team Slot #${i + 1} has empty fields.`);
        }
      }

      const rowsToInsert = teamSlots.map((slot) => ({
        team_name: slot.team_name.trim(),
        owner_name: slot.owner_name.trim(),
        budget: Number(slot.budget) || 40000,
        remaining_budget: Number(slot.budget) || 40000,
        fire_coin_balance: Number(slot.budget) || 40000,
        access_pin: String(slot.access_pin).trim().slice(0, 6),
        matches_played: 0,
        wins: 0,
        losses: 0,
        score_diff: 0,
        points: 0,
      }));

      const { data, error } = await supabase
        .from('teams')
        .insert(rowsToInsert)
        .select();

      if (error) throw error;

      setTeamSaveMsg({ ok: true, text: `Successfully registered ${rowsToInsert.length} teams!` });
      await refetchTeams();
      onRefresh?.();
      setTimeout(() => setTeamSaveMsg(null), 4000);
    } catch (err) {
      setTeamSaveMsg({ ok: false, text: err.message || 'Failed to save teams' });
    } finally {
      setSavingTeams(false);
    }
  };

  // Execute two-step hard reset of all teams
  const handleExecuteResetTeams = async () => {
    if (resetConfirmationText !== 'RESET') return;
    setIsResettingTeams(true);

    try {
      // Delete all teams from Supabase
      const { error } = await supabase
        .from('teams')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        // Fallback for non-UUID id types
        await supabase.from('teams').delete().neq('team_name', '___NON_MATCHING___');
      }

      // Reset auction state to idle
      await supabase
        .from('auction_state')
        .update({
          status: 'idle',
          current_player_name: null,
          current_player_role: null,
          current_bid: 0,
          highest_bidder_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      setShowResetModal(false);
      setResetConfirmationText('');
      setTeamSaveMsg({ ok: true, text: 'All teams successfully deleted from database!' });
      await refetchTeams();
      onRefresh?.();
    } catch (err) {
      alert('Error resetting teams: ' + err.message);
    } finally {
      setIsResettingTeams(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. LIVE AUCTION CONTROLLER STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [auctionState, setAuctionState] = useState(null);
  const [stagingPlayer, setStagingPlayer] = useState({
    name: 'Skylord Prime',
    role: 'Rusher',
    basePrice: 1000,
    bidIncrement: 500,
  });
  const [controllerLoading, setControllerLoading] = useState(false);
  const [controllerMsg, setControllerMsg] = useState(null);

  // Sync live auction_state via Realtime
  useEffect(() => {
    async function fetchState() {
      const { data } = await supabase.from('auction_state').select('*').eq('id', 1).maybeSingle();
      if (data) setAuctionState(data);
    }
    fetchState();

    const unsubAuction = subscribeToAuctionState((payload) => {
      if (payload.new) setAuctionState(payload.new);
    });

    return () => {
      unsubAuction();
    };
  }, []);

  // Controller Actions
  const handleStagePlayer = async (e) => {
    if (e) e.preventDefault();
    if (!stagingPlayer.name.trim()) return;
    setControllerLoading(true);

    try {
      const baseBid = Number(stagingPlayer.basePrice) || 1000;
      const increment = Number(stagingPlayer.bidIncrement) || 500;

      const payload = {
        id: 1,
        status: 'idle',
        current_player_name: stagingPlayer.name.trim(),
        current_player_role: stagingPlayer.role,
        base_bid: baseBid,
        current_bid: 0,
        highest_bidder_id: null,
        bid_increment: increment,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('auction_state')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setControllerMsg({ ok: true, text: `Staged: ${stagingPlayer.name} (${stagingPlayer.role})` });
      setTimeout(() => setControllerMsg(null), 3500);
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  const handleStartBidding = async () => {
    setControllerLoading(true);
    try {
      const baseBid = auctionState?.base_bid || stagingPlayer.basePrice || 1000;
      const { error } = await supabase
        .from('auction_state')
        .update({
          status: 'bidding',
          current_bid: baseBid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!auctionState) return;
    setControllerLoading(true);
    try {
      const newStatus = auctionState.status === 'paused' ? 'bidding' : 'paused';
      const { error } = await supabase
        .from('auction_state')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  const handleSellPlayer = async (winnerTeamId = null) => {
    setControllerLoading(true);
    try {
      const targetTeamId = winnerTeamId || auctionState?.highest_bidder_id;
      if (!targetTeamId) {
        throw new Error('No winning team selected or bidding on this player.');
      }

      const sellPrice = Number(auctionState?.current_bid || auctionState?.base_bid || 0);

      // Fetch winning team's current budget
      const { data: teamData, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', targetTeamId)
        .maybeSingle();

      if (tErr || !teamData) throw new Error('Winning team record not found.');

      const currentRemaining = teamData.remaining_budget ?? teamData.budget ?? 40000;
      const newRemaining = Math.max(0, currentRemaining - sellPrice);

      // 1. Deduct sellPrice from winning team's remaining_budget
      const { error: teamUpdateErr } = await supabase
        .from('teams')
        .update({
          remaining_budget: newRemaining,
          budget: newRemaining,
          fire_coin_balance: newRemaining,
          last_bid_time: new Date().toISOString(),
        })
        .eq('id', targetTeamId);

      if (teamUpdateErr) throw teamUpdateErr;

      // 2. Mark auction_state as sold
      const { error: stateErr } = await supabase
        .from('auction_state')
        .update({
          status: 'sold',
          highest_bidder_id: targetTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (stateErr) throw stateErr;

      setControllerMsg({
        ok: true,
        text: `Player SOLD to ${teamData.team_name} for ₣${sellPrice.toLocaleString()}! Remaining: ₣${newRemaining.toLocaleString()}`,
      });
      await refetchTeams();
      onRefresh?.();
      setTimeout(() => setControllerMsg(null), 4500);
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  const handlePassUnsold = async () => {
    setControllerLoading(true);
    try {
      const { error } = await supabase
        .from('auction_state')
        .update({
          status: 'unsold',
          highest_bidder_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
      setControllerMsg({ ok: true, text: 'Player passed as UNSOLD.' });
      setTimeout(() => setControllerMsg(null), 3000);
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  const handleResetFloor = async () => {
    setControllerLoading(true);
    try {
      const { error } = await supabase
        .from('auction_state')
        .update({
          status: 'idle',
          current_player_name: null,
          current_player_role: null,
          current_bid: 0,
          highest_bidder_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
      setControllerMsg({ ok: true, text: 'Auction floor cleared to IDLE.' });
      setTimeout(() => setControllerMsg(null), 2500);
    } catch (err) {
      setControllerMsg({ ok: false, text: err.message });
    } finally {
      setControllerLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CREDENTIALS SUMMARY PANEL (Printable / Copyable)
  // ─────────────────────────────────────────────────────────────────────────────
  const [copiedPin, setCopiedPin] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyPinToClipboard = (pin, teamName) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(teamName);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const copyAllCredentials = () => {
    const list = (existingTeams && existingTeams.length > 0 ? existingTeams : teamSlots);
    const text = list
      .map(
        (t, idx) =>
          `Team ${idx + 1}: ${t.team_name || t.name}\nOwner: ${t.owner_name || t.owner}\nStarting Budget: ₣${(t.budget || 40000).toLocaleString()} FC\nAccess PIN: ${t.access_pin || 'N/A'}\n----------------------------------`
      )
      .join('\n');

    navigator.clipboard.writeText(`=== DEMONS REIGN AUCTION PASSKEYS ===\n\n${text}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const printCredentials = () => {
    window.print();
  };

  // Winning team name lookup
  const currentWinningTeam = (existingTeams || []).find(
    (t) => t.id === auctionState?.highest_bidder_id
  );

  return (
    <div className="space-y-8 animate-fade-in font-rajdhani">
      {/* ===================================================================== */}
      {/* SECTION 1: DYNAMIC ROSTER GENERATOR                                   */}
      {/* ===================================================================== */}
      <div className="p-6 rounded-3xl bg-surface-800/90 border border-surface-600/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-600/50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-fire-400">
              Tournament Configuration
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Dynamic Team Roster Generator
            </h2>
            <p className="text-xs text-muted font-inter mt-0.5">
              Set participating team count, configure franchise owners, and generate secure 4-digit PINs.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generateRandomPins}
              className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Assign a random 4-digit PIN to each team slot"
            >
              <span>🎲</span> Generate Random PINs
            </button>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Delete all registered teams from the database"
            >
              <span>⚠️</span> Reset All Teams
            </button>
          </div>
        </div>

        {/* Team Count Selector & Presets */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Total Participating Teams:
            </span>
            <input
              type="number"
              min={2}
              max={16}
              value={teamCount}
              onChange={(e) => handleTeamCountChange(e.target.value)}
              className="w-16 px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white font-bold text-center focus:outline-none focus:border-fire-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500">Presets:</span>
            {[4, 6, 8, 10, 12].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => handleTeamCountChange(cnt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  teamCount === cnt
                    ? 'bg-fire-500 text-black shadow-md'
                    : 'bg-surface-700/60 hover:bg-surface-700 text-slate-300'
                }`}
              >
                {cnt} Teams
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Slots Form Grid */}
        <form onSubmit={handleSaveTeams} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamSlots.map((slot, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-900/90 border border-surface-700/60 hover:border-fire-500/40 transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-surface-800 text-slate-400">
                    Slot #{idx + 1}
                  </span>
                  <span className="text-[11px] font-bold text-amber-400 font-mono">
                    PIN: {slot.access_pin || '----'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={slot.team_name}
                      onChange={(e) => handleSlotChange(idx, 'team_name', e.target.value)}
                      placeholder="e.g. Phoenix Elite"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold focus:outline-none focus:border-fire-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                      Owner / Captain Name
                    </label>
                    <input
                      type="text"
                      value={slot.owner_name}
                      onChange={(e) => handleSlotChange(idx, 'owner_name', e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-medium focus:outline-none focus:border-fire-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Starting Budget
                      </label>
                      <input
                        type="number"
                        value={slot.budget}
                        onChange={(e) => handleSlotChange(idx, 'budget', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-gold-400 font-bold tabular-nums focus:outline-none focus:border-gold-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        4-Digit PIN
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={slot.access_pin}
                        onChange={(e) => handleSlotChange(idx, 'access_pin', e.target.value)}
                        placeholder="1234"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-amber-300 font-mono font-bold text-center tracking-widest focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Save Button & Status Banner */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingTeams}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-fire-600 to-amber-600 hover:from-fire-500 hover:to-amber-500 text-white text-sm font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
              >
                {savingTeams ? 'Deploying Teams to Database…' : '🚀 Deploy & Register Teams'}
              </button>
              <span className="text-[11px] text-slate-400 font-inter">
                Total Purse: ₣{(teamSlots.reduce((sum, s) => sum + (Number(s.budget) || 0), 0)).toLocaleString()} FC
              </span>
            </div>

            {teamSaveMsg && (
              <div
                className={`px-4 py-2 rounded-xl text-xs font-bold animate-fade-in ${
                  teamSaveMsg.ok
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {teamSaveMsg.ok ? '✓ ' : '✕ '} {teamSaveMsg.text}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: LIVE AUCTION CONTROLLER                                    */}
      {/* ===================================================================== */}
      <div className="p-6 rounded-3xl bg-surface-800/90 border border-surface-600/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-600/50">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
              Broadcast Source of Truth
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Live Auction Controller (auction_state)
            </h2>
            <p className="text-xs text-muted font-inter mt-0.5">
              Stage players, control bidding clocks, and execute real-time purse deductions upon selling.
            </p>
          </div>

          {/* Current Live Status Pill */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Floor Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md ${
                auctionState?.status === 'bidding'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 animate-pulse'
                  : auctionState?.status === 'paused'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : auctionState?.status === 'sold'
                  ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                  : 'bg-surface-700 border-surface-600 text-slate-400'
              }`}
            >
              ● {auctionState?.status || 'IDLE'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Stage a Player */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-surface-900/90 border border-surface-700/60 space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-fire-400 block border-b border-surface-800 pb-2">
              Stage Next Player
            </span>

            <form onSubmit={handleStagePlayer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Player In-Game Name
                </label>
                <input
                  type="text"
                  value={stagingPlayer.name}
                  onChange={(e) => setStagingPlayer({ ...stagingPlayer, name: e.target.value })}
                  placeholder="e.g. Total Gaming"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-bold focus:outline-none focus:border-fire-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Role / Category
                </label>
                <select
                  value={stagingPlayer.role}
                  onChange={(e) => setStagingPlayer({ ...stagingPlayer, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-amber-300 font-bold focus:outline-none focus:border-fire-500"
                >
                  <option value="Rusher">Rusher</option>
                  <option value="Sniper">Sniper</option>
                  <option value="IGL">IGL (Captain/Leader)</option>
                  <option value="Supporter">Supporter</option>
                  <option value="All-Rounder">All-Rounder</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Base Bid (₣)
                  </label>
                  <input
                    type="number"
                    value={stagingPlayer.basePrice}
                    onChange={(e) => setStagingPlayer({ ...stagingPlayer, basePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-gold-400 font-bold tabular-nums focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Bid Increment (₣)
                  </label>
                  <input
                    type="number"
                    value={stagingPlayer.bidIncrement}
                    onChange={(e) => setStagingPlayer({ ...stagingPlayer, bidIncrement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-emerald-400 font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={controllerLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-white font-black uppercase tracking-wider text-xs border border-white/15 transition-all cursor-pointer shadow-md"
              >
                Stage to Floor
              </button>
            </form>
          </div>

          {/* Right Controller: Live Action Center */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-surface-900/90 border border-surface-700/60 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-surface-800">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Live Stage Monitor
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  Singleton ID: 1
                </span>
              </div>

              {/* Display Current Player & Highest Bid */}
              <div className="mt-4 p-4 rounded-xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Current Player on Floor
                  </span>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-wide mt-0.5">
                    {auctionState?.current_player_name || 'No player currently staged'}
                  </h3>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-800 text-amber-400 border border-amber-500/20">
                    {auctionState?.current_player_role || 'Unspecified'}
                  </span>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Current Highest Bid
                  </span>
                  <div className="flex items-center sm:justify-end gap-1 text-2xl font-black text-gold-400 tabular-nums">
                    <span>₣</span>
                    <span>{(auctionState?.current_bid || auctionState?.base_bid || 0).toLocaleString()}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 block truncate max-w-[200px]">
                    Leader: {currentWinningTeam?.team_name || 'Awaiting First Bid'}
                  </span>
                </div>
              </div>
            </div>

            {/* Controller Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleStartBidding}
                  disabled={controllerLoading || !auctionState?.current_player_name}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  ▶ Start Bid
                </button>

                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={controllerLoading || !auctionState?.current_player_name}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  {auctionState?.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSellPlayer()}
                  disabled={controllerLoading || !auctionState?.current_player_name}
                  className="py-2.5 px-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-black font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  🔨 Sell Player
                </button>

                <button
                  type="button"
                  onClick={handlePassUnsold}
                  disabled={controllerLoading || !auctionState?.current_player_name}
                  className="py-2.5 px-3 rounded-xl bg-surface-700 hover:bg-surface-600 text-slate-300 font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-md"
                >
                  🚫 Pass Unsold
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-800">
                <button
                  type="button"
                  onClick={handleResetFloor}
                  disabled={controllerLoading}
                  className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
                >
                  Clear Floor to Idle
                </button>

                {controllerMsg && (
                  <span
                    className={`text-[11px] font-bold ${
                      controllerMsg.ok ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {controllerMsg.ok ? '✓ ' : '✕ '} {controllerMsg.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 3: CREDENTIALS SUMMARY PANEL (Printable & Copyable)           */}
      {/* ===================================================================== */}
      <div className="p-6 rounded-3xl bg-surface-800/90 border border-surface-600/60 shadow-xl backdrop-blur-xl print:bg-white print:text-black print:p-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-600/50 print:border-black">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 print:text-black">
              Host Distribution Panel
            </span>
            <h2 className="text-xl font-black uppercase tracking-wider text-white print:text-black">
              Team Credentials & Passkeys Summary
            </h2>
            <p className="text-xs text-muted font-inter mt-0.5 print:text-gray-600">
              Print or copy these 4-digit PINs for team owners to authenticate into the live bidding floor.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={copyAllCredentials}
              className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-white/20 bg-surface-700 hover:bg-surface-600 text-white transition-all cursor-pointer shadow-sm"
            >
              {copiedAll ? '✓ Copied All!' : '📋 Copy All'}
            </button>

            <button
              type="button"
              onClick={printCredentials}
              className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-all cursor-pointer shadow-sm"
            >
              🖨️ Print Sheet
            </button>
          </div>
        </div>

        {/* Credentials Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-700 text-slate-400 uppercase text-[10px] tracking-wider print:border-black print:text-black">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Team Name</th>
                <th className="py-2.5 px-3">Owner Name</th>
                <th className="py-2.5 px-3">Starting Budget</th>
                <th className="py-2.5 px-3">Remaining Budget</th>
                <th className="py-2.5 px-3 text-center">Access PIN</th>
                <th className="py-2.5 px-3 text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50 font-bold print:divide-black">
              {(existingTeams && existingTeams.length > 0 ? existingTeams : teamSlots).map((t, idx) => {
                const pin = t.access_pin || '1234';
                const startingBudget = t.budget || 40000;
                const remainingBudget = t.remaining_budget ?? t.fire_coin_balance ?? startingBudget;

                return (
                  <tr
                    key={t.id || idx}
                    className="hover:bg-surface-700/20 transition-colors print:hover:bg-transparent"
                  >
                    <td className="py-3 px-3 text-slate-500 font-mono print:text-black">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-3 uppercase text-white font-black print:text-black">
                      {t.team_name || t.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium print:text-black">
                      {t.owner_name || t.owner}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-gold-400 print:text-black">
                      ₣{startingBudget.toLocaleString()} FC
                    </td>
                    <td className="py-3 px-3 tabular-nums text-emerald-400 print:text-black">
                      ₣{remainingBudget.toLocaleString()} FC
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg bg-black/80 text-amber-300 font-mono text-sm tracking-widest border border-amber-500/30 print:border-black print:bg-white print:text-black">
                        {pin}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => copyPinToClipboard(pin, t.team_name || t.name)}
                        className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-surface-700 hover:bg-surface-600 text-slate-300 transition-colors cursor-pointer"
                      >
                        {copiedPin === (t.team_name || t.name) ? '✓ Copied' : 'Copy PIN'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TWO-STEP RESET CONFIRMATION MODAL                                     */}
      {/* ===================================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl bg-surface-900 border border-red-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 pb-3 border-b border-surface-800">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">
                  Two-Step Hard Reset Verification
                </h3>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                  Destructive Database Action
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-inter leading-relaxed">
              This action will permanently delete all registered teams from the database and reset the
              active auction floor. Existing owner logins, rosters, and passkeys will be wiped.
            </p>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs">
              <span className="text-slate-400 font-bold block mb-1">
                To confirm deletion, please type <strong className="text-red-400 font-mono">RESET</strong> below:
              </span>
              <input
                type="text"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                placeholder="Type RESET..."
                className="w-full px-3 py-2 rounded-lg bg-black/80 border border-red-500/30 text-white font-mono text-center font-bold tracking-widest focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmationText('');
                }}
                disabled={isResettingTeams}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-surface-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteResetTeams}
                disabled={resetConfirmationText !== 'RESET' || isResettingTeams}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg"
              >
                {isResettingTeams ? 'Deleting Teams…' : 'Final Confirmation: Wipe All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostTournamentSetup;
