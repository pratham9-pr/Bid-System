import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, subscribeToAuctionState, subscribeToTeams } from '../lib/supabaseClient';

const OWNER_SESSION_KEY = 'demons_reign_owner_session';

export default function OwnerPanel() {
  // ── Authentication & Franchise Selection State ──
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticatedTeam, setAuthenticatedTeam] = useState(null);

  // ── Real-Time Auction & Player State ──
  const [auctionState, setAuctionState] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidStatusMessage, setBidStatusMessage] = useState(null);

  // Load existing session on initial mount
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(OWNER_SESSION_KEY) || localStorage.getItem(OWNER_SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.id) {
          setAuthenticatedTeam(parsed);
          setSelectedTeamId(parsed.id);
        }
      }
    } catch (e) {
      console.error('Failed to parse cached owner session', e);
    }
  }, []);

  // Fetch all franchises from Supabase
  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // Fallback for team_name column if name doesn't exist
        const { data: fallbackData } = await supabase
          .from('teams')
          .select('*');
        if (fallbackData) setTeams(fallbackData);
      } else if (data) {
        setTeams(data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();

    // Subscribe to realtime team changes (balances, etc.)
    const unsubTeams = subscribeToTeams((payload) => {
      fetchTeams();
      if (payload.new && authenticatedTeam && (payload.new.id === authenticatedTeam.id)) {
        setAuthenticatedTeam((prev) => ({ ...prev, ...payload.new }));
      }
    });

    return () => {
      unsubTeams();
    };
  }, [fetchTeams, authenticatedTeam?.id]);

  // Keep authenticated team in sync with latest team list balance
  useEffect(() => {
    if (authenticatedTeam && teams.length > 0) {
      const live = teams.find((t) => String(t.id) === String(authenticatedTeam.id));
      if (live) {
        setAuthenticatedTeam((prev) => ({ ...prev, ...live }));
      }
    }
  }, [teams]);

  // Handle Login Submission
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');

    if (!selectedTeamId) {
      setAuthError('Please select your franchise from the roster.');
      return;
    }

    const matchedTeam = teams.find((t) => String(t.id) === String(selectedTeamId));
    if (!matchedTeam) {
      setAuthError('Selected franchise was not found.');
      return;
    }

    // Check passkey against access_pin or legacy password
    const validPin = matchedTeam.access_pin || matchedTeam.password || '';
    const cleanEntered = enteredPin.trim();

    if (!cleanEntered) {
      setAuthError('Please enter your 4 or 6-digit access PIN / Passkey.');
      return;
    }

    // Check exact match or case-insensitive match
    if (validPin && cleanEntered.toLowerCase() !== String(validPin).trim().toLowerCase()) {
      setAuthError('Invalid Access PIN. Please verify your team credentials.');
      return;
    }

    // Auth Successful
    setAuthenticatedTeam(matchedTeam);
    const sessionData = {
      id: matchedTeam.id,
      name: matchedTeam.name || matchedTeam.team_name,
      owner: matchedTeam.owner || matchedTeam.owner_name,
      access_pin: matchedTeam.access_pin || matchedTeam.password,
    };
    sessionStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(sessionData));
    setEnteredPin('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(OWNER_SESSION_KEY);
    localStorage.removeItem(OWNER_SESSION_KEY);
    setAuthenticatedTeam(null);
    setEnteredPin('');
    setAuthError('');
  };

  // ── Fetch & Subscribe to Auction State ──
  const fetchAuctionStateAndPlayer = useCallback(async () => {
    try {
      const { data: state, error } = await supabase
        .from('auction_state')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (state) {
        setAuctionState(state);

        // Fetch active player details if active_player_id exists
        const playerId = state.active_player_id || state.current_player_id;
        if (playerId) {
          const { data: player } = await supabase
            .from('players')
            .select('*')
            .eq('id', playerId)
            .maybeSingle();
          if (player) setActivePlayer(player);
        } else if (state.current_player_name) {
          // Virtual or inline player details
          setActivePlayer({
            id: 'staged-player',
            name: state.current_player_name,
            role: state.current_player_role || 'All-Rounder',
            base_price: state.base_bid || 1000,
          });
        } else {
          setActivePlayer(null);
        }
      }
    } catch (err) {
      console.error('Error fetching live auction state:', err);
    }
  }, []);

  useEffect(() => {
    fetchAuctionStateAndPlayer();

    const unsubAuction = subscribeToAuctionState((payload) => {
      if (payload.new) {
        setAuctionState(payload.new);
        fetchAuctionStateAndPlayer();
      }
    });

    return () => {
      unsubAuction();
    };
  }, [fetchAuctionStateAndPlayer]);

  // ── Derived Auction Metrics ──
  const currentBid = Number(auctionState?.current_bid || 0);
  const baseBid = Number(
    auctionState?.base_bid || activePlayer?.base_price || 1000
  );
  const bidIncrement = Number(auctionState?.bid_increment || 500);

  // If there are zero bids placed yet, next bid is the base price. Otherwise, current + increment.
  const nextBid = currentBid > 0 ? currentBid + bidIncrement : baseBid;

  const remainingBudget = Number(
    authenticatedTeam?.remaining_budget ??
    authenticatedTeam?.fire_coin_balance ??
    authenticatedTeam?.budget ??
    0
  );

  // Current leader resolution
  const highestBidderId =
    auctionState?.highest_bidder_team_id || auctionState?.highest_bidder_id;

  const highestBidderTeam = useMemo(() => {
    if (!highestBidderId) return null;
    return teams.find((t) => String(t.id) === String(highestBidderId));
  }, [highestBidderId, teams]);

  const isHighestBidder =
    authenticatedTeam &&
    highestBidderId &&
    String(highestBidderId).toLowerCase() === String(authenticatedTeam.id).toLowerCase();

  const isBiddingOpen = auctionState?.status === 'bidding';
  const hasSufficientBudget = remainingBudget >= nextBid;

  // Validation Reasons
  let disableReason = null;
  if (!isBiddingOpen) {
    disableReason =
      auctionState?.status === 'paused'
        ? 'Auction is currently PAUSED by Host'
        : auctionState?.status === 'sold'
        ? 'Player has been SOLD'
        : 'Bidding is currently IDLE';
  } else if (isHighestBidder) {
    disableReason = 'You currently hold the HIGHEST BID!';
  } else if (!hasSufficientBudget) {
    disableReason = `Insufficient Funds (Need ₣${nextBid.toLocaleString()}, Have ₣${remainingBudget.toLocaleString()})`;
  }

  // ── Place Bid Action ──
  const handlePlaceBid = async () => {
    if (!authenticatedTeam || !isBiddingOpen || isHighestBidder || !hasSufficientBudget) {
      return;
    }

    setBidLoading(true);
    setBidStatusMessage(null);

    try {
      // Fetch latest state right before write to prevent race condition
      const { data: latestState } = await supabase
        .from('auction_state')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const latestBid = Number(latestState?.current_bid || 0);
      const computedNext = latestBid > 0 ? latestBid + bidIncrement : baseBid;

      if (remainingBudget < computedNext) {
        throw new Error('Your remaining budget is insufficient for the updated bid.');
      }

      // Prepare resilient payload updating standard fields
      const payload = {
        current_bid: computedNext,
        highest_bidder_team_id: authenticatedTeam.id,
        status: 'bidding',
        updated_at: new Date().toISOString(),
      };

      // Also set highest_bidder_id if column exists
      try {
        const { error: updateError } = await supabase
          .from('auction_state')
          .update({
            ...payload,
            highest_bidder_id: authenticatedTeam.id,
          })
          .eq('id', 1);

        if (updateError) {
          // If error due to highest_bidder_id not being in table, retry with clean payload
          const { error: fallbackError } = await supabase
            .from('auction_state')
            .update(payload)
            .eq('id', 1);
          if (fallbackError) throw fallbackError;
        }
      } catch (innerErr) {
        const { error: retryError } = await supabase
          .from('auction_state')
          .update(payload)
          .eq('id', 1);
        if (retryError) throw retryError;
      }

      setBidStatusMessage({
        type: 'success',
        text: `Bid of ₣${computedNext.toLocaleString()} successfully placed!`,
      });
      setTimeout(() => setBidStatusMessage(null), 4000);
    } catch (err) {
      console.error('Bid error:', err);
      setBidStatusMessage({
        type: 'error',
        text: err.message || 'Failed to place bid. Please try again.',
      });
    } finally {
      setBidLoading(false);
      fetchAuctionStateAndPlayer();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: AUTHENTICATION GATE (If not authenticated)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!authenticatedTeam) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface-900/90 border border-surface-700/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Accent glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-fire-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="font-rajdhani font-black text-2xl text-white tracking-wider uppercase">
              Owner Bidding Room
            </h1>
            <p className="text-xs text-slate-400 font-inter mt-1 tracking-wide">
              Demons Reign Esports · Franchise Live Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Franchise Dropdown */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                Select Your Franchise
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={loadingTeams}
                className="w-full bg-surface-800/90 border border-surface-600/60 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/80 transition-colors font-inter"
              >
                <option value="">
                  {loadingTeams ? 'Loading franchises...' : '— Select Franchise Slot —'}
                </option>
                {teams.map((t) => {
                  const teamName = t.name || t.team_name || t.id;
                  const ownerName = t.owner || t.owner_name ? ` (${t.owner || t.owner_name})` : '';
                  return (
                    <option key={t.id} value={t.id}>
                      {teamName} {ownerName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Access Passkey / PIN
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Confidential</span>
              </div>
              <input
                type="password"
                placeholder="Enter 4-digit PIN or Passkey"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full bg-surface-800/90 border border-surface-600/60 rounded-xl px-4 py-3 text-sm text-white tracking-widest focus:outline-none focus:border-amber-500/80 transition-colors font-mono"
              />
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-inter flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loadingTeams}
              className="w-full py-3.5 px-6 rounded-xl font-rajdhani font-bold text-base tracking-wider uppercase bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Enter Bidding Room →
            </button>
          </form>

          {/* Quick instructions */}
          <div className="mt-8 pt-6 border-t border-surface-800 text-center">
            <p className="text-[11px] text-slate-500 font-inter">
              Credentials are distributed by the Tournament Host. Once logged in, your session persists automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: AUTHENTICATED REAL-TIME BIDDING ROOM
  // ─────────────────────────────────────────────────────────────────────────────
  const teamDisplayName =
    authenticatedTeam.name || authenticatedTeam.team_name || 'My Franchise';
  const teamOwnerName =
    authenticatedTeam.owner || authenticatedTeam.owner_name || 'Owner';
  const teamLogoUrl =
    authenticatedTeam.logo_url || authenticatedTeam.logo || null;

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-inter">
      {/* ── Top Header Navigation ── */}
      <header className="border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Franchise Logo / Emblem */}
          {teamLogoUrl ? (
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/40 bg-black flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex-shrink-0">
              <img
                src={teamLogoUrl}
                alt={teamDisplayName}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] flex-shrink-0">
              ⚡
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-rajdhani font-black text-lg text-white uppercase tracking-wider">
                Demons Reign Auction
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold animate-pulse">
                Live Sync
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-slate-400 font-mono">
                Franchise: <span className="text-amber-400 font-bold">{teamDisplayName}</span>
              </p>
              <span className="text-slate-600 font-mono text-[10px]">•</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Purse: ₣{remainingBudget.toLocaleString()} FC
              </span>
            </div>
          </div>
        </div>

        {/* Right Session Control */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{teamOwnerName}</span>
            <span className="text-[10px] font-mono text-slate-400">Authenticated Franchise</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-surface-700 hover:border-red-500/30 bg-surface-800 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            Switch Team ⏻
          </button>
        </div>
      </header>

      {/* ── Main Interactive Grid ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE PLAYER STAGE (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* Active Player Card */}
          <div className="bg-surface-900/90 border border-surface-700/60 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-sm">
            {/* Top Status Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  On The Auction Block
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  auctionState?.status === 'bidding'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : auctionState?.status === 'paused'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : auctionState?.status === 'sold'
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                    : 'bg-slate-500/10 border-slate-500/40 text-slate-400'
                }`}
              >
                ● {auctionState?.status || 'idle'}
              </span>
            </div>

            {activePlayer ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Player Photo / Avatar */}
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl bg-surface-800 border border-surface-600 flex items-center justify-center text-4xl shadow-inner relative overflow-hidden flex-shrink-0">
                  {activePlayer.photo_url || activePlayer.image_url ? (
                    <img
                      src={activePlayer.photo_url || activePlayer.image_url}
                      alt={activePlayer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-rajdhani font-black text-amber-500/80 text-4xl">
                      {activePlayer.name?.slice(0, 2)?.toUpperCase() || 'FF'}
                    </span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs py-0.5 text-center text-[10px] font-mono text-slate-300 uppercase">
                    {activePlayer.role || 'Player'}
                  </div>
                </div>

                {/* Player Details */}
                <div className="flex-1 text-center sm:text-left">
                  <span className="inline-block text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 mb-2">
                    {activePlayer.role || 'Pro Esports Athlete'}
                  </span>
                  <h2 className="font-rajdhani font-black text-3xl md:text-4xl text-white tracking-wide uppercase leading-tight">
                    {activePlayer.name}
                  </h2>
                  {activePlayer.in_game_name && activePlayer.in_game_name !== activePlayer.name && (
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      IGN: <span className="text-slate-200 font-semibold">{activePlayer.in_game_name}</span>
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-surface-800 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Base Price</span>
                      <span className="font-rajdhani font-black text-lg text-slate-200">
                        ₣{baseBid.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Min Increment</span>
                      <span className="font-rajdhani font-black text-lg text-amber-400">
                        +₣{bidIncrement.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <div className="text-4xl mb-3">⏳</div>
                <p className="font-rajdhani font-bold text-lg text-slate-300 uppercase">
                  Awaiting Next Player
                </p>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  The host has not placed any player on the auction stage yet.
                </p>
              </div>
            )}
          </div>

          {/* Current Highest Bid Banner */}
          <div className="bg-surface-900/90 border border-surface-700/60 rounded-3xl p-6 shadow-xl relative backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                  Current Highest Bid
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-rajdhani font-black text-4xl md:text-5xl text-amber-400 tracking-tight">
                    ₣{currentBid.toLocaleString()}
                  </span>
                  {currentBid === 0 && (
                    <span className="text-xs font-mono text-slate-500">(Opening Base)</span>
                  )}
                </div>
              </div>

              <div className="bg-surface-800/60 border border-surface-700/50 rounded-2xl p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Current Bidder Leader
                </span>
                {highestBidderTeam ? (
                  <div className="flex items-center gap-3">
                    {highestBidderTeam.logo_url ? (
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40 bg-black flex items-center justify-center p-0.5 flex-shrink-0 shadow-md">
                        <img
                          src={highestBidderTeam.logo_url}
                          alt={highestBidderTeam.name || highestBidderTeam.team_name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 font-mono text-xs flex-shrink-0">
                        👑
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-rajdhani font-black text-base text-white uppercase truncate">
                        {highestBidderTeam.name || highestBidderTeam.team_name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {highestBidderTeam.owner || highestBidderTeam.owner_name || 'Franchise'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-slate-500 italic">
                    No bids recorded yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: OWNER CONTROLLER & WALLET (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {/* Team Purse / Balance Card */}
          <div className="bg-gradient-to-br from-surface-800/90 to-surface-900/90 border border-surface-700/60 rounded-3xl p-6 shadow-xl relative backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {teamLogoUrl && (
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/20 bg-black flex items-center justify-center flex-shrink-0">
                    <img src={teamLogoUrl} alt={teamDisplayName} className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Franchise Purse
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                {teamDisplayName}
              </span>
            </div>

            <div className="my-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Remaining Fire Coins
              </span>
              <div className="font-rajdhani font-black text-4xl text-emerald-400 tracking-tight mt-0.5">
                ₣{remainingBudget.toLocaleString()}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-700/50 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Owner: <strong className="text-white">{teamOwnerName}</strong></span>
              <span>Status: <strong className="text-emerald-400">Authorized</strong></span>
            </div>
          </div>

          {/* BIDDING ACTION PANEL */}
          <div className="bg-surface-900/90 border border-surface-700/60 rounded-3xl p-6 md:p-8 shadow-2xl relative backdrop-blur-sm">
            <div className="text-center mb-6">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                Next Eligible Bid
              </span>
              <div className="font-rajdhani font-black text-5xl text-white tracking-tight">
                ₣{nextBid.toLocaleString()}
              </div>
              <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                {currentBid > 0 ? `Current ₣${currentBid.toLocaleString()} + ₣${bidIncrement.toLocaleString()}` : 'Opening Base Price'}
              </span>
            </div>

            {/* Notifications */}
            {bidStatusMessage && (
              <div
                className={`mb-5 p-3.5 rounded-xl border text-xs font-inter flex items-center gap-2 ${
                  bidStatusMessage.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
                }`}
              >
                <span>{bidStatusMessage.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{bidStatusMessage.text}</span>
              </div>
            )}

            {/* Disable Reason Feedback */}
            {disableReason && (
              <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono text-center">
                {disableReason}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handlePlaceBid}
              disabled={Boolean(disableReason) || bidLoading || !activePlayer}
              className={`w-full py-5 px-6 rounded-2xl font-rajdhani font-black text-xl md:text-2xl uppercase tracking-wider shadow-2xl transition-all transform active:scale-98 cursor-pointer ${
                disableReason || !activePlayer
                  ? 'bg-surface-800 text-slate-500 border border-surface-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)]'
              }`}
            >
              {bidLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Submitting Bid...
                </span>
              ) : isHighestBidder ? (
                'Highest Bidder 👑'
              ) : (
                `Place Bid (₣${nextBid.toLocaleString()})`
              )}
            </button>

            <p className="text-[11px] text-center text-slate-500 font-mono mt-4">
              All bids are atomically registered and broadcasted instantly to the tournament stream.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
