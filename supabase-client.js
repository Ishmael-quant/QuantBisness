import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
let client = null;

if (isSupabaseConfigured) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Add your Supabase project URL and anon key in supabase-config.js.');
  }
  return supabase;
}
