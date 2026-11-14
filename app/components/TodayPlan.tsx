'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { alpha } from '../../lib/theme';
import { AscendMark, PaperMark } from './ResourceLooks';
import { buildTodayPlan, dayStartISO, daysBetween, planProgress, streakFrom, type PlanDeck, type PlanExam, type PlanItem, type PlanTask } from '../../lib/todayPlan';

type ExamIn = { id: string; name: string; exam_date: string; class_name: string; class_id: string };
type DayRow = { day: string; planned: number; done: number };

// Daily progress lives behind the server (the browser can't touch that table directly). Returns null if it can't be reached.
async function studyDays(body: Record<string, unknown>): Promise<DayRow[] | null> {
  try {
    const res = await fetch('/api/study-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.days) ? json.days : null;
  } catch { return null; }
}

const color = 'var(--accent)';
const light = 'var(--accent-light)';
const SHOWN = 5;

/** The ring that fills as today's plan gets done. */
function Ring({ fraction, done, total }: { fraction: number; done: number; total: number }) {
  const size = 76, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const complete = total > 0 && done === total;
  return (
    <div role="img" aria-label={total === 0 ? 'Nothing planned today' : `${done} of ${total} done today`} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0EEF5" strokeWidth={stroke} />
        <circle data-ring-fill cx={size / 2} cy={size / 2} r={r} fill="none" stroke={complete ? '#5FAD8E' : color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))} style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {complete ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#5FAD8E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : total === 0 ? (
          <div style={{ fontSize: 18, fontWeight: 800, color: '#C4C1D4' }}>—</div>
        ) : (
          <>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#1D1B26', letterSpacing: '-0.5px', lineHeight: 1 }}>{done}<span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>/{total}</span></div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>done</div>
          </>
        )}
      </div>
    </div>
  );
}

function KindIcon({ kind, c }: { kind: PlanItem['kind']; c: string }) {
  if (kind === 'cards') return <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><rect x="4" y="9" width="17" height="13" rx="2.5" stroke={c} strokeWidth="2" /><path d="M8 6h14a2.5 2.5 0 012.5 2.5V19" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg>;
  if (kind === 'exam-prep') return <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><rect x="6" y="3" width="16" height="22" rx="2.5" stroke={c} strokeWidth="2" /><path d="M10 10h8M10 15h5" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M14 20l1.6 1.6L19 18" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke={c} strokeWidth="2" /><path d="M14 8.5V14l3.5 2.5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function TodayPlan({ studentId, todayStr, tasks, exams, onToggleTask }: { studentId: string; todayStr: string; tasks: PlanTask[]; exams: ExamIn[]; onToggleTask: (id: string) => void }) {
  const router = useRouter();
  const [decks, setDecks] = useState<PlanDeck[]>([]);
  const [examStats, setExamStats] = useState<PlanExam[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const saved = useRef('');

  // Exams in the next two weeks — the only ones the plan looks at.
  const soonKey = useMemo(() => exams.filter(e => { const d = daysBetween(todayStr, e.exam_date); return d >= 0 && d <= 14; }).map(e => `${e.id}|${e.exam_date}`).sort().join(','), [exams, todayStr]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const soon = exams.filter(e => { const d = daysBetween(todayStr, e.exam_date); return d >= 0 && d <= 14; });
      const folderIds = soon.map(e => e.id);
      const since = new Date(todayStr + 'T00:00:00'); since.setDate(since.getDate() - 120);
      const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
      const [deckRes, dayRes, resRes, examRes] = await Promise.all([
        supabase.rpc('study_plan_decks', { p_student: studentId, p_day_start: dayStartISO() }, { get: true }),
        studyDays({ student: studentId, since: sinceStr }),
        folderIds.length ? supabase.from('resources').select('folder_id').in('folder_id', folderIds) : Promise.resolve({ data: [] as { folder_id: string }[] }),
        folderIds.length ? supabase.from('practice_exams').select('folder_id, status, completed_at, created_at').eq('student_id', studentId).in('folder_id', folderIds) : Promise.resolve({ data: [] as { folder_id: string; status: string; completed_at: string | null; created_at: string }[] }),
      ]);
      if (cancelled) return;
      const deckRows: PlanDeck[] = Array.isArray(deckRes.data) ? deckRes.data.map((d: PlanDeck) => ({ ...d, cards: Number(d.cards) || 0, new_cards: Number(d.new_cards) || 0, due_seen: Number(d.due_seen) || 0, reviewed_today: Number(d.reviewed_today) || 0, weak: Number(d.weak) || 0, retired: Number(d.retired) || 0 })) : [];
      const localDay = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
      const resources = Array.isArray(resRes.data) ? resRes.data : [];
      const taken = Array.isArray(examRes.data) ? examRes.data : [];
      setDecks(deckRows);
      if (dayRes) setDays(dayRes);
      setExamStats(soon.map(e => {
        const mine = taken.filter(x => x.folder_id === e.id);
        const doneDays = mine.filter(x => x.status === 'completed').map(x => localDay(x.completed_at)).filter((d): d is string => !!d).sort();
        return {
          folderId: e.id, classId: e.class_id, name: e.name, className: e.class_name, examDate: e.exam_date,
          resources: resources.filter(r => r.folder_id === e.id).length,
          hasDeck: deckRows.some(d => d.folder_id === e.id),
          examsTaken: doneDays.length, lastTakenDay: doneDays[doneDays.length - 1] || null,
          takenToday: doneDays.includes(todayStr), madeToday: mine.some(x => localDay(x.created_at) === todayStr),
        };
      }));
      setLoaded(true);
    };
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, todayStr, soonKey]);

  const plan = useMemo(() => buildTodayPlan({ studentId, todayStr, tasks, decks, exams: examStats }), [studentId, todayStr, tasks, decks, examStats]);
  const { done, total, fraction } = planProgress(plan);

  // Remember today's numbers (this is what the streak is counted from). Only writes when something changed.
  useEffect(() => {
    if (!loaded) return;
    const sig = `${todayStr}:${total}:${done}`;
    const existing = days.find(d => d.day === todayStr);
    if (saved.current === sig || (existing && existing.planned === total && existing.done === done)) { saved.current = sig; return; }
    if (!existing && total === 0 && days.length === 0) { saved.current = sig; return; }   // brand-new student with nothing yet: nothing to record
    saved.current = sig;
    studyDays({ student: studentId, day: todayStr, planned: total, done });
  }, [loaded, total, done, todayStr, studentId, days]);

  const streak = useMemo(() => streakFrom([...days.filter(d => d.day !== todayStr), { day: todayStr, planned: total, done }], todayStr), [days, todayStr, total, done]);
  const complete = total > 0 && done === total;
  const visible = showAll ? plan : plan.slice(0, SHOWN);
  const next = plan.find(i => i.progress < 1);

  const headline = !loaded ? 'Building today’s plan…'
    : total === 0 ? 'You’re all caught up'
    : complete ? 'Plan complete'
    : done === 0 ? `${total} thing${total === 1 ? '' : 's'} to do today`
    : `${total - done} to go`;
  const sub = !loaded ? ''
    : total === 0 ? 'Nothing is due today. Enjoy it, or get ahead on your next exam.'
    : complete ? 'Everything for today is done. That’s how A’s are made.'
    : next ? `Next: ${next.title}` : '';

  return (
    <section aria-label="Today's plan" data-today-plan style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring fraction={complete ? 1 : fraction} done={done} total={total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>Today&apos;s Plan</div>
            {streak > 0 && (
              <div data-streak title="Days in a row with something finished" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: '#C8965A', background: '#FFF3E8', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                <svg width="10" height="12" viewBox="0 0 20 24" fill="#C8965A"><path d="M10 0c1 4 5 6 5 11a5 5 0 01-2 4c0-2-1-3-2-4-1 2-3 3-3 6a4 4 0 004 4 8 8 0 01-9-8C3 7 9 5 10 0z" /></svg>
                {streak}-day streak
              </div>
            )}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.3px', marginBottom: 2 }}>{headline}</div>
          {sub && <div style={{ fontSize: 12, color: '#9E9BB0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{sub}</div>}
        </div>
      </div>

      {visible.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map(item => {
            const isDone = item.progress >= 1;
            const tint = isDone ? '#5FAD8E' : item.urgent ? '#C47878' : color;
            const open = () => { if (item.href) router.push(item.href); };
            return (
              <div key={item.key} data-plan-item={item.kind} data-done={isDone ? 'true' : 'false'}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: isDone ? '#F7FAF8' : '#FAFAF8', border: `1.5px solid ${isDone ? '#DCEEE5' : item.urgent ? alpha('#C47878', '40') : '#EFEDF4'}` }}>
                {item.taskId ? (
                  <button aria-label={isDone ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`} onClick={() => onToggleTask(item.taskId!)}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${isDone ? '#5FAD8E' : '#C4C1D4'}`, background: isDone ? '#5FAD8E' : 'white', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {isDone && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                ) : (
                  isDone ? (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E3F2EA', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#5FAD8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  ) : item.look === 'class' ? <span data-look="class"><PaperMark size={30} /></span> : <span data-look="made"><AscendMark size={30} /></span>
                )}
                <div onClick={open} role={item.href ? 'link' : undefined} style={{ flex: 1, minWidth: 0, cursor: item.href ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#9E9BB0' : '#1D1B26', textDecoration: isDone && item.kind === 'task' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: isDone ? '#5FAD8E' : item.urgent ? '#C47878' : '#9E9BB0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.tag ? <span style={{ color: isDone ? '#9E9BB0' : color }}>{item.tag} · </span> : null}{item.detail}
                  </div>
                  {item.kind === 'cards' && item.progress > 0 && item.progress < 1 && (
                    <div style={{ height: 4, borderRadius: 999, background: '#EFEDF4', marginTop: 6, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.round(item.progress * 100)}%`, background: color, borderRadius: 999 }} /></div>
                  )}
                </div>
                {item.href && !isDone && (
                  <button onClick={open} aria-label={`Open ${item.title}`} style={{ background: item.urgent ? '#FDF2F2' : light, border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 800, color: tint, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-jakarta)' }}>
                    {item.kind === 'cards' ? 'Study' : item.kind === 'exam-prep' ? 'Go' : 'Open'}
                  </button>
                )}
              </div>
            );
          })}
          {plan.length > SHOWN && (
            <button onClick={() => setShowAll(s => !s)} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color, cursor: 'pointer', padding: '6px 0 0', fontFamily: 'var(--font-jakarta)' }}>
              {showAll ? 'Show less' : `Show all ${plan.length}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
