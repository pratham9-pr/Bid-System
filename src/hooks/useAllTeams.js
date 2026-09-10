import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { isPlayerAssignedToTeam } from '../config/franchiseCaptains';
import { TEAMS_CONFIG, getTeamLogo } from '../config/teamsConfig';

export function useAllTeams(tournamentIdParam = null) {
  const { id: routeId } = useParams();
  const activeId = tournamentIdParam || routeId;
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      let teamQuery = supabase.from('teams').select('*');
      if (activeId) {
        teamQuery = teamQuery.eq('tournament_id', activeId);
      }
      const { data: teamRows, error: teamErr } = await teamQuery;

      if (teamErr && (!teamRows || teamRows.length === 0)) {
        console.warn('useAllTeams query warning:', teamErr);
      }

      // Fetch drafted players to calculate true spent amount
      let playersQuery = supabase
        .from('players')
        .select('id, sold_to_team_id, current_highest_bidder, sold_price, current_bid, is_captain, status, role');
      if (activeId) {
        playersQuery = playersQuery.eq('tournament_id', activeId);
      }
      const { data: playersData } = await playersQuery;

      const existingRows = teamRows || [];

      // Dynamically map over teams fetched from the database
      const mergedTeams = existingRows.map((found, idx) => {
        const teamId = found.id || `team_${idx + 1}`;
        const teamDrafted = (playersData || []).filter(
          (p) =>
            p.status === 'sold' &&
            !p.is_captain &&
            isPlayerAssignedToTeam(p, teamId)
        );
        const spent = teamDrafted.reduce((sum, p) => sum + (p.sold_price || p.current_bid || 0), 0);
        const startingPurse = found.purse ?? found.fire_coin_balance ?? 40000;
        const balance = Math.max(0, startingPurse - spent);

        const rawDiff = found.score_diff ?? found.diff;
        const diffNum = rawDiff != null
          ? (typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : Number(rawDiff) || 0)
          : 0;

        const winsNum = typeof found.wins === 'number' ? found.wins : 0;
        const lossesNum = typeof found.losses === 'number' ? found.losses : 0;
        const ptsNum = typeof found.points === 'number'
          ? found.points
          : (typeof found.pts === 'number' ? found.pts : 0);

        return {
          ...found,
          id: teamId,
          team_name: found.team_name || found.name || `Team ${idx + 1}`,
          owner_name: found.owner_name || found.owner || 'Franchise Owner',
          owner_email: found.owner_email || `${teamId}@tournament.auction`,
          matches_played: typeof found.matches_played === 'number'
            ? found.matches_played
            : (winsNum + lossesNum),
          wins: winsNum,
          losses: lossesNum,
          score_diff: diffNum,
          diff: diffNum,
          points: ptsNum,
          pts: ptsNum,
          fire_coin_balance: balance,
          logo: found.logo_url || found.logo || getTeamLogo(teamId),
        };
      });

      setTeams(mergedTeams);
      setError(null);
    } catch (err) {
      console.warn('useAllTeams fetch error:', err);
      const isFetchError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      setError(
        isFetchError
          ? 'Unable to connect to team database. Using cached franchise data.'
          : (err.message || 'Error loading teams.')
      );
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchTeams();

    const channelId = `teams_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => fetchTeams()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => fetchTeams()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        () => fetchTeams()
      )
      .on(
        'broadcast',
        { event: 'standings_updated' },
        () => fetchTeams()
      )
      .subscribe();

    // Fast 1.5-second polling fallback for rock-solid OBS Broadcast synchronization
    const pollInterval = setInterval(() => {
      fetchTeams();
    }, 1500);

    const onFocus = () => fetchTeams();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      supabase.removeChannel(channel);
    };
  }, [fetchTeams]);

  return { teams, loading, error, refetch: fetchTeams };
}
