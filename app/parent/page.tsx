'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const students = [
  { id: 'matthew', name: 'Matthew', grade: 'Junior · 11th Grade', goal: 'WVU School of Dentistry', avatar: '/eagle.png', flip: false, color: '#7B6FA0', light: '#EDE9F7' },
  { id: 'michael', name: 'Michael', grade: 'Incoming 9th Grade', goal: 'WVU School of Medicine', avatar: '/lion.png', flip: true, color: '#7B6FA0', light: '#EDE9F7' },
  { id: 'brynne',  name: 'Brynne',  grade: '5th Grade',          goal: 'Future WVU Physician',  avatar: '/dragon.png', flip: false, color: '#E8956D', light: '#FFF3E8' },
];

type Stats = { guides: number; decks: number; exams: number; tasks: number; completedTasks: number; };

export default function ParentDashboard() {
  const [unlocked, setUnlocked]   = useState(false);
  const [password, setPassword]   = useState('');
  const [pwError,  setPwError]    = useState('');
  const [checking, setChecking]   = useState(false);

  const [pins,    setPins]    = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [newPin,  setNewPin]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState<string | null>(null);
  const [error,   setError]   = useState('');
  const [stats,   setStats]   = useState<Record<string, Stats>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  const handleUnlock = async () => {
    setChecking(true);
    setPwError('');
    const res = await fetch('/api/verify-parent-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setUnlocked(true);
    } else {
      setPwError('Incorrect password. Try again.');
    }
    setChecking(false);
  };

  useEffect(() => {
    if (!unlocked) return;
    const fetchData = async () => {
      const { data: pinData } = await supabase.from('students').select('id, pin');
      if (pinData) {
        const map: Record<string, string> = {};
        pinData.forEach(s => { map[s.id] = s.pin || ''; });
        setPins(map);
      }

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
  }, [unlocked]);

  const handleSavePin = async (studentId: string) => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setSaving(true); setError('');
    const { error: updateError } = await supabase.from('students').update({ pin: newPin }).eq('id', studentId);
    if (updateError) {
      setError('Could not save PIN. Please try again.');
    } else {
      setPins(p => ({ ...p, [studentId]: newPin }));
      setSaved(studentId); setEditing(null); setNewPin('');
      setTimeout(() => setSaved(null), 2000);
    }
    setSaving(false);
  };

  const handleRemovePin = async (studentId: string) => {
    setSaving(true);
    await supabase.from('students').update({ pin: null }).eq('id', studentId);
    setPins(p => ({ ...p, [studentId]: '' }));
    setSaving(false);
  };

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mountain />
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 22, padding: '32px 28px', width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(29,27,38,0.08)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EDE9F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#7B6FA0" strokeWidth="1.8" fill="none"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#7B6FA0" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="#7B6FA0"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Parent Dashboard</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24 }}>Enter your password to continue</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
            placeholder="Password"
            autoFocus
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 15, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box', marginBottom: 12, textAlign: 'center', letterSpacing: 4 }}
          />
          {pwError && <div style={{ fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 12 }}>{pwError}</div>}
          <button
            onClick={handleUnlock}
            disabled={!password.trim() || checking}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !password.trim() ? 0.4 : 1 }}
          >
            {checking ? 'Checking...' : 'Unlock'}
          </button>
          <div style={{ marginTop: 16 }}>
            <Link href="/" style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', textDecoration: 'none' }}>← Back to Ascend</Link>
          </div>
        </div>
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
                    <div style={{ fontSize: 11, color: '#9E9BB0' }}>{s.grade}</div>
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

        {/* PIN Management */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>PIN Management</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {students.map((s) => (
            <div key={s.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: editing === s.id ? 16 : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pins[s.id] ? '#5FAD8E' : '#C4C1D4' }}>
                    {pins[s.id] ? '🔒 PIN active' : '🔓 No PIN set'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditing(editing === s.id ? null : s.id); setNewPin(''); setError(''); }} style={{ padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: editing === s.id ? s.light : '#FAFAF8', color: editing === s.id ? s.color : '#6B6880', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                    {pins[s.id] ? 'Change' : 'Set PIN'}
                  </button>
                  {pins[s.id] && (
                    <button onClick={() => handleRemovePin(s.id)} style={{ padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#C47878', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Remove</button>
                  )}
                </div>
              </div>
              {editing === s.id && (
                <div style={{ borderTop: '1px solid #E8E5F0', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', marginBottom: 10 }}>Enter a 4-digit PIN for {s.name}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="number" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.slice(0, 4))} placeholder="••••" style={{ width: 100, padding: '10px 14px', border: `1.5px solid ${s.color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 18, color: '#1D1B26', background: '#FAFAF8', outline: 'none', letterSpacing: 6, textAlign: 'center' }} />
                    <button onClick={() => handleSavePin(s.id)} disabled={saving || newPin.length !== 4} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: s.color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: newPin.length !== 4 || saving ? 0.4 : 1 }}>
                      {saving ? 'Saving...' : 'Save PIN'}
                    </button>
                    {saved === s.id && <span style={{ fontSize: 13, color: '#5FAD8E', fontWeight: 700 }}>✅ Saved!</span>}
                  </div>
                  {error && <p style={{ fontSize: 12, color: '#C47878', marginTop: 8 }}>{error}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* App Info */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>App Info</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #F3F1EC', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>Version</span>
            <span style={{ fontSize: 13, color: '#9E9BB0' }}>Ascend v2.3.5 · May 2026</span>
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