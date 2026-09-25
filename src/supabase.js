import { createClient } from '@supabase/supabase-js';

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const looksReal = (v) => !!v && !v.includes('YOUR_') && !v.includes('_HERE');

export const hasSupabase = looksReal(URL) && looksReal(KEY);

// Needed to address the verified-insert Edge Function directly. The supabase-js
// client below is now used only for the read-only counter RPC — all writes go
// through the function, since the anon role no longer holds insert rights.
export const SUPABASE_URL = URL;
export const SUPABASE_ANON_KEY = KEY;

export const supabase = hasSupabase
  ? createClient(URL, KEY, { auth: { persistSession: false } })
  : null;

if (!hasSupabase && typeof console !== 'undefined') {
  console.info('[fitseam] Supabase env vars missing — falling back to localStorage. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local.');
}
