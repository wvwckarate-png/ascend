import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvklkigxwithxsdvjpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Sign-in: email + password accounts (parents and invited students). The session is remembered on the device.
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: 'ascend-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// The database is locked to signed-in people (supabase/v2.19.0-lockdown-step1/2.sql, live since 2026-11-17): each
// student can reach only their own rows. So every data request is made as whoever is signed in on this device.
// (Kept for older callers; no longer changes anything.)
export const setSecured = (on: boolean) => { void on; };

// The data client: classes, files, decks, grades… everything the study pages read and save.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const { data } = await authClient.auth.getSession();
    return data.session?.access_token ?? supabaseAnonKey;
  },
});
