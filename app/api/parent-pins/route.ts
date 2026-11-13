import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isStudentId } from '../../../lib/supabaseAdmin';
import { clientKey, rateLimit, requireSameOrigin, resetLimit } from '../../../lib/apiGuard';
import { isParent } from '../../../lib/authServer';

// Parent-only PIN management. Every call re-checks that the caller is a parent, so the PINs can't be changed from a student's device.
// body: { password, action: 'status' | 'set' | 'clear', student?, pin? }
export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  const limited = rateLimit(`parentpins:${clientKey(req)}`, 60, 10 * 60 * 1000);
  if (limited) return limited;

  let body: { password?: unknown; action?: unknown; student?: unknown; pin?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  // A parent: signed in with their email, or the parent dashboard password.
  // Password guesses share the parent-password limit: 8 wrong tries per 10 minutes per device.
  const guessKey = `parent:${clientKey(req)}`;
  if (typeof body.password === 'string' && body.password) { const tooMany = rateLimit(guessKey, 8, 10 * 60 * 1000); if (tooMany) return tooMany; }
  if (!(await isParent(req, body.password))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  resetLimit(guessKey);

  if (body.action === 'set' || body.action === 'clear') {
    if (!isStudentId(body.student)) return NextResponse.json({ error: 'Unknown student' }, { status: 400 });
    if (body.action === 'set' && (typeof body.pin !== 'string' || !/^\d{4}$/.test(body.pin))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('students')
      .update({ pin: body.action === 'set' ? body.pin : null }).eq('id', body.student);
    if (error) return NextResponse.json({ error: 'Could not save PIN' }, { status: 500 });
  } else if (body.action !== 'status') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from('students').select('id, pin');
  if (error || !data) return NextResponse.json({ error: 'Could not load PINs' }, { status: 500 });
  const pins: Record<string, boolean> = {};
  data.forEach(s => { pins[s.id] = !!s.pin; });
  return NextResponse.json({ pins }, { headers: { 'Cache-Control': 'no-store' } });
}
