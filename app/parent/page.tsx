'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import PeoplePanel from '../components/PeoplePanel';
import { localDateStr } from '../../lib/dates';
import { daysBetween, streakFrom } from '../../lib/todayPlan';
import { gradeTarget } from '../../lib/gpa';
import { accountState, homeFor, installApiAuth, signOut } from '../../lib/supabaseAuth';
import { supabase } from '../../lib/supabase';
import { APP_VERSION_LABEL } from '../../lib/version';
import { STUDENTS } from '../../lib/students';
import { useGradeLabels } from '../../lib/useGradeLabels';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const students = STUDENTS;

type Stats = { guides: number; decks: number; exams: number; tasks: number; completedTasks: number; streak: number; today: { planned: number; done: number } | null; lastStudied: string | null;
  upcoming: { name: string; className: string; days: number }[]; grades: { className: string; current: number; needed: number | null; status: string }[]; dueTasks: number; };

export default function ParentDashboard() {
  const labels = useGradeLabels();
  // Opens only for a signed-in parent. Anyone else is sent to sign in (a student goes to their own pages).
  const [unlocked, setUnlocked] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [stats,   setStats]   = useState<Record<string, Stats>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  useEffect(() => {
    installApiAuth();
    accountState().then(state => {
      if (state.status === 'unreachable') { setUnreachable(true); return; }
      if (state.status === 'signed-out') { window.location.replace('/login'); return; }
      if (state.account.needsPassword || state.account.role !== 'parent') { window.location.replace(homeFor(state.account)); return; }
      setUnlocked(true);
    });
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const fetchData = async () => {
      const statMap: Record<string, Stats> = {};
      for (const s of students) {
        const [{ count: guides }, { count: decks }, { count: exams }, { data: taskData }] = await Promise.all([
          supabase.from('study_guides').select('id', { count: 'exact', head: true }).eq('student_id', s.id),
          supabase.from('flashcard_decks').select('id', { count: 'exact', head: true }).eq('student_id', s.id),
          supabase.from('practice_exams').select('id', { count: 'exact', head: true }).eq('student_id', s.id),
          supabase.from('tasks').select('completed, due_date').eq('student_id', s.id),
        ]);
        // Effort and what's coming: streak + today's plan, exams in the next three weeks, and each class against an A.
        const today = localDateStr(new Date());
        const since = new Date(); since.setDate(since.getDate() - 120);
        const [daysRes, { data: classRows }, { data: gradeRows }] = await Promise.all([
          fetch('/api/study-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student: s.id, since: localDateStr(since) }) }).then(r => r.ok ? r.json() : null).catch(() => null),
          supabase.from('classes').select('id, name, grading_schema').eq('student_id', s.id).eq('is_active', true),
          supabase.from('grades').select('class_id, category, score, max_score').eq('student_id', s.id),
        ]);
        const days: { day: string; planned: number; done: number }[] = Array.isArray(daysRes?.days) ? daysRes.days : [];
        const classList = Array.isArray(classRows) ? classRows : [];
        const { data: folderRows } = classList.length ? await supabase.from('exam_folders').select('name, exam_date, class_id').in('class_id', classList.map(c => c.id)).gte('exam_date', today).order('exam_date', { ascending: true }).limit(4) : { data: [] };
        const todayRow = days.find(d => d.day === today) || null;
        statMap[s.id] = {
          streak: streakFrom(days, today),
          today: todayRow ? { planned: todayRow.planned, done: todayRow.done } : null,
          lastStudied: [...days].reverse().find(d => d.done > 0)?.day || null,
          upcoming: (Array.isArray(folderRows) ? folderRows : []).map(f => ({ name: f.name, className: classList.find(c => c.id === f.class_id)?.name || '', days: daysBetween(today, f.exam_date) })).filter(e => e.days <= 21),
          grades: classList.map(c => { const t = gradeTarget(c.grading_schema, (Array.isArray(gradeRows) ? gradeRows : []).filter(g => g.class_id === c.id), 93); return 'current' in t ? { className: c.name, current: t.current, needed: 'needed' in t ? t.needed : null, status: t.status === 'final' ? (t.reached ? 'secured' : 'short') : t.status } : null; }).filter((g): g is NonNullable<typeof g> => !!g),
          dueTasks: (taskData || []).filter((t: { completed: boolean; due_date?: string }) => !t.completed && !!t.due_date && t.due_date <= today).length,
          guides: guides ?? 0,
          decks: decks ?? 0,
          exams: exams ?? 0,
          tasks: taskData?.length ?? 0,
          completedTasks: taskData?.filter(t => t.completed).length ?? 0,
        };
      }
      setStats(statMap);
      setStatsLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        {unreachable && <div><div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Can&apos;t reach Ascend right now</div><div style={{ fontSize: 13, color: '#9E9BB0' }}>Check your connection and reload the page.</div></div>}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
        <div style={{ flex: 1 }} />
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: '#FFFFFF' }}>← Back</span>
        </Link>
        <button onClick={() => signOut()} style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Sign out</button>
      </nav>

      <div style={{ background: 'linear-gradient(135deg, #1D1B26, #3A3545)', padding: '28px 20px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Parent View</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.8px', marginBottom: 4 }}>Welcome, Gregory.</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Manage your students and their access.</div>
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Activity Overview */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>Activity Overview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {students.map(s => {
            const st = stats[s.id];
            const pct = st && st.tasks > 0 ? Math.round((st.completedTasks / st.tasks) * 100) : 0;
            return (
              <div key={s.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image src={s.avatar} alt={s.name} width={44} height={44} style={{ objectFit: 'contain', transform: s.flip ? 'scaleX(-1)' : 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 1 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0' }}>{labels[s.id] || '\u00A0'}</div>
                  </div>
                  <Link href={`/${s.id}`} style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.light, padding: '5px 12px', borderRadius: 999, textDecoration: 'none' }}>View →</Link>
                </div>
                {statsLoading ? (
                  <div style={{ fontSize: 12, color: '#C4C1D4' }}>Loading...</div>
                ) : (
                  <>
                    {st && (
                      <div data-effort={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 999, background: st.streak > 0 ? '#FFF3E8' : '#F3F1EC', color: st.streak > 0 ? '#C8965A' : '#9E9BB0' }}>{st.streak > 0 ? `${st.streak}-day streak` : 'No streak yet'}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 999, background: st.today && st.today.planned > 0 && st.today.done >= st.today.planned ? '#EDF7F2' : '#F3F1EC', color: st.today && st.today.planned > 0 && st.today.done >= st.today.planned ? '#5FAD8E' : '#6B6880' }}>
                            {st.today ? (st.today.planned === 0 ? 'Nothing due today' : `Today: ${st.today.done} of ${st.today.planned} done`) : 'Hasn\u2019t opened Ascend today'}
                          </span>
                          {st.dueTasks > 0 && <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 999, background: '#FDF2F2', color: '#C47878' }}>{st.dueTasks} task{st.dueTasks === 1 ? '' : 's'} due or overdue</span>}
                          {st.lastStudied && st.lastStudied !== localDateStr(new Date()) && <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: '#F3F1EC', color: '#9E9BB0' }}>Last studied {new Date(st.lastStudied + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        </div>
                        {st.upcoming.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 5 }}>Coming up</div>
                            {st.upcoming.map((e, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '3px 0' }}>
                                <span style={{ color: '#1D1B26', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}<span style={{ color: '#9E9BB0', fontWeight: 600 }}>{e.className ? ` · ${e.className}` : ''}</span></span>
                                <span style={{ fontWeight: 800, color: e.days <= 3 ? '#C47878' : e.days <= 7 ? '#C8965A' : '#6B6880', flexShrink: 0 }}>{e.days === 0 ? 'today' : e.days === 1 ? 'tomorrow' : `in ${e.days} days`}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {st.grades.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 5 }}>Grades against an A</div>
                            {st.grades.map((g, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '3px 0' }}>
                                <span style={{ color: '#1D1B26', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.className}<span style={{ color: '#9E9BB0', fontWeight: 600 }}> · {g.current.toFixed(1)}% now</span></span>
                                <span style={{ fontWeight: 800, flexShrink: 0, color: g.status === 'out-of-reach' || g.status === 'short' ? '#C47878' : g.status === 'secured' ? '#5FAD8E' : '#6B6880' }}>{g.status === 'secured' ? 'A locked in' : g.status === 'out-of-reach' ? 'A out of reach' : g.status === 'short' ? 'short of an A' : `needs ${g.needed?.toFixed(1)}% on the rest`}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Study Guides', value: st?.guides ?? 0 },
                        { label: 'Flashcard Decks', value: st?.decks ?? 0 },
                        { label: 'Practice Exams', value: st?.exams ?? 0 },
                        { label: 'Tasks Done', value: `${st?.completedTasks ?? 0}/${st?.tasks ?? 0}` },
                      ].map((item, i) => (
                        <div key={i} style={{ background: s.light, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 2 }}>{item.value}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: s.color, opacity: 0.7, lineHeight: 1.3 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    {st && st.tasks > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#9E9BB0' }}>Task completion</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, background: '#F3F1EC', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: s.color, borderRadius: 99, width: `${pct}%`, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* People & sign-ins */}
        <PeoplePanel />

        {/* App Info */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>App Info</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #F3F1EC', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>Version</span>
            <span style={{ fontSize: 13, color: '#9E9BB0' }}>{APP_VERSION_LABEL}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #F3F1EC', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>Founded</span>
            <span style={{ fontSize: 13, color: '#9E9BB0' }}>April 2026</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>Students</span>
            <span style={{ fontSize: 13, color: '#9E9BB0' }}>Matthew · Michael · Brynne</span>
          </div>
        </div>
      </main>
    </div>
  );
}