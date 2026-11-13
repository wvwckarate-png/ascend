import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvklkigxwithxsdvjpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The data client. It deliberately carries no sign-in session (that lives in lib/supabaseAuth.ts), so reading and
// saving study data works exactly the same whether or not someone is signed in on this device.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
