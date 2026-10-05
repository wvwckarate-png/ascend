'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
function Mountain() {
  return (
    <svg width="44" height="42" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const students = [
  { id: 'matthew', name: 'Matthew', grade: 'Senior · 12th Grade', goal: 'Future Dentist', avatar: '/eagle.png', flip: false },
  { id: 'michael', name: 'Michael', grade: 'Freshman · 9th Grade', goal: 'Future Physician', avatar: '/lion.png', flip: true },
  { id: 'brynne',  name: 'Brynne',  grade: 'Dragon · 6th Grade',          goal: 'Future Physician',  avatar: '/dragon.png', flip: false },
];

export default function Home() {
  const router = useRouter();
  const [selected, setSelected] = useState<typeof students[0] | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleStudentTap = async (s: typeof students[0]) => {
    setError('');
    try {
      const res = await fetch('/api/pin-status', { cache: 'no-store' });
      if (!res.ok) throw new Error('status');
      const status: Record<string, boolean> = await res.json();
      if (status[s.id]) {
        setSelected(s);
        setPin('');
      } else {
        router.push(`/${s.id}`);
      }
    } catch {
      // Fail closed: if we can't tell whether a PIN is set, don't just open the profile.
      setSelected(s);
      setPin('');
      setError("Can't reach Ascend right now. Check your connection and try again.");
    }
  };

  const handlePinDigit = (digit: string) => {
    if (checking) return;
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    if (!selected) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: selected.id, pin: enteredPin }),
      });
      if (res.ok) {
        router.push(`/${selected.id}`);
        return;
      }
      setError(res.status === 429 ? 'Too many tries. Wait a few minutes and try again.'
        : res.status === 401 ? 'Wrong PIN. Try again.'
        : "Can't check your PIN right now. Try again.");
    } catch {
      setError("Can't reach Ascend right now. Try again.");
    }
    setPin('');
    setChecking(false);
  };

  // Typing digits / Backspace on a physical keyboard works the same as the on-screen keypad.
  useEffect(() => {
    if (!selected) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9' && e.key.length === 1) handlePinDigit(e.key);
      if (e.key === 'Backspace' && !checking) setPin(p => p.slice(0, -1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, pin, checking]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 60px' }}>

      {/* PIN Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: '36px 28px', width: '100%', maxWidth: 340, textAlign: 'center', boxShadow: '0 24px 60px rgba(29,27,38,0.2)' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 16px' }}>
              <Image src={selected.avatar} alt={selected.name} width={64} height={64} style={{ objectFit: 'contain', transform: selected.flip ? 'scaleX(-1)' : 'none' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 28 }}>Enter your PIN</div>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length > i ? '#7B6FA0' : '#E8E5F0', transition: 'background 0.15s' }} />
              ))}
            </div>

            {error && <div style={{ fontSize: 12, color: '#C47878', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} onClick={() => handlePinDigit(d)} disabled={checking} style={{ padding: '16px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FAFAF8', fontSize: 20, fontWeight: 700, color: '#1D1B26', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', transition: 'background 0.1s' }}>
                  {d}
                </button>
              ))}
              <div />
              <button onClick={() => handlePinDigit('0')} disabled={checking} style={{ padding: '16px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FAFAF8', fontSize: 20, fontWeight: 700, color: '#1D1B26', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>0</button>
              <button onClick={() => setPin(p => p.slice(0, -1))} style={{ padding: '16px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FAFAF8', fontSize: 16, color: '#9E9BB0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>⌫</button>
            </div>

            <button onClick={() => { setSelected(null); setPin(''); setError(''); }} style={{ fontSize: 13, color: '#9E9BB0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontWeight: 600 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <Mountain />
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-2px', fontFamily: 'var(--font-jakarta)' }}>Ascend</span>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', fontStyle: 'italic', marginBottom: 8 }}>Forged in Focus</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 48 }}>Your personal study ecosystem</div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 20 }}>Who&apos;s studying today?</div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 780, marginBottom: 32 }}>
        {students.map((s) => (
          <div
            key={s.id}
            onClick={() => handleStudentTap(s)}
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 22,
              padding: '28px 22px 24px',
              width: 210,
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 2px 16px var(--shadow)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(123,111,160,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px var(--shadow)';
            }}
          >
            <div style={{ width: 100, height: 100, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src={s.avatar} alt={s.name} width={100} height={100} style={{ objectFit: 'contain', transform: s.flip ? 'scaleX(-1)' : 'none' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{s.grade}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)' }}>{s.goal}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/parent" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '11px 26px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
            Parent Dashboard
          </button>
        </Link>
      </div>

      <div style={{ fontSize: 10, color: 'var(--light)', marginTop: 40, letterSpacing: 0.5, textAlign: 'center', lineHeight: 1.8 }}>
        Ascend v2.9.0 · October 2026<br />
        Founded April 2026 · Forged in Focus
      </div>
    </main>
  );
}