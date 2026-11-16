import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvklkigxwithxsdvjpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Sign-in: email + password accounts (parents and invited students). The session is remembered on the device.
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: 'ascend-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Once the database has its per-student rules (see supabase/v2.19.0-lockdown-step1.sql) every data request is made
// as the signed-in person, so the database itself decides what they may see. Until then requests go out the old way.
let secured = false;
export const setSecured = (on: boolean) => { secured = on; };

// The data client: classes, files, decks, grades… everything the study pages read and save.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    if (!secured) return supabaseAnonKey;
    const { data } = await authClient.auth.getSession();
    return data.session?.access_token ?? supabaseAnonKey;
  },
});
