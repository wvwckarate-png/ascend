import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendPush } from '../../../lib/pushServer';
import { buildReminder } from '../../../lib/reminderText';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily nudge, run by the scheduler (see vercel.json). For each student who turned reminders on, it looks at what is
// due today — spaced-repetition cards and reviews, graded work, the nearest exam — and sends one short notification.
// Add ?dry=1 to see what would be sent without sending anything.
const dayIn = (tz: string, d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || (bearer || req.headers.get('x-cron-secret')) !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dry = req.nextUrl.searchParams.get('dry') === '1';

  const { data: subs, error } = await supabaseAdmin.from('push_subscriptions').select('endpoint, student_id, keys, timezone, last_sent_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byStudent = new Map<string, typeof subs>();
  for (const s of subs || []) byStudent.set(s.student_id, [...(byStudent.get(s.student_id) || []), s]);

  const report: Record<string, unknown>[] = [];
  for (const [student, devices] of byStudent) {
    let tz = devices!.find(d => d.timezone)?.timezone || 'America/New_York';
    let today: string;
    try { today = dayIn(tz); } catch { tz = 'America/New_York'; today = dayIn(tz); }

    const [{ data: tasks }, { data: decks }, { data: classes }] = await Promise.all([
      supabaseAdmin.from('tasks').select('title, task_type, due_date').eq('student_id', student).eq('completed', false).lte('due_date', today).gte('due_date', addDays(today, -14)),
      supabaseAdmin.rpc('study_plan_decks', { p_student: student, p_day_start: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }),
      supabaseAdmin.from('classes').select('id').eq('student_id', student).eq('is_active', true),
    ]);
    const classIds = (classes || []).map(c => c.id);
    const { data: folders } = classIds.length ? await supabaseAdmin.from('exam_folders').select('id, name, exam_date').in('class_id', classIds).gte('exam_date', today).lte('exam_date', addDays(today, 14)).order('exam_date', { ascending: true }).limit(1) : { data: [] };
    const examFolders = new Set((folders || []).map(f => f.id));

    const dueToday = (tasks || []).filter(t => t.due_date === today);
    const deckRows = (Array.isArray(decks) ? decks : []) as { folder_id: string | null; created_at: string; cards: number; new_cards: number; due_seen: number; weak: number; retired: number }[];
    // Same rule as Today's Plan: a deck nobody has opened counts only while it is new or its exam is coming.
    const dueCards = deckRows.reduce((n, d) => {
      const untouched = Number(d.new_cards) === Number(d.cards), fresh = Date.now() - new Date(d.created_at).getTime() < 14 * 86400000;
      return n + Number(d.due_seen) + (Number(d.retired) > 0 || (untouched && !fresh && !(d.folder_id && examFolders.has(d.folder_id))) ? 0 : Number(d.new_cards));
    }, 0);
    const exam = folders?.[0] ? { name: folders[0].name, days: Math.round((Date.parse(folders[0].exam_date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000) } : null;
    const message = buildReminder({
      dueCards, weakCards: deckRows.reduce((n, d) => n + Number(d.weak), 0),
      reviewsToday: dueToday.filter(t => t.task_type === 'review').map(t => t.title),
      gradedToday: dueToday.filter(t => ['assignment', 'quiz', 'exam'].includes(t.task_type)).map(t => t.title),
      overdue: (tasks || []).filter(t => t.due_date < today && t.task_type !== 'nudge').length,
      exam,
    });

    let sent = 0, removed = 0, skipped = 0;
    if (message && !dry) {
      for (const d of devices!) {
        if (d.last_sent_at && Date.now() - new Date(d.last_sent_at).getTime() < 12 * 3600 * 1000) { skipped++; continue; }   // never twice in one day
        const result = await sendPush({ endpoint: d.endpoint, keys: d.keys }, { ...message, url: `/${student}` });
        if (result === 'sent') { sent++; await supabaseAdmin.from('push_subscriptions').update({ last_sent_at: new Date().toISOString(), failures: 0 }).eq('endpoint', d.endpoint); }
        else if (result === 'gone') { removed++; await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', d.endpoint); }
      }
    }
    report.push({ student, devices: devices!.length, message, sent, removed, skipped });
  }
  return NextResponse.json({ ok: true, dry, students: report });
}
