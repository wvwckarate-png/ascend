import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isStudentId } from '../../../lib/supabaseAdmin';
import { requireSameOrigin, rateLimit, clientKey } from '../../../lib/apiGuard';

export const dynamic = 'force-dynamic';

// Daily study progress (how much of "Today's Plan" was planned and finished) — what the streak is counted from.
// The table is locked to the server: the browser can only reach it through this route, for a real student,
// one day at a time. Body: { student, since } to read, plus { day, planned, done } to record a day first.
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(200, Math.round(v))) : null);

export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req) || rateLimit(`study-days:${clientKey(req)}`, 240, 10 * 60 * 1000);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  const { student, since, day } = body;
  if (!isStudentId(student)) return NextResponse.json({ error: 'Unknown student' }, { status: 400 });

  if (day !== undefined) {
    const planned = count(body.planned), done = count(body.done);
    if (!isDay(day) || planned === null || done === null) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    // Only today can be recorded (a day either side allows for time zones) — history can't be rewritten.
    if (Math.abs(Date.parse(day + 'T12:00:00Z') - Date.now()) > 36 * 3600 * 1000) return NextResponse.json({ error: 'Only today can be recorded' }, { status: 400 });
    const { error } = await supabaseAdmin.from('study_days').upsert({ student_id: student, day, planned, done: Math.min(done, planned), updated_at: new Date().toISOString() }, { onConflict: 'student_id,day' });
    if (error) { console.error('study_days save failed:', error.message); return NextResponse.json({ error: 'Could not save progress' }, { status: 500 }); }
  }

  const from = isDay(since) ? since : new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin.from('study_days').select('day, planned, done').eq('student_id', student).gte('day', from).order('day', { ascending: true });
  if (error) { console.error('study_days read failed:', error.message); return NextResponse.json({ error: 'Could not load progress' }, { status: 500 }); }
  return NextResponse.json({ days: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
