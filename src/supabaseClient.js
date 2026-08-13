import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idfljitxybmeagrcramx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7v1z9spU7arRk0QpTgkX0A_8Mj0KawU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
