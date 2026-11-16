'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import PeoplePanel from '../components/PeoplePanel';
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

type Stats = { guides: number; decks: number; exams: number; tasks: number; completedTasks: number; };

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
          supabase.from('tasks').select('completed').eq('student_id', s.id),
        ]);
        statMap[s.id] = {
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