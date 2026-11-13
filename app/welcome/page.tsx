'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard, { authButton, authInput, authLabel } from '../components/AuthCard';
import { authClient, homeFor, myAccount } from '../../lib/supabaseAuth';

// Where the invitation email (and the "reset password" email) lands: choose a password, then go in.
export default function WelcomePage() {
  const [state, setState] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The link signs the person in as the page opens; give that a moment before deciding the link is dead.
    const linkError = /error=|error_code=/.test(window.location.hash + window.location.search);
    let settled = false;
    const accept = (mail: string | undefined) => { if (settled || !mail) return; settled = true; setEmail(mail); setState('ready'); };
    const { data: sub } = authClient.auth.onAuthStateChange((_event, session) => accept(session?.user?.email));
    authClient.auth.getSession().then(({ data }) => accept(data.session?.user?.email));
    const timer = setTimeout(() => { if (!settled) { settled = true; setState('expired'); } }, linkError ? 0 : 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== again) { setError('Those two passwords don’t match.'); return; }
    setBusy(true); setError('');
    const { error: err } = await authClient.auth.updateUser({ password });
    if (err) { setBusy(false); setError(/different|same/i.test(err.message) ? 'Choose a password you haven’t used here before.' : /weak|short|characters/i.test(err.message) ? 'That password is too easy to guess. Try a longer one.' : 'Couldn’t save that password. Try again.'); return; }
    const account = await myAccount();
    if (!account) { setBusy(false); setError('Password saved, but this email isn’t invited to Ascend. Ask the parent who runs it to invite you.'); return; }
    window.location.replace(homeFor(account));
  };

  if (state === 'checking') return <AuthCard title="One moment…" subtitle="Opening your invitation."><div /></AuthCard>;
  if (state === 'expired') return (
    <AuthCard title="This link has expired" subtitle="Invitation and reset links work once and only for a while. Ask for a new one, or sign in if you already set your password.">
      <Link href="/login" style={{ ...authButton(false), display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Go to sign in</Link>
    </AuthCard>
  );
  const blocked = busy || !password || !again;
  return (
    <AuthCard title="Choose your password" subtitle={`Welcome to Ascend. You’re signing in as ${email}.`}>
      <form onSubmit={save}>
        <label htmlFor="new-password" style={authLabel}>New password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={authInput} required />
        <label htmlFor="new-password-again" style={authLabel}>Type it again</label>
        <input id="new-password-again" type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} style={authInput} required />
        <div style={{ fontSize: 11, color: '#9E9BB0', margin: '0 0 12px' }}>At least 8 characters.</div>
        {error && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878', margin: '0 0 12px', lineHeight: 1.5 }}>{error}</div>}
        <button type="submit" disabled={blocked} style={authButton(blocked)}>{busy ? 'Saving…' : 'Save and continue'}</button>
      </form>
    </AuthCard>
  );
}
