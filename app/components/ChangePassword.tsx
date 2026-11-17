'use client';
import { useState } from 'react';
import { authClient, markPasswordSet, rememberPassword } from '../../lib/supabaseAuth';

// "Change password" for whoever is signed in on this device (shown on the student Profile and the Parent Dashboard).
const field: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 16, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', marginBottom: 8 };

export default function ChangePassword({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== again) { setError('Those two passwords don’t match.'); return; }
    setBusy(true); setError('');
    const { error: err } = await authClient.auth.updateUser({ password });
    if (err) { setBusy(false); setError(/different|same/i.test(err.message) ? 'That is already your password. Choose a different one.' : /weak|short|characters|pwned|leaked/i.test(err.message) ? 'That password is too easy to guess. Try a longer one.' : /reauth|session|jwt|nonce/i.test(err.message) ? 'For safety, sign out, sign back in, and then change it.' : 'Couldn’t change the password. Please try again.'); return; }
    await markPasswordSet();
    await rememberPassword(email, password);
    setBusy(false); setDone(true); setOpen(false); setPassword(''); setAgain('');
  };

  return (
    <div data-change-password={open ? 'open' : done ? 'done' : 'closed'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Password</div>
          <div style={{ fontSize: 11, color: done ? '#3F8A6C' : '#9E9BB0', fontWeight: done ? 700 : 400, overflowWrap: 'anywhere' }}>{done ? 'Password changed. Use the new one next time you sign in.' : `For ${email || 'this account'}`}</div>
        </div>
        {!open && <button onClick={() => { setOpen(true); setDone(false); setError(''); }} style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent, #7B6FA0)', background: 'var(--accent-light, #EEEBF6)', border: 'none', padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>Change password</button>}
      </div>
      {open && (
        <form method="post" action="/login" onSubmit={save} style={{ marginTop: 12 }}>
          {/* A real (read-only) username field so the browser updates the saved password for the right account. */}
          <input name="username" type="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-label="Email" style={{ ...field, color: '#9E9BB0' }} />
          <input id="change-password-new" name="new-password" type="password" autoComplete="new-password" placeholder="New password (at least 8 characters)" aria-label="New password" value={password} onChange={e => setPassword(e.target.value)} style={field} required />
          <input id="change-password-again" name="new-password-again" type="password" autoComplete="new-password" placeholder="Type it again" aria-label="Type the new password again" value={again} onChange={e => setAgain(e.target.value)} style={field} required />
          {error && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878', margin: '2px 0 8px', lineHeight: 1.5 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setOpen(false); setPassword(''); setAgain(''); setError(''); }} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FFFFFF', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Cancel</button>
            <button type="submit" disabled={busy || !password || !again} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--accent, #7B6FA0)', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: busy || !password || !again ? 0.5 : 1 }}>{busy ? 'Saving…' : 'Save new password'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
