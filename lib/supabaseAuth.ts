'use client';
import { createClient } from '@supabase/supabase-js';

// Sign-in only: email + password accounts (parents and invited students). Kept apart from the data client so that
// signing in can never change how study data is read or saved.
export const authClient = createClient('https://rbvklkigxwithxsdvjpq.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storageKey: 'ascend-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Account = { email: string; role: 'parent' | 'student'; studentId: string | null; needsPassword?: boolean };

/** The signed-in person's Ascend account (null if nobody is signed in, or they were never invited). */
export async function myAccount(): Promise<Account | null> {
  const { data } = await authClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.account ?? null;
  } catch { return null; }
}

/** Header to send with requests that need a signed-in parent. Empty if nobody is signed in. */
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await authClient.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/** Where someone lands after signing in. Anyone who came in through an invitation but never chose a password goes to choose one first. */
export const homeFor = (a: Account) => (a.needsPassword ? '/welcome' : a.role === 'parent' ? '/parent' : `/${a.studentId}`);

/** Record that the signed-in person has now chosen their own password. */
export async function markPasswordSet(): Promise<void> {
  try { await fetch('/api/account', { method: 'POST', headers: await authHeader() }); } catch { /* they will simply be asked again next time */ }
}
