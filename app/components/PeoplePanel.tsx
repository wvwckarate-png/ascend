'use client';
import { useCallback, useEffect, useState } from 'react';
import { STUDENTS } from '../../lib/students';
import { authHeader } from '../../lib/supabaseAuth';

// Parent dashboard: invite people by email and see who has set up their sign-in.
type Person = { email: string; role: 'parent' | 'student'; studentId: string | null; invitedAt: string; lastInviteAt: string | null; signedIn: boolean; opened?: boolean };

const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 16, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' };
const chip = (on: boolean): React.CSSProperties => ({ padding: '7px 13px', borderRadius: 999, border: `1.5px solid ${on ? '#7B6FA0' : '#E8E5F0'}`, background: on ? '#EEEBF6' : '#FFFFFF', color: on ? '#7B6FA0' : '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' });

export default function PeoplePanel({ password }: { password: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [email, setEmail] = useState('');
  const [who, setWho] = useState<string>('');           // a student id, or 'parent'
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const call = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    setError(''); setNote('');
    try {
      const res = await fetch('/api/admin/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ password, ...body }) });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.accounts)) setPeople(data.accounts);
      if (!res.ok) { setError(data?.error || 'Something went wrong. Please try again.'); return false; }
      return true;
    } catch { setError('Could not reach the server. Please try again.'); return false; }
  }, [password]);

  useEffect(() => { call({ action: 'list' }); }, [call]);

  const taken = new Set((people || []).filter(p => p.studentId).map(p => p.studentId));
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !who || busy) return;
    setBusy('invite');
    const sentTo = email.trim();
    if (await call({ action: 'invite', email: sentTo, role: who === 'parent' ? 'parent' : 'student', student: who === 'parent' ? undefined : who })) { setNote(`Invitation sent to ${sentTo}. The link in the email lets them choose a password.`); setEmail(''); setWho(''); }
    setBusy('');
  };
  const resend = async (p: Person) => { setBusy(p.email); if (await call({ action: 'resend', email: p.email })) setNote(`A new link is on its way to ${p.email}.`); setBusy(''); };
  const remove = async (p: Person) => { setBusy(p.email); if (await call({ action: 'remove', email: p.email })) setNote(`${p.email} can no longer sign in. Nothing else was deleted.`); setConfirmRemove(null); setBusy(''); };
  const nameOf = (p: Person) => p.role === 'parent' ? 'Parent' : STUDENTS.find(s => s.id === p.studentId)?.name || p.studentId;

  return (
    <section data-people-panel style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>People &amp; sign-ins</div>
      <div style={{ fontSize: 12, color: '#9E9BB0', lineHeight: 1.5, marginBottom: 14 }}>Invite someone by email. They get a link, choose their own password, and from then on sign in with their email.</div>

      {people === null ? <div style={{ fontSize: 12, color: '#9E9BB0', padding: '8px 0' }}>Loading…</div> : people.length === 0 ? (
        <div style={{ fontSize: 12, color: '#6B6880', background: '#FAFAF8', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>Nobody is invited yet. Start with your own email as Parent.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {people.map(p => (
            <div key={p.email} data-person={p.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FAFAF8', border: '1.5px solid #EFEDF4', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26' }}>{nameOf(p)} <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginLeft: 4, background: p.signedIn ? '#EDF7F2' : '#FFF3E8', color: p.signedIn ? '#5FAD8E' : '#C8965A' }}>{p.signedIn ? 'Signed in' : p.opened ? 'Needs a password' : 'Invited'}</span></div>
                <div style={{ fontSize: 11, color: '#9E9BB0', overflowWrap: 'anywhere' }}>{p.email}</div>
              </div>
              {confirmRemove === p.email ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#C47878' }}>Remove this sign-in?</span>
                  <button onClick={() => remove(p)} disabled={!!busy} style={{ ...chip(false), borderColor: '#C47878', color: '#C47878' }}>Yes, remove</button>
                  <button onClick={() => setConfirmRemove(null)} style={chip(false)}>Keep</button>
                </>
              ) : (
                <>
                  <button onClick={() => resend(p)} disabled={!!busy} style={chip(false)}>{busy === p.email ? 'Sending…' : p.signedIn ? 'Send reset link' : 'Resend'}</button>
                  <button onClick={() => setConfirmRemove(p.email)} disabled={!!busy} aria-label={`Remove ${p.email}`} style={{ ...chip(false), color: '#C47878' }}>Remove</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={invite}>
        <label htmlFor="invite-email" style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6 }}>Invite by email</label>
        <input id="invite-email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={{ ...input, marginBottom: 10 }} />
        <div role="radiogroup" aria-label="This person is" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {STUDENTS.map(s => (
            <button type="button" key={s.id} role="radio" aria-checked={who === s.id} disabled={taken.has(s.id)} title={taken.has(s.id) ? `${s.name} already has a sign-in` : undefined} onClick={() => setWho(s.id)} style={{ ...chip(who === s.id), opacity: taken.has(s.id) ? 0.4 : 1, cursor: taken.has(s.id) ? 'default' : 'pointer' }}>{s.name}</button>
          ))}
          <button type="button" role="radio" aria-checked={who === 'parent'} onClick={() => setWho('parent')} style={chip(who === 'parent')}>Parent</button>
        </div>
        {error && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878', marginBottom: 10, lineHeight: 1.5 }}>{error}</div>}
        {note && <div style={{ fontSize: 12, fontWeight: 600, color: '#3F8A6C', background: '#EDF7F2', borderRadius: 10, padding: '9px 12px', marginBottom: 10, lineHeight: 1.5 }}>{note}</div>}
        <button type="submit" disabled={!email.trim() || !who || !!busy} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !email.trim() || !who || busy ? 0.5 : 1 }}>{busy === 'invite' ? 'Sending…' : 'Send invitation'}</button>
      </form>
    </section>
  );
}
