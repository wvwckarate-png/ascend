'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { daysBetween } from '../../lib/todayPlan';

// After an exam: ask for the real score (it goes straight into that class's Grade Tracker, so the "what do I need
// for an A" number stays true) and nudge the student to upload the graded exam — the best guide to this professor's
// next exam. Shown for exams taken in the last 30 days that have no score yet.
type ExamIn = { id: string; name: string; exam_date: string; class_name: string; class_id: string };
type ClassInfo = { id: string; grading_schema: Record<string, number> | null };

const color = 'var(--accent)';
const light = 'var(--accent-light)';
const KEY = (id: string) => `ascend:exam-followup:${id}`;
const norm = (s: string) => s.trim().toLowerCase();

/** The syllabus category an exam score most likely belongs to. */
export function guessExamCategory(schema: Record<string, number> | null | undefined, examName: string): string {
  const cats = Object.keys(schema || {});
  if (cats.length === 0) return 'Exams';
  const n = norm(examName);
  const find = (re: RegExp) => cats.find(c => re.test(norm(c)));
  if (/final/.test(n)) { const c = find(/final/); if (c) return c; }
  if (/midterm/.test(n)) { const c = find(/midterm/); if (c) return c; }
  if (/quiz/.test(n)) { const c = find(/quiz/); if (c) return c; }
  return find(/^exams?$|\bexams?\b|\btests?\b/) || find(/midterm/) || find(/final/) || cats[0];
}

export default function ExamFollowUp({ studentId, todayStr, exams }: { studentId: string; todayStr: string; exams: ExamIn[] }) {
  const past = useMemo(() => exams.filter(e => { const ago = daysBetween(e.exam_date, todayStr); return ago >= 1 && ago <= 30; }).sort((a, b) => b.exam_date.localeCompare(a.exam_date)), [exams, todayStr]);
  const pastKey = past.map(e => e.id).join(',');
  const [recorded, setRecorded] = useState<Set<string> | null>(null);      // folder ids that already have a score
  const [classes, setClasses] = useState<Record<string, ClassInfo>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [max, setMax] = useState('100');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState<{ exam: ExamIn; pct: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (past.length === 0) { setRecorded(new Set()); return; }
      const classIds = [...new Set(past.map(e => e.class_id))];
      const [{ data: grades }, { data: cls }] = await Promise.all([
        supabase.from('grades').select('class_id, item_name').eq('student_id', studentId).in('class_id', classIds),
        supabase.from('classes').select('id, grading_schema').in('id', classIds),
      ]);
      if (cancelled) return;
      const have = new Set<string>();
      for (const e of past) if ((Array.isArray(grades) ? grades : []).some(g => g.class_id === e.class_id && norm(g.item_name || '') === norm(e.name))) have.add(e.id);
      const map: Record<string, ClassInfo> = {};
      (Array.isArray(cls) ? cls : []).forEach((c: ClassInfo) => { map[c.id] = c; });
      // "Not back yet" hides a prompt for 3 days; "Don't ask" hides it for good. Remembered on this device.
      const hide = new Set<string>();
      for (const e of past) { try { const v = localStorage.getItem(KEY(e.id)); if (v === 'never' || (v && Number(v) > Date.now())) hide.add(e.id); } catch {} }
      setClasses(map); setHidden(hide); setRecorded(have);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, pastKey]);

  const hide = (id: string, forever: boolean) => {
    try { localStorage.setItem(KEY(id), forever ? 'never' : String(Date.now() + 3 * 86400000)); } catch {}
    setHidden(prev => new Set(prev).add(id)); if (openId === id) setOpenId(null);
  };
  const open = (e: ExamIn) => { setOpenId(e.id); setScore(''); setMax('100'); setError(''); setCategory(guessExamCategory(classes[e.class_id]?.grading_schema, e.name)); };
  const save = async (e: ExamIn) => {
    const s = parseFloat(score), m = parseFloat(max);
    if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0 || s < 0) { setError('Enter your score and what it was out of.'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('grades').insert({ class_id: e.class_id, student_id: studentId, category: category || 'Exams', item_name: e.name, score: s, max_score: m });
    setSaving(false);
    if (err) { console.error('Exam score save failed:', err.message); setError('Couldn’t save that score. Please try again.'); return; }
    setRecorded(prev => new Set(prev || []).add(e.id)); setOpenId(null); setJustSaved({ exam: e, pct: Math.round((s / m) * 1000) / 10 });
  };

  if (recorded === null) return null;
  const waiting = past.filter(e => !recorded.has(e.id) && !hidden.has(e.id)).slice(0, 2);
  if (waiting.length === 0 && !justSaved) return null;
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 16, fontWeight: 700, color: '#1D1B26', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' };

  return (
    <section aria-label="After the exam" data-exam-followup style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {justSaved && (
        <div data-followup-saved style={{ background: '#EDF7F2', border: '1.5px solid #DCEEE5', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#3F8A6C', marginBottom: 3 }}>{justSaved.exam.name}: {justSaved.pct}% saved to {justSaved.exam.class_name || 'your class'}</div>
          <div style={{ fontSize: 12, color: '#6B6880', lineHeight: 1.5, marginBottom: 10 }}>Got the graded exam back? Upload it as an old exam and your next practice exams will copy how this professor really tests.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/${studentId}/classes/${justSaved.exam.class_id}/${justSaved.exam.id}?upload=oldexam`} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, background: '#5FAD8E', color: 'white', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Upload the graded exam</Link>
            <Link href={`/${studentId}/classes/${justSaved.exam.class_id}`} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, background: '#FFFFFF', border: '1.5px solid #DCEEE5', color: '#3F8A6C', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>See what I need now</Link>
            <button aria-label="Close" onClick={() => setJustSaved(null)} style={{ width: 38, borderRadius: 10, border: 'none', background: 'transparent', color: '#9E9BB0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
      {waiting.map(e => {
        const ago = daysBetween(e.exam_date, todayStr);
        const cats = Object.keys(classes[e.class_id]?.grading_schema || {});
        const isOpen = openId === e.id;
        return (
          <div key={e.id} data-followup-exam={e.id} style={{ background: '#FFFFFF', border: `1.5px solid ${isOpen ? color : '#E8E5F0'}`, borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>How did {e.name} go?</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{e.class_name ? <span style={{ color }}>{e.class_name} · </span> : null}{ago === 1 ? 'yesterday' : `${ago} days ago`}</div>
              </div>
              {!isOpen && <button onClick={() => open(e)} style={{ padding: '9px 14px', borderRadius: 999, border: 'none', background: color, color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>Add my score</button>}
            </div>
            {isOpen ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input aria-label="Your score" inputMode="decimal" value={score} onChange={ev => setScore(ev.target.value)} placeholder="Score" style={input} autoFocus />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9E9BB0', flexShrink: 0 }}>out of</span>
                  <input aria-label="Out of" inputMode="decimal" value={max} onChange={ev => setMax(ev.target.value)} style={input} />
                </div>
                {cats.length > 1 && (
                  <div role="radiogroup" aria-label="Counts toward" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {cats.map(c => <button key={c} role="radio" aria-checked={category === c} onClick={() => setCategory(c)} style={{ padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${category === c ? color : '#E8E5F0'}`, background: category === c ? light : '#FFFFFF', color: category === c ? color : '#6B6880', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textTransform: 'capitalize' }}>{c}</button>)}
                  </div>
                )}
                {error && <div style={{ fontSize: 11, fontWeight: 600, color: '#C47878', marginBottom: 8 }}>{error}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setOpenId(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FFFFFF', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Cancel</button>
                  <button onClick={() => save(e)} disabled={saving || score.trim() === ''} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: color, color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: saving || score.trim() === '' ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Save score'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                <button onClick={() => hide(e.id, false)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 700, color: '#9E9BB0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Not back yet</button>
                <button onClick={() => hide(e.id, true)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 700, color: '#C4C1D4', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Don&apos;t ask</button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
