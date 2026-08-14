import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * useAllTeams (Supabase Realtime)
 * Fetches all teams sorted by fire_coin_balance descending.
 */
function normalizeTeam(t) {
  if (!t) return t;
  let balance = typeof t.fire_coin_balance === 'number' ? t.fire_coin_balance : 40000;
  // If legacy balance exceeds 40,000 (e.g. 50,000 starting or 48,000 where 2000 was spent), recalculate from 40k base
  if (balance > 40000) {
    const spent = Math.max(0, 50000 - balance);
    balance = Math.max(0, 40000 - spent);
  }
  return { ...t, fire_coin_balance: balance };
}

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
            p.role !== 'IGL' &&
            (p.sold_price > 0 || p.current_bid > 0) &&
            (String(p.sold_to_team_id) === String(t.id) || String(p.current_highest_bidder) === String(t.id))
        );
        const spent = teamDrafted.reduce((sum, p) => sum + (p.sold_price || p.current_bid || 0), 0);
        const balance = Math.max(0, 40000 - spent);
        return { ...t, fire_coin_balance: balance };
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
