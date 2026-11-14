'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard, { authButton, authInput, authLabel } from '../components/AuthCard';
import { authClient, homeFor, markPasswordSet, myAccount } from '../../lib/supabaseAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signin' | 'forgot' | 'sent'>('signin');

  // Already signed in on this device? Go straight in.
  useEffect(() => { myAccount().then(a => { if (a) window.location.replace(homeFor(a)); }); }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const { error: err } = await authClient.auth.signInWithPassword({ email: email.trim(), password });
    if (err) { setBusy(false); setError(/confirm/i.test(err.message) ? 'Open the invitation email first and set your password.' : 'That email and password don’t match. Try again, or reset your password.'); return; }
    await markPasswordSet();   // they just proved they have one
    const account = await myAccount();
    if (!account) { await authClient.auth.signOut(); setBusy(false); setError('This email isn’t invited to Ascend. Ask the parent who runs it to invite you.'); return; }
    window.location.replace(homeFor(account));
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true); setError('');
    // Always the same answer, so this screen can't be used to find out who has an account.
    await authClient.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/welcome` });
    setBusy(false); setMode('sent');
  };

  if (mode === 'sent') return (
    <AuthCard title="Check your email" subtitle={`If ${email.trim()} has an Ascend account, a link to set a new password is on its way. It can take a minute.`}>
      <button onClick={() => setMode('signin')} style={authButton(false)}>Back to sign in</button>
    </AuthCard>
  );

  return (
    <AuthCard title={mode === 'signin' ? 'Sign in' : 'Reset your password'} subtitle={mode === 'signin' ? 'Use the email you were invited with.' : 'Enter your email and we’ll send a link to set a new one.'}>
      <form onSubmit={mode === 'signin' ? signIn : sendReset}>
        <label htmlFor="login-email" style={authLabel}>Email</label>
        <input id="login-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} style={authInput} required />
        {mode === 'signin' && (
          <>
            <label htmlFor="login-password" style={authLabel}>Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={authInput} required />
          </>
        )}
        {error && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878', margin: '2px 0 12px', lineHeight: 1.5 }}>{error}</div>}
        <button type="submit" disabled={busy || !email.trim() || (mode === 'signin' && !password)} style={authButton(busy || !email.trim() || (mode === 'signin' && !password))}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Email me a link'}
        </button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12, fontWeight: 700 }}>
        <button onClick={() => { setMode(mode === 'signin' ? 'forgot' : 'signin'); setError(''); }} style={{ background: 'none', border: 'none', padding: 0, color: '#7B6FA0', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
          {mode === 'signin' ? 'Forgot password?' : 'Back to sign in'}
        </button>
        <Link href="/" style={{ color: '#9E9BB0', textDecoration: 'none' }}>Home</Link>
      </div>
    </AuthCard>
  );
}
