'use client';
import Link from 'next/link';
import Image from 'next/image';

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
  {
    id: 'matthew',
    name: 'Matthew',
    grade: 'Junior · 11th Grade',
    goal: 'WVU School of Dentistry',
    avatar: '/eagle.png',
    flip: false,
  },
  {
    id: 'michael',
    name: 'Michael',
    grade: 'Incoming 9th Grade',
    goal: 'WVU School of Medicine',
    avatar: '/lion.png',
    flip: true,
  },
  {
    id: 'brynne',
    name: 'Brynne',
    grade: '5th Grade',
    goal: 'Future WVU Physician',
    avatar: '/dragon.png',
    flip: false,
  },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 60px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <Mountain />
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-2px', fontFamily: 'var(--font-jakarta)' }}>
          Ascend
        </span>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', fontStyle: 'italic', marginBottom: 8 }}>
        Forged in Focus
      </div>

      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 48 }}>
        Your personal study ecosystem
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 20 }}>
        Who's studying today?
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 780, marginBottom: 32 }}>
        {students.map((s) => (
          <Link key={s.id} href={`/${s.id}`} style={{ textDecoration: 'none' }}>
            <div
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
                <Image
                  src={s.avatar}
                  alt={s.name}
                  width={100}
                  height={100}
                  style={{ objectFit: 'contain', transform: s.flip ? 'scaleX(-1)' : 'none' }}
                />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{s.grade}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)' }}>{s.goal}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/parent" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '11px 26px',
            borderRadius: 999,
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--muted)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-jakarta)',
          }}>
            Parent Dashboard
          </button>
        </Link>
      </div>

      <div style={{ fontSize: 10, color: 'var(--light)', marginTop: 40, letterSpacing: 0.5 }}>
        Ascend · Built May 2026 · Forged in Focus
      </div>
    </main>
  );
}