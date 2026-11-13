import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

// Shared frame for the sign-in and set-password screens.
export const authInput: CSSProperties = { width: '100%', padding: '13px 14px', border: '1.5px solid #E8E5F0', borderRadius: 12, fontFamily: 'var(--font-jakarta)', fontSize: 16, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', marginBottom: 10 };
export const authButton = (disabled: boolean): CSSProperties => ({ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-jakarta)', opacity: disabled ? 0.5 : 1 });
export const authLabel: CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6 };

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
        <svg width="26" height="24" viewBox="0 0 60 56" fill="none" aria-hidden="true">
          <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
          <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
      </Link>
      <main style={{ width: '100%', maxWidth: 380, background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 22, padding: '28px 24px 24px', boxShadow: '0 4px 24px rgba(29,27,38,0.07)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', margin: '0 0 4px' }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#9E9BB0', margin: '0 0 22px', lineHeight: 1.5 }}>{subtitle}</p>
        {children}
      </main>
    </div>
  );
}
