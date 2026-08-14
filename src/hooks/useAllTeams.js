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

    const channelId = `all_teams_sub_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setTeams((prev) =>
              prev.map((t) =>
                String(t.id) === String(payload.new.id) ? { ...t, ...payload.new } : t
              )
            );
          } else if (payload.eventType === 'INSERT' && payload.new) {
            setTeams((prev) => [...prev, payload.new]);
          }
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
