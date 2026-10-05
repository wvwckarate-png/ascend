import { NextRequest, NextResponse } from 'next/server';

// Lightweight protection for the public API routes. The app has no logins (students use the public Supabase key),
// so these can't be made private — but they can refuse cross-site / scripted callers and cap abuse, which
// keeps a stranger from burning the Anthropic/OpenAI credit through the open endpoints.

/** Only accept requests that come from this site's own pages. */
export function requireSameOrigin(req: NextRequest): NextResponse | null {
  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin') return null;

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return null;
    } catch { /* fall through */ }
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Best-effort in-memory limiter (per server instance). Good enough to blunt loops and brute force.
const hits = new Map<string, number[]>();

export function clientKey(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}

/** Returns a 429 response when `key` has made more than `limit` calls in the last `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return NextResponse.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) { for (const [k, v] of hits) if (v.every(t => now - t >= windowMs)) hits.delete(k); }
  return null;
}

/** Same-origin + per-client rate limit, in one call. */
export function guardAI(req: NextRequest, bucket: string, limit = 30, windowMs = 10 * 60 * 1000): NextResponse | null {
  return requireSameOrigin(req) || rateLimit(`${bucket}:${clientKey(req)}`, limit, windowMs);
}

/** Clear a client's failed-attempt history (e.g. after a correct PIN). */
export function resetLimit(key: string) { hits.delete(key); }
