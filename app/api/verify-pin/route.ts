import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin, isStudentId } from '../../../lib/supabaseAdmin';
import { clientKey, rateLimit, requireSameOrigin, resetLimit } from '../../../lib/apiGuard';

export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  let body: { student?: unknown; pin?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ success: false }, { status: 400 }); }

  const { student, pin } = body;
  if (!isStudentId(student) || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // 10 wrong guesses per 10 minutes per client+student (a 4-digit PIN has only 10,000 combinations).
  const key = `pin:${student}:${clientKey(req)}`;
  const limited = rateLimit(key, 10, 10 * 60 * 1000);
  if (limited) return limited;

  const { data, error } = await supabaseAdmin.from('students').select('pin').eq('id', student).single();
  if (error || !data) return NextResponse.json({ success: false, error: 'Could not check PIN' }, { status: 500 });

  // No PIN set means the profile is open (matches the login screen, which skips the keypad).
  if (!data.pin) return NextResponse.json({ success: true });

  const a = Buffer.from(String(data.pin)); const b = Buffer.from(pin);
  if (a.length === b.length && timingSafeEqual(a, b)) {
    resetLimit(key);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
