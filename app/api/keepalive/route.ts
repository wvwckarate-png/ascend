import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Daily keep-alive (scheduled in vercel.json). Supabase's free plan pauses projects that look inactive, so once a day this
// writes a timestamp to a dedicated one-row table and reads from the real tables — genuine database activity that never
// touches a student's data. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; nobody else can trigger it.
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  const a = Buffer.from(given); const b = Buffer.from(expected || '');
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: row, error: readError } = await supabaseAdmin.from('keepalive').select('pings').eq('id', 1).maybeSingle();
    if (readError) throw readError;

    const now = new Date().toISOString();
    const { error: writeError } = await supabaseAdmin.from('keepalive').upsert({ id: 1, last_ping: now, pings: (row?.pings ?? 0) + 1 });
    if (writeError) throw writeError;

    // A little real read traffic too (counts only — no data returned).
    const { count: students, error: studentsError } = await supabaseAdmin.from('students').select('id', { count: 'exact', head: true });
    if (studentsError) throw studentsError;

    return NextResponse.json({ ok: true, last_ping: now, pings: (row?.pings ?? 0) + 1, students });
  } catch (err) {
    console.error('keepalive failed:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Keep-alive failed' }, { status: 500 });
  }
}
