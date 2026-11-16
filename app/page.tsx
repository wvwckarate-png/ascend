'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION_LABEL } from '../lib/version';
import { STUDENTS } from '../lib/students';
import { accountState, homeFor, signOut } from '../lib/supabaseAuth';
import { useGradeLabels } from '../lib/useGradeLabels';
function Mountain() {
  return (
    <svg width="44" height="42" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const students = STUDENTS;

export default function Home() {
  const labels = useGradeLabels();
  const router = useRouter();
  // Who is here? A signed-in student goes straight to their own pages; a parent chooses whose to look at.
  const [who, setWho] = useState<'checking' | 'visitor' | 'parent'>('checking');
  useEffect(() => {
    accountState().then(state => {
      if (state.status !== 'ok') { setWho('visitor'); return; }
      if (state.account.needsPassword || state.account.role === 'student') { router.replace(homeFor(state.account)); return; }
      setWho('parent');
    });
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 60px' }}>


      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <Mountain />
        <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-2px', fontFamily: 'var(--font-jakarta)' }}>Ascend</span>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', fontStyle: 'italic', marginBottom: 8 }}>Forged in Focus</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 48 }}>Your personal study ecosystem</div>

      {who === 'parent' && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 20 }}>Whose pages do you want to see?</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 780, marginBottom: 32 }}>
        {students.map((s) => (
          <div
            key={s.id}
            onClick={() => router.push(`/${s.id}`)}
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
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{labels[s.id] || '\u00A0'}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)' }}>{s.goal}</div>
          </div>
        ))}
      </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/parent" style={{ textDecoration: 'none' }}><button style={{ padding: '11px 26px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Parent Dashboard</button></Link>
            <button onClick={() => signOut()} style={{ padding: '11px 26px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Sign out</button>
          </div>
        </>
      )}
      {who === 'visitor' && (
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '14px 44px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Sign in</button>
        </Link>
      )}
      {who === 'checking' && <div style={{ height: 49 }} />}

      <div style={{ fontSize: 10, color: 'var(--light)', marginTop: 40, letterSpacing: 0.5, textAlign: 'center', lineHeight: 1.8 }}>
        {APP_VERSION_LABEL}<br />
        Founded April 2026 · Forged in Focus
      </div>
    </main>
  );
}