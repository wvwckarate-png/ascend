'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

const SEMESTERS = ['Fall 2025','Spring 2026','Summer 2026','Fall 2026','Spring 2027','Summer 2027'];
const CLASS_FORMATS = ['In Person','Online','Hybrid'];
const CLASS_DAYS = ['Mon/Wed/Fri','Tue/Thu','Mon/Wed','Once a Week','Asynchronous','Other'];

const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none' };
const cardStyle = { background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' };

export default function BrynneAddClass() {
  const router = useRouter();
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('');
  const [professor, setProfessor] = useState('');
  const [classDays, setClassDays] = useState('');
  const [classFormat, setClassFormat] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!className || !semester) return;
    setLoading(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('classes').insert({
        student_id: 'brynne',
        name: className,
        semester,
        professor: professor || null,
        class_time: classDays || null,
        class_format: classFormat || null,
      });
      if (insertError) throw insertError;
      router.push('/brynne');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Brynne</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Add a Class! 🌟</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Tell Ascend about your class. You can add your syllabus later!</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={cardStyle}>
            <label style={labelStyle}>Class Name <span style={{ color: '#E8956D' }}>*</span></label>
            <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. Science Class" style={inputStyle} />
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Semester <span style={{ color: '#E8956D' }}>*</span></label>
            <select value={semester} onChange={e => setSemester(e.target.value)} style={inputStyle}>
              <option value="">Select a semester</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Teacher <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="e.g. Mrs. Johnson" style={inputStyle} />
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Class Days <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <select value={classDays} onChange={e => setClassDays(e.target.value)} style={inputStyle}>
              <option value="">Select class days</option>
              {CLASS_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Class Format <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CLASS_FORMATS.map(f => (
                <button key={f} onClick={() => setClassFormat(f)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${classFormat === f ? '#E8956D' : '#E8E5F0'}`, background: classFormat === f ? '#E8956D' : '#FAFAF8', color: classFormat === f ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Syllabus <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — can be added later)</span></label>
            <div
              onClick={() => document.getElementById('syllabus-brynne')?.click()}
              style={{ padding: '24px', borderRadius: 12, border: '2px dashed #E8E5F0', background: '#FAFAF8', textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{file ? file.name : 'Tap to upload your syllabus PDF'}</div>
              <input id="syllabus-brynne" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!className || !semester || loading}
            style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#E8956D', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !className || !semester || loading ? 0.4 : 1 }}
          >
            {loading ? 'Adding Class... ✨' : 'Add My Class! ✨'}
          </button>
        </div>
      </main>
    </div>
  );
}