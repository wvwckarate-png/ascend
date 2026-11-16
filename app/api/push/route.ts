import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isStudentId } from '../../../lib/supabaseAdmin';
import { requireSameOrigin, rateLimit, clientKey } from '../../../lib/apiGuard';
import { requireSignedIn } from '../../../lib/authServer';
import { isPushEndpoint, pushKeys, sendPush } from '../../../lib/pushServer';

export const dynamic = 'force-dynamic';

// Reminders on this device. body: { action: 'key' | 'subscribe' | 'unsubscribe' | 'test', student, subscription?, endpoint?, timezone? }
export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req) || rateLimit(`push:${clientKey(req)}`, 60, 10 * 60 * 1000);
  if (blocked) return blocked;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  const { action, student } = body;
  if (!isStudentId(student)) return NextResponse.json({ error: 'Unknown student' }, { status: 400 });
  const signedOut = await requireSignedIn(req, student);
  if (signedOut) return signedOut;

  if (action === 'key') return NextResponse.json({ publicKey: (await pushKeys()).publicKey }, { headers: { 'Cache-Control': 'no-store' } });

  if (action === 'subscribe') {
    const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
    const p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth;
    if (!isPushEndpoint(sub?.endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) return NextResponse.json({ error: 'This browser’s reminder details weren’t recognised.' }, { status: 400 });
    const timezone = typeof body.timezone === 'string' && body.timezone.length < 60 ? body.timezone : null;
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert({ endpoint: sub!.endpoint as string, student_id: student, keys: { p256dh, auth }, timezone, failures: 0 }, { onConflict: 'endpoint' });
    if (error) { console.error('push subscribe failed:', error.message); return NextResponse.json({ error: 'Could not turn reminders on.' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  if (action === 'unsubscribe') {
    if (endpoint) await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('student_id', student);
    return NextResponse.json({ ok: true });
  }
  if (action === 'test') {
    const { data: row } = await supabaseAdmin.from('push_subscriptions').select('endpoint, keys').eq('endpoint', endpoint).eq('student_id', student).maybeSingle();
    if (!row) return NextResponse.json({ error: 'Reminders aren’t on for this device.' }, { status: 404 });
    const result = await sendPush({ endpoint: row.endpoint, keys: row.keys }, { title: 'Ascend reminders are on', body: 'This is what your daily nudge will look like.', url: `/${student}` });
    if (result === 'gone') await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return result === 'sent' ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'The test couldn’t be delivered. Try turning reminders off and on again.' }, { status: 502 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
