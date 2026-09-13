import { createClient } from '@supabase/supabase-js';

// =============================================================================
//  SUPABASE CLIENT CONFIGURATION
// =============================================================================
// Supports Next.js environment variables (process.env.NEXT_PUBLIC_*)
// with fallback support for Vite environments (import.meta.env).

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://idfljitxybmeagrcramx.supabase.co';

const supabaseAnonKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_7v1z9spU7arRk0QpTgkX0A_8Mj0KawU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Error] Missing Supabase URL or Anon Key. Check your environment variables.');
}

/**
 * Shared Supabase Client Instance
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

// =============================================================================
//  HELPER REALTIME SUBSCRIPTION LISTENERS
// =============================================================================

/**
 * Subscribes to real-time changes on the singleton 'auction_state' table.
 *
 * @param {Function} callback - Callback function receiving the change payload: (payload) => void
 * @param {Object} [options]
 * @param {string} [options.event='*'] - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {string} [options.channelName] - Optional custom channel name
 * @returns {Function} unsubscribe - Cleanup function to call on unmount (e.g., in useEffect)
 *
 * @example
 * useEffect(() => {
 *   const unsubscribe = subscribeToAuctionState((payload) => {
 *     console.log('Auction state changed:', payload.new);
 *   });
 *   return () => unsubscribe();
 * }, []);
 */
export function subscribeToAuctionState(callback, options = {}) {
  const { event = '*', channelName } = options;
  const uniqueChannel = channelName || `realtime_auction_state_${Math.random().toString(36).substring(2, 9)}`;

  const channel = supabase
    .channel(uniqueChannel)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: 'auction_state',
      },
      (payload) => {
        callback?.(payload);
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn(`[Realtime:auction_state] Channel error (${status}):`, err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes on the 'teams' table.
 *
 * @param {Function} callback - Callback function receiving the change payload: (payload) => void
 * @param {Object} [options]
 * @param {string} [options.event='*'] - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {string} [options.channelName] - Optional custom channel name
 * @returns {Function} unsubscribe - Cleanup function to call on unmount
 *
 * @example
 * useEffect(() => {
 *   const unsubscribe = subscribeToTeams((payload) => {
 *     console.log('Teams updated:', payload);
 *   });
 *   return () => unsubscribe();
 * }, []);
 */
export function subscribeToTeams(callback, options = {}) {
  const { event = '*', channelName } = options;
  const uniqueChannel = channelName || `realtime_teams_${Math.random().toString(36).substring(2, 9)}`;

  const channel = supabase
    .channel(uniqueChannel)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: 'teams',
      },
      (payload) => {
        callback?.(payload);
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.warn(`[Realtime:teams] Channel error (${status}):`, err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to real-time changes for a specific team by its UUID/ID.
 *
 * @param {string} teamId - Target team ID
 * @param {Function} callback - Callback function receiving the team payload
 * @returns {Function} unsubscribe - Cleanup function to remove the channel
 */
export function subscribeToTeamById(teamId, callback) {
  if (!teamId) return () => {};

  const uniqueChannel = `realtime_team_${teamId}_${Math.random().toString(36).substring(2, 9)}`;

  const channel = supabase
    .channel(uniqueChannel)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `id=eq.${teamId}`,
      },
      (payload) => {
        callback?.(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Composite listener subscribing to both 'auction_state' and 'teams'
 * in a single convenient subscription.
 *
 * @param {Object} handlers
 * @param {Function} [handlers.onAuctionStateChange]
 * @param {Function} [handlers.onTeamsChange]
 * @returns {Function} unsubscribe - Cleans up the composite channel
 */
export function subscribeToAuctionFloor({ onAuctionStateChange, onTeamsChange }) {
  const uniqueChannel = `realtime_floor_${Math.random().toString(36).substring(2, 9)}`;

  const channel = supabase
    .channel(uniqueChannel)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'auction_state' },
      (payload) => onAuctionStateChange?.(payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'teams' },
      (payload) => onTeamsChange?.(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export default supabase;
