'use client';
import Link from 'next/link';
import Image from 'next/image';
import TabBar from '../../components/TabBar';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const stats = [
  { label: 'Study Guides', value: '—' },
  { label: 'Flashcard Decks', value: '—' },
  { label: 'Quizzes Taken', value: '—' },
  { label: 'Day Streak', value: '—' },
];

export default function BrynneProfile() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 100, height: 100, marginBottom: 16 }}>
            <Image src="/dragon.png" alt="Brynne" width={100} height={100} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Brynne 🐉</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 8 }}>5th Grade · Class of 2033</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '4px 12px', borderRadius: 999, background: '#FFF3E8', fontSize: 11, fontWeight: 700, color: '#C4A882' }}>Pre-Med</div>
            <div style={{ padding: '4px 12px', borderRadius: 999, background: '#FFF3E8', fontSize: 11, fontWeight: 700, color: '#C4A882' }}>Future Physician</div>
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Activity</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#E8956D', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Goal</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>WVU School of Medicine 🌟</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', lineHeight: 1.6 }}>Already taking high school Algebra at age 10. The Dragon is just getting started. 🔥</div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Settings</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid #E8E5F0', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>PIN Protection</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Coming in v1.2</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '4px 10px', borderRadius: 999 }}>Soon</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Notifications</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Coming in v2.0</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '4px 10px', borderRadius: 999 }}>Soon</div>
          </div>
        </div>
      </main>
      <TabBar student="brynne" />
    </div>
  );
}