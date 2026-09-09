import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { isPlayerAssignedToTeam } from '../config/franchiseCaptains';
import { TEAMS_CONFIG, getTeamLogo } from '../config/teamsConfig';

export function useAllTeams() {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      const { data: teamRows, error: teamErr } = await supabase
        .from('teams')
        .select('*');

      if (teamErr && (!teamRows || teamRows.length === 0)) {
        console.warn('useAllTeams query warning:', teamErr);
      }

      // Fetch drafted players to calculate true spent amount
      const { data: playersData } = await supabase
        .from('players')
        .select('id, sold_to_team_id, current_highest_bidder, sold_price, current_bid, is_captain, status, role');

      const existingRows = teamRows || [];

      // Guarantee all 4 franchise teams from TEAMS_CONFIG are always represented
      const mergedTeams = TEAMS_CONFIG.map((config, idx) => {
        const found = existingRows.find((r) => {
          const rId = String(r.id || '').toLowerCase().trim();
          const rName = String(r.team_name || r.name || '').toLowerCase().trim();
          return (
            rId === config.id ||
            config.aliases?.includes(rId) ||
            rName === config.name.toLowerCase() ||
            config.aliases?.some((a) => rName.includes(a))
          );
        }) || {};

        const teamId = found.id || config.id;
        const teamDrafted = (playersData || []).filter(
          (p) =>
            p.status === 'sold' &&
            !p.is_captain &&
            isPlayerAssignedToTeam(p, teamId)
        );
        const spent = teamDrafted.reduce((sum, p) => sum + (p.sold_price || p.current_bid || 0), 0);
        const balance = Math.max(0, 40000 - spent);

        const defaultStats = config.defaultStats || { wins: 0, losses: 0, diff: 0, pts: 0 };
        const rawDiff = found.score_diff ?? found.diff;
        const diffNum = rawDiff != null
          ? (typeof rawDiff === 'string' ? parseInt(rawDiff.replace('+', ''), 10) || 0 : Number(rawDiff) || 0)
          : (typeof defaultStats.diff === 'string' ? parseInt(defaultStats.diff.replace('+', ''), 10) || 0 : (defaultStats.diff || 0));

        const winsNum = typeof found.wins === 'number' ? found.wins : defaultStats.wins;
        const lossesNum = typeof found.losses === 'number' ? found.losses : defaultStats.losses;
        const ptsNum = typeof found.points === 'number'
          ? found.points
          : (typeof found.pts === 'number' ? found.pts : defaultStats.pts);

        return {
          id: teamId,
          team_name: found.team_name || found.name || config.name,
          owner_name: found.owner_name || found.owner || config.owner,
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
          logo: getTeamLogo(teamId),
          ...found,
          id: teamId,
          score_diff: diffNum,
          diff: diffNum,
          fire_coin_balance: balance,
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
  }, []);

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
