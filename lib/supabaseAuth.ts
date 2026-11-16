'use client';
import { authClient, setSecured } from './supabase';

export { authClient };
export type Account = { email: string; role: 'parent' | 'student'; studentId: string | null; needsPassword?: boolean; secured?: boolean };
export type AccountState = { status: 'ok'; account: Account } | { status: 'signed-out' } | { status: 'unreachable' };

/** Who is signed in on this device? Tells apart "nobody", "an invited person" and "can't reach Ascend right now". */
export async function accountState(): Promise<AccountState> {
  const { data } = await authClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { status: 'signed-out' };
  try {
    const res = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status === 401) return { status: 'signed-out' };            // signed in, but not (or no longer) invited
    if (!res.ok) return { status: 'unreachable' };
    const account: Account | null = (await res.json())?.account ?? null;
    if (!account) return { status: 'signed-out' };
    setSecured(!!account.secured);
    return { status: 'ok', account };
  } catch { return { status: 'unreachable' }; }
}

/** The signed-in person's Ascend account (null if nobody is signed in, they were never invited, or Ascend can't be reached). */
export async function myAccount(): Promise<Account | null> {
  const s = await accountState();
  return s.status === 'ok' ? s.account : null;
}

/** Header to send with requests that need a signed-in person. Empty if nobody is signed in. */
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await authClient.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/**
 * Every request the pages make to Ascend's own server routes (/api/…) carries the signed-in person's token, so the
 * server can refuse anyone who isn't signed in. Installed once per page load.
 */
let installed = false;
export function installApiAuth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const plain = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const own = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    if (!own) return plain(input, init);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) { const h = await authHeader(); if (h.Authorization) headers.set('Authorization', h.Authorization); }
    return plain(input, { ...init, headers });
  };
}

/** Where someone lands after signing in. Anyone who came in through an invitation but never chose a password goes to choose one first. */
export const homeFor = (a: Account) => (a.needsPassword ? '/welcome' : a.role === 'parent' ? '/parent' : `/${a.studentId}`);

/** Record that the signed-in person has now chosen their own password. */
export async function markPasswordSet(): Promise<void> {
  try { await fetch('/api/account', { method: 'POST', headers: await authHeader() }); } catch { /* they will simply be asked again next time */ }
}

/** Sign out on this device and go to the sign-in page. */
export async function signOut() {
  try { await authClient.auth.signOut({ scope: 'local' }); } catch { /* clear locally regardless */ }
  setSecured(false);
  window.location.replace('/login');
}
