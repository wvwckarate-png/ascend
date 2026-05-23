'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../../components/TabBar';
import { supabase } from '../../../lib/supabase';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function classLabel(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('physics'))   return 'PHY';
  if (n.includes('biology'))   return 'BIO';
  if (n.includes('chemistry')) return 'CHM';
  if (n.includes('algebra') || n.includes('math')) return 'MTH';
  if (n.includes('english'))   return 'ENG';
  if (n.includes('science'))   return 'SCI';
  if (n.includes('history'))   return 'HIS';
  if (n.includes('sat') || n.includes('act')) return 'SAT';
  return name.slice(0, 3).toUpperCase();
}

type Class = {
  id: string; name: string; semester: string | null; professor: string | null;
  class_level: string | null; credit_hours: number; is_bcpm: boolean; is_science: boolean;
  grade_only: boolean; letter_grade: string | null; grading_schema: Record<string, number> | null;
};
type Grade = { class_id: string; category: string; score: number; max_score: number; };

const CLASS_COLORS = ['#9B8EC4', '#7B6FA0', '#A89EC4', '#6B7FA0', '#8E9BC4', '#7B8FA0'];

const LETTER_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

function isBCPMName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('bio') || n.includes('chem') || n.includes('physics') ||
         n.includes('math') || n.includes('algebra') || n.includes('calculus') ||
         n.includes('trig') || n.includes('statistic') || n.includes('anatomy') ||
         n.includes('physiology') || n.includes('genetics') || n.includes('microbio') ||
         n.includes('organic');
}

function percentToGPA(pct: number): number {
  if (pct >= 93) return 4.0; if (pct >= 90) return 3.7; if (pct >= 87) return 3.3;
  if (pct >= 83) return 3.0; if (pct >= 80) return 2.7; if (pct >= 77) return 2.3;
  if (pct >= 73) return 2.0; if (pct >= 70) return 1.7; if (pct >= 60) return 1.0;
  return 0.0;
}

function letterToGPA(letter: string): number | null {
  const map: Record<string, number> = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0,
  };
  return map[letter?.trim()] ?? null;
}

function classGPAPoints(cls: any, grades: any[]): number | null {
  if (cls.grade_only) return cls.letter_grade ? letterToGPA(cls.letter_grade) : null;
  const classGrades = grades.filter((g: any) => g.class_id === cls.id);
  if (classGrades.length === 0) return null;
  let pct: number;
  if (cls.grading_schema && Object.keys(cls.grading_schema).length > 0) {
    let totalWeight = 0; let weightedSum = 0;
    for (const [cat, weight] of Object.entries(cls.grading_schema as Record<string, number>)) {
      const catGrades = classGrades.filter((g: any) => g.category.toLowerCase() === cat.toLowerCase());
      if (catGrades.length === 0) continue;
      const avg = catGrades.reduce((sum: number, g: any) => sum + (g.score / g.max_score) * 100, 0) / catGrades.length;
      weightedSum += avg * (weight / 100); totalWeight += weight;
    }
    if (totalWeight === 0) return null;
    pct = weightedSum / (totalWeight / 100);
  } else {
    pct = classGrades.reduce((sum: number, g: any) => sum + (g.score / g.max_score) * 100, 0) / classGrades.length;
  }
  return percentToGPA(pct);
}

function computeGPA(classes: any[], grades: any[], filter: 'all' | 'science' | 'bcpm'): { gpa: number | null; count: number } {
  const eligible = classes.filter(cls => {
    const level = (cls.class_level || '').toLowerCase();
    if (level.includes('ap') || level.includes('high school')) return false;
    if (filter === 'bcpm' && !cls.is_bcpm) return false;
    if (filter === 'science' && !cls.is_bcpm && !cls.is_science) return false;
    return true;
  });
  let totalCredits = 0; let weightedPoints = 0; let count = 0;
  for (const cls of eligible) {
    const pts = classGPAPoints(cls, grades);
    if (pts === null) continue;
    const credits = cls.credit_hours || 3;
    totalCredits += credits; weightedPoints += pts * credits; count++;
  }
  if (totalCredits === 0) return { gpa: null, count: 0 };
  return { gpa: Math.round((weightedPoints / totalCredits) * 100) / 100, count };
}

function gpaColor(gpa: number | null): string {
  if (gpa === null) return '#C4C1D4';
  if (gpa >= 3.5) return '#5FAD8E';
  if (gpa >= 3.0) return '#7B6FA0';
  if (gpa >= 2.5) return '#C8965A';
  return '#C47878';
}

export default function MatthewClasses() {
  const router = useRouter();
  const [classes,        setClasses]        = useState<Class[]>([]);
  const [archived,       setArchived]       = useState<Class[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showArchived,   setShowArchived]   = useState(false);
  const [grades,         setGrades]         = useState<Grade[]>([]);
  const [showGPAModal,   setShowGPAModal]   = useState(false);
  const [editGPAClass,   setEditGPAClass]   = useState<Class | null>(null);
  const [gpaName,        setGpaName]        = useState('');
  const [gpaSemester,    setGpaSemester]    = useState('');
  const [gpaCredits,     setGpaCredits]     = useState('3');
  const [gpaLetter,      setGpaLetter]      = useState('A');
  const [gpaBCPM,        setGpaBCPM]        = useState(false);
  const [gpaScience,     setGpaScience]     = useState(false);
  const [gpaSaving,      setGpaSaving]      = useState(false);

  useEffect(() => {
    const load = async () => {
      const cols = 'id, name, semester, professor, class_level, credit_hours, is_bcpm, is_science, grade_only, letter_grade, grading_schema';
      const { data: active }   = await supabase.from('classes').select(cols).eq('student_id', 'matthew').eq('is_active', true).order('created_at', { ascending: false });
      const { data: inactive } = await supabase.from('classes').select(cols).eq('student_id', 'matthew').eq('is_active', false).order('created_at', { ascending: false });
      const { data: gradeData } = await supabase.from('grades').select('class_id, category, score, max_score').eq('student_id', 'matthew');
      if (gradeData) setGrades(gradeData);

      // Auto-detect BCPM from class name for non-grade-only classes
      if (active) {
        const toFlag = active.filter(c => !c.grade_only && !c.is_bcpm && isBCPMName(c.name));
        if (toFlag.length > 0) {
          await Promise.all(toFlag.map(c => supabase.from('classes').update({ is_bcpm: true }).eq('id', c.id)));
          toFlag.forEach(c => { c.is_bcpm = true; });
        }
        setClasses(active);
      }
      if (inactive) setArchived(inactive);
      setLoading(false);
    };
    load();
  }, []);

  const toggleBCPM = async (cls: Class) => {
    const val = !cls.is_bcpm;
    await supabase.from('classes').update({ is_bcpm: val }).eq('id', cls.id);
    setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, is_bcpm: val } : c));
  };

  const toggleScience = async (cls: Class) => {
    const val = !cls.is_science;
    await supabase.from('classes').update({ is_science: val }).eq('id', cls.id);
    setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, is_science: val } : c));
  };

  const openGPAModal = (cls?: Class) => {
    if (cls) {
      setEditGPAClass(cls);
      setGpaName(cls.name); setGpaSemester(cls.semester || '');
      setGpaCredits(String(cls.credit_hours || 3));
      setGpaLetter(cls.letter_grade || 'A');
      setGpaBCPM(cls.is_bcpm); setGpaScience(cls.is_science);
    } else {
      setEditGPAClass(null);
      setGpaName(''); setGpaSemester(''); setGpaCredits('3');
      setGpaLetter('A'); setGpaBCPM(false); setGpaScience(false);
    }
    setShowGPAModal(true);
  };

  const saveGPAClass = async () => {
    if (!gpaName.trim()) return;
    setGpaSaving(true);
    const payload = {
      name: gpaName.trim(), semester: gpaSemester.trim() || null,
      credit_hours: parseFloat(gpaCredits) || 3,
      letter_grade: gpaLetter, is_bcpm: gpaBCPM, is_science: gpaScience,
      grade_only: true,
    };
    if (editGPAClass) {
      await supabase.from('classes').update(payload).eq('id', editGPAClass.id);
      setClasses(prev => prev.map(c => c.id === editGPAClass.id ? { ...c, ...payload } : c));
    } else {
      const { data } = await supabase.from('classes').insert({ ...payload, student_id: 'matthew', is_active: true }).select().single();
      if (data) setClasses(prev => [data, ...prev]);
    }
    setGpaSaving(false); setShowGPAModal(false);
  };

  const overallGPA = computeGPA(classes, grades, 'all');
  const scienceGPA = computeGPA(classes, grades, 'science');
  const bcpmGPA    = computeGPA(classes, grades, 'bcpm');

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>My Classes</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openGPAModal()} style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', background: '#F3F1EC', padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ GPA Class</button>
            <Link href="/matthew/add-class" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7B6FA0', background: '#EDE9F7', padding: '8px 16px', borderRadius: 999, display: 'block' }}>+ Add Class</span>
            </Link>
          </div>
        </div>

        {/* GPA Widget */}
        {(overallGPA.count > 0 || scienceGPA.count > 0 || bcpmGPA.count > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Overall GPA', data: overallGPA },
              { label: 'Science GPA', data: scienceGPA },
              { label: 'BCPM GPA',    data: bcpmGPA },
            ].map(({ label, data }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 12px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#C4C1D4', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: gpaColor(data.gpa), letterSpacing: '-0.5px', marginBottom: 4 }}>
                  {data.gpa !== null ? data.gpa.toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 10, color: '#9E9BB0', fontWeight: 600 }}>{data.count} course{data.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
        ) : classes.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No classes yet</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Add your first class to get started.</div>
            <Link href="/matthew/add-class" style={{ textDecoration: 'none' }}>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add a Class</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
            {classes.map((cls, i) => {
              const cardColor = CLASS_COLORS[i % CLASS_COLORS.length];
              const isAP = (cls.class_level || '').toLowerCase().includes('ap') || (cls.class_level || '').toLowerCase().includes('high school');
              const gpaPoints = classGPAPoints(cls, grades);

              if (cls.grade_only) {
                return (
                  <div key={cls.id} onClick={() => openGPAModal(cls)} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 8, fontWeight: 700, color: '#9E9BB0', background: '#F3F1EC', padding: '2px 6px', borderRadius: 999, letterSpacing: 1 }}>GPA</div>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#9E9BB0', marginBottom: 10 }}>
                      {classLabel(cls.name)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 3, lineHeight: 1.3 }}>{cls.name}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0', marginBottom: 8 }}>{cls.semester || ''}</div>
                    {cls.letter_grade && (
                      <div style={{ fontSize: 16, fontWeight: 900, color: gpaColor(gpaPoints), marginBottom: 6 }}>{cls.letter_grade}</div>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {cls.is_bcpm && <span style={{ fontSize: 8, fontWeight: 700, color: '#7B6FA0', background: '#EDE9F7', padding: '2px 6px', borderRadius: 999 }}>BCPM</span>}
                      {cls.is_science && <span style={{ fontSize: 8, fontWeight: 700, color: '#5FAD8E', background: '#EDF7F2', padding: '2px 6px', borderRadius: 999 }}>Science</span>}
                      <span style={{ fontSize: 8, fontWeight: 600, color: '#C4C1D4', padding: '2px 4px', borderRadius: 999 }}>{cls.credit_hours || 3}cr</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cls.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(123,111,160,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(29,27,38,0.06)'; }}
                >
                  <div onClick={() => router.push(`/matthew/classes/${cls.id}`)}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: cardColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: cardColor, marginBottom: 10 }}>
                      {classLabel(cls.name)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 3, lineHeight: 1.3 }}>{cls.name}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0', marginBottom: 8 }}>{cls.semester || cls.professor || ''}</div>
                    {gpaPoints !== null && !isAP && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: gpaColor(gpaPoints), marginBottom: 6 }}>{gpaPoints.toFixed(1)} pts · {cls.credit_hours || 3}cr</div>
                    )}
                    {isAP && <div style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginBottom: 6 }}>AP — not counted</div>}
                  </div>
                  {!isAP && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button onClick={e => { e.stopPropagation(); toggleBCPM(cls); }} style={{ fontSize: 9, fontWeight: 700, color: cls.is_bcpm ? '#7B6FA0' : '#C4C1D4', background: cls.is_bcpm ? '#EDE9F7' : '#F3F1EC', border: `1px solid ${cls.is_bcpm ? '#7B6FA0' : '#E8E5F0'}`, padding: '3px 8px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>BCPM</button>
                      <button onClick={e => { e.stopPropagation(); toggleScience(cls); }} style={{ fontSize: 9, fontWeight: 700, color: cls.is_science ? '#5FAD8E' : '#C4C1D4', background: cls.is_science ? '#EDF7F2' : '#F3F1EC', border: `1px solid ${cls.is_science ? '#5FAD8E' : '#E8E5F0'}`, padding: '3px 8px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Sci</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div
              onClick={() => router.push('/matthew/add-class')}
              style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 16, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', opacity: 0.5, minHeight: 100 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.5'}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#C4C1D4', marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>Add a Class</div>
            </div>
          </div>
        )}

        {archived.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <button onClick={() => setShowArchived(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase' as const, color: '#C4C1D4' }}>Archived ({archived.length})</span>
              <span style={{ fontSize: 10, color: '#C4C1D4' }}>{showArchived ? '▾' : '▸'}</span>
            </button>
            {showArchived && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {archived.map((cls, i) => {
                  const c = CLASS_COLORS[i % CLASS_COLORS.length];
                  return (
                    <div key={cls.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: c + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: c, flexShrink: 0 }}>{classLabel(cls.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>{cls.name}</div>
                        <div style={{ fontSize: 10, color: '#9E9BB0' }}>{cls.semester || ''}</div>
                      </div>
                      <button onClick={async () => { await supabase.from('classes').update({ is_active: true }).eq('id', cls.id); setArchived(prev => prev.filter(a => a.id !== cls.id)); setClasses(prev => [cls, ...prev]); }} style={{ fontSize: 11, fontWeight: 700, color: '#7B6FA0', background: '#EDE9F7', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>Restore</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      {showGPAModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowGPAModal(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(29,27,38,0.18)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>{editGPAClass ? 'Edit GPA Class' : 'Add GPA Class'}</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Classes without an Ascend binder — grades only.</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Class Name</label>
              <input value={gpaName} onChange={e => setGpaName(e.target.value)} placeholder='e.g. "ART 101" or "HIST 200"' style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Semester</label>
                <input value={gpaSemester} onChange={e => setGpaSemester(e.target.value)} placeholder='e.g. "Fall 2025"' style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ width: 100 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Credits</label>
                <input type="number" value={gpaCredits} onChange={e => setGpaCredits(e.target.value)} placeholder="3" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Letter Grade</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LETTER_GRADES.map(g => (
                  <button key={g} onClick={() => setGpaLetter(g)} style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${gpaLetter === g ? '#7B6FA0' : '#E8E5F0'}`, background: gpaLetter === g ? '#7B6FA0' : '#FAFAF8', color: gpaLetter === g ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{g}</button>
                ))}
              </div>
              {gpaLetter && (
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: gpaColor(letterToGPA(gpaLetter)) }}>
                  {gpaLetter} = {letterToGPA(gpaLetter)?.toFixed(1)} GPA points
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setGpaBCPM(b => !b)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${gpaBCPM ? '#7B6FA0' : '#E8E5F0'}`, background: gpaBCPM ? '#EDE9F7' : '#FAFAF8', color: gpaBCPM ? '#7B6FA0' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {gpaBCPM ? '✓ ' : ''}BCPM
              </button>
              <button onClick={() => setGpaScience(s => !s)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${gpaScience ? '#5FAD8E' : '#E8E5F0'}`, background: gpaScience ? '#EDF7F2' : '#FAFAF8', color: gpaScience ? '#5FAD8E' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {gpaScience ? '✓ ' : ''}Science
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowGPAModal(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveGPAClass} disabled={!gpaName.trim() || gpaSaving} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !gpaName.trim() ? 0.4 : 1 }}>
                {gpaSaving ? 'Saving...' : editGPAClass ? 'Save Changes' : 'Add to GPA'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar student="matthew" />
    </div>
  );
}