'use client';
import { useEffect } from 'react';
import Link from 'next/link';

// Shown instead of a blank white screen if any page crashes.
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧗</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 6 }}>Something slipped</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
        That page hit a snag. Your saved work is safe — give it another try.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => unstable_retry()} style={{ padding: '12px 24px', borderRadius: 999, border: 'none', background: 'var(--purple)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
        <Link href="/" style={{ padding: '12px 24px', borderRadius: 999, border: '1.5px solid var(--border)', color: 'var(--mid)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Home</Link>
      </div>
    </main>
  );
}
