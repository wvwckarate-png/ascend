import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { clientKey, rateLimit, requireSameOrigin, resetLimit } from '../../../lib/apiGuard';

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  const expected = process.env.PARENT_PASSWORD;
  // Fail closed: with no configured password, nothing may match (undefined === undefined would).
  if (!expected) {
    return NextResponse.json({ success: false, error: 'Parent password not configured' }, { status: 500 });
  }

  // Brute-force guard: 8 wrong guesses per 10 minutes per client.
  const key = `parent:${clientKey(req)}`;
  const limited = rateLimit(key, 8, 10 * 60 * 1000);
  if (limited) return limited;

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (typeof password === 'string' && safeEqual(password, expected)) {
    resetLimit(key);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
