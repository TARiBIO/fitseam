import { createClient } from '@supabase/supabase-js';

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const looksReal = (v) => !!v && !v.includes('YOUR_') && !v.includes('_HERE');

export const hasSupabase = looksReal(URL) && looksReal(KEY);

export const supabase = hasSupabase
  ? createClient(URL, KEY, { auth: { persistSession: false } })
  : null;

if (!hasSupabase && typeof console !== 'undefined') {
  console.info('[fitseam] Supabase env vars missing — falling back to localStorage. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local.');
}
