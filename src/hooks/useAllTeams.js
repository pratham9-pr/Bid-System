import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { isPlayerAssignedToTeam } from '../config/franchiseCaptains';

export function useAllTeams() {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTeams = async () => {
    try {
      const { data: teamRows, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .order('fire_coin_balance', { ascending: false });

      if (teamErr) throw teamErr;

      // Fetch drafted players to calculate true spent amount
      const { data: playersData } = await supabase
        .from('players')
        .select('id, sold_to_team_id, current_highest_bidder, sold_price, current_bid, is_captain, status, role');

      const normalized = (teamRows || []).map((t) => {
        const teamDrafted = (playersData || []).filter(
          (p) =>
            p.status === 'sold' &&
            !p.is_captain &&
            isPlayerAssignedToTeam(p, t.id)
        );
        const spent = teamDrafted.reduce((sum, p) => sum + (p.sold_price || p.current_bid || 0), 0);
        const balance = Math.max(0, 40000 - spent);
        return {
          ...t,
          matches_played: typeof t.matches_played === 'number' ? t.matches_played : 0,
          wins:           typeof t.wins === 'number' ? t.wins : 0,
          losses:         typeof t.losses === 'number' ? t.losses : 0,
          score_diff:     typeof t.score_diff === 'number' ? t.score_diff : 0,
          points:         typeof t.points === 'number' ? t.points : 0,
          fire_coin_balance: balance,
        };
      });

      setTeams(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const channelId = `all_teams_sub_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          fetchTeams();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { teams, loading, error, refetch: fetchTeams };
}
