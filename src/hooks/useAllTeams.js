import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * useAllTeams (Supabase Realtime)
 * Fetches all teams sorted by fire_coin_balance descending.
 */
export function useAllTeams() {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('fire_coin_balance', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const channel = supabase
      .channel('all_teams_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
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
