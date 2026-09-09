import { createClient } from '@supabase/supabase-js';

// ============================================================
//  Supabase Configuration - Tournament Platform Auction Series
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idfljitxybmeagrcramx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7v1z9spU7arRk0QpTgkX0A_8Mj0KawU';

const safeFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (err) {
    console.warn('[Supabase Fetch Warning] Network connection error:', err.message);
    throw err;
  }
};

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
  global: {
    fetch: safeFetch,
  },
});

console.info('[Supabase] Initialized client for:', supabaseUrl);

export default supabase;
