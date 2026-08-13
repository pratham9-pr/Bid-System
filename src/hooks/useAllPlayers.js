import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * useAllPlayers (Supabase Realtime)
 * Fetches all players and subscribes to any INSERT/UPDATE/DELETE.
 */
export function useAllPlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('in_game_name', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();

    const channel = supabase
      .channel('all_players_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { players, loading, error, refetch: fetchPlayers };
}
