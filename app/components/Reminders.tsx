'use client';
import { useEffect, useState } from 'react';

// Profile → Reminders: one daily nudge on this device ("6 cards due · Exam 1 in 3 days").
type State = 'checking' | 'needs-install' | 'unsupported' | 'blocked' | 'off' | 'on';

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
const call = async (body: Record<string, unknown>) => {
  const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data;
};

export default function Reminders({ studentId }: { studentId: string }) {
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!supported) {
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const installed = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
        setState(iOS && !installed ? 'needs-install' : 'unsupported'); return;
      }
      if (Notification.permission === 'denied') { setState('blocked'); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch { setState('off'); }
    })();
  }, []);

  const turnOn = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState(permission === 'denied' ? 'blocked' : 'off'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      const { publicKey } = await call({ action: 'key', student: studentId });
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      await call({ action: 'subscribe', student: studentId, subscription: sub.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      setState('on'); setNote('Reminders are on for this device. You’ll get one nudge a day, only when something is due.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t turn reminders on.'); }
    finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) { await call({ action: 'unsubscribe', student: studentId, endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      setState('off');
    } catch { setError('Couldn’t turn reminders off. Please try again.'); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) { setState('off'); return; }
      await call({ action: 'test', student: studentId, endpoint: sub.endpoint });
      setNote('Sent. It should appear in a few seconds.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The test couldn’t be sent.'); }
    finally { setBusy(false); }
  };

  const sub = state === 'on' ? 'One nudge a day on this device, only when something is due.'
    : state === 'off' ? 'A daily nudge: cards due, reviews, and how close the next exam is.'
    : state === 'needs-install' ? 'On iPhone, add Ascend to your Home Screen first: tap Share, then “Add to Home Screen”. Open Ascend from that icon and come back here.'
    : state === 'blocked' ? 'Notifications are blocked for Ascend in this browser’s settings. Allow them there, then come back.'
    : state === 'unsupported' ? 'This browser can’t show reminders. Try Safari, Chrome or the installed app.' : '';
  const pill = (bg: string, c: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, color: c, background: bg, border: 'none', padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0, opacity: busy ? 0.6 : 1 });

  return (
    <div data-reminders={state}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Reminders</div>
          <div style={{ fontSize: 11, color: '#9E9BB0', lineHeight: 1.5 }}>{sub}</div>
        </div>
        {state === 'off' && <button onClick={turnOn} disabled={busy} style={pill('var(--accent)', 'white')}>{busy ? 'One moment…' : 'Turn on'}</button>}
        {state === 'on' && <div style={{ fontSize: 11, fontWeight: 700, color: '#5FAD8E', background: '#EDF7F2', padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>On</div>}
        {(state === 'needs-install' || state === 'unsupported' || state === 'blocked') && <div style={{ fontSize: 11, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>Off</div>}
      </div>
      {state === 'on' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={test} disabled={busy} style={pill('var(--accent-light)', 'var(--accent)')}>Send a test</button>
          <button onClick={turnOff} disabled={busy} style={pill('#F3F1EC', '#6B6880')}>Turn off</button>
        </div>
      )}
      {note && <div role="status" style={{ fontSize: 11, fontWeight: 600, color: '#3F8A6C', marginTop: 8, lineHeight: 1.5 }}>{note}</div>}
      {error && <div role="alert" style={{ fontSize: 11, fontWeight: 600, color: '#C47878', marginTop: 8, lineHeight: 1.5 }}>{error}</div>}
    </div>
  );
}
