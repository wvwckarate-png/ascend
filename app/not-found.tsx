import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏔️</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 6 }}>Page not found</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
        We couldn&apos;t find that page. Let&apos;s get you back on the trail.
      </div>
      <Link href="/" style={{ padding: '12px 24px', borderRadius: 999, background: 'var(--purple)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Back to Ascend</Link>
    </main>
  );
}
