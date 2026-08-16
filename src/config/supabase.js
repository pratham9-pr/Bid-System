import { createClient } from '@supabase/supabase-js';

// ============================================================
//  Supabase Configuration - Demons Reign Auction Series
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idfljitxybmeagrcramx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7v1z9spU7arRk0QpTgkX0A_8Mj0KawU';

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

console.info('[Supabase] Initialized client for:', supabaseUrl);

export default supabase;
