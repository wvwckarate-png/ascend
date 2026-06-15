'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import TabBar from '../../components/TabBar';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCheckCircle({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="11" stroke="#7B6FA0" strokeWidth="1.6" fill="#EDE9F7"/>
      <path d="M9 14l3.5 3.5 6.5-6.5" stroke="#7B6FA0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconFileUpload({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#C4C1D4" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke="#C4C1D4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 13v7" stroke="#C4C1D4" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M11 16l3-3 3 3" stroke="#C4C1D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const SEMESTERS = ['Fall 2025','Spring 2026','Summer 2026','Fall 2026','Spring 2027','Summer 2027'];
const CLASS_FORMATS = ['In Person','Online','Hybrid'];
const CLASS_DAYS = ['Mon/Wed/Fri','Tue/Thu','Mon/Wed','Once a Week','Asynchronous','Other'];
const color = '#7B6FA0';
const light = '#EDE9F7';

const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none' };
const cardStyle = { background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' };

type ParsedItem = { name: string; date: string | null; type: string; };
type ParsedSyllabus = {
  exams: ParsedItem[];
  assignments: ParsedItem[];
  gradingSchema: Record<string, number>;
  professorEmail: string | null;
  officeHours: string | null;
  courseDescription: string | null;
};

export default function MatthewAddClass() {
  const router = useRouter();
  const [className,    setClassName]    = useState('');
  const [semester,     setSemester]     = useState('');
  const [professor,    setProfessor]    = useState('');
  const [classDays,    setClassDays]    = useState('');
  const [classFormat,  setClassFormat]  = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [classLevel,   setClassLevel]   = useState('');
  const [file,         setFile]         = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [parsing,      setParsing]      = useState(false);
  const [error,        setError]        = useState('');
  const [parsed,       setParsed]       = useState<ParsedSyllabus | null>(null);
  const [selectedExams,       setSelectedExams]       = useState<Set<number>>(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [showPreview,  setShowPreview]  = useState(false);

  const toggleExam       = (i: number) => setSelectedExams(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleAssignment = (i: number) => setSelectedAssignments(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const formatDate = (d: string | null) => {
    if (!d) return 'Date TBD';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  const saveClass = async (parsedData: ParsedSyllabus | null = null) => {
    setLoading(true);
    setError('');
    try {
      const { data: newClass, error: insertError } = await supabase.from('classes').insert({
        student_id: 'matthew',
        name: className,
        semester,
        professor: professor || null,
        class_time: classDays || null,
        class_format: classFormat || null,
        course_number: courseNumber || null,
        class_level: classLevel || null,
        grading_schema: parsedData?.gradingSchema && Object.keys(parsedData.gradingSchema).length > 0 ? parsedData.gradingSchema : null,
      }).select().single();

      if (insertError) throw insertError;

      if (parsedData && newClass) {
        // Insert exam folders and capture their IDs
        const examItems = parsedData.exams.filter((_, i) => selectedExams.has(i));
        if (examItems.length > 0) {
          const { data: insertedFolders } = await supabase
            .from('exam_folders')
            .insert(examItems.map(e => ({ class_id: newClass.id, name: e.name, exam_date: e.date || null })))
            .select();

          // Create calendar tasks for exams that have a date
          if (insertedFolders && insertedFolders.length > 0) {
            const calendarTasks = insertedFolders
              .filter(f => f.exam_date)
              .map(f => ({
                student_id: 'matthew',
                title: `${f.name} — ${className}`,
                due_date: f.exam_date,
                task_type: 'exam',
                completed: false,
                class_name: className,
                folder_id: f.id,
              }));
            if (calendarTasks.length > 0) {
              await supabase.from('tasks').insert(calendarTasks);
            }
          }
        }

        // Insert assignment tasks
        const assignmentItems = parsedData.assignments.filter((_, i) => selectedAssignments.has(i));
        if (assignmentItems.length > 0) {
          await supabase.from('tasks').insert(
            assignmentItems.map(a => ({
              student_id: 'matthew',
              title: a.name,
              due_date: a.date || null,
              task_type: ['exam', 'quiz', 'midterm', 'final', 'test'].includes(a.type) ? 'exam' : 'assignment',
              completed: false,
              class_name: className,
            }))
          );
        }
      }

      router.push('/matthew');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!className || !semester) return;

    if (file && !showPreview) {
      setParsing(true);
      setError('');
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('semester', semester);
        const res  = await fetch('/api/parse-syllabus', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.parsed) {
          const hasItems = data.parsed.exams.length > 0 || data.parsed.assignments.length > 0 || Object.keys(data.parsed.gradingSchema || {}).length > 0;
          if (hasItems) {
            setParsed(data.parsed);
            setSelectedExams(new Set(data.parsed.exams.map((_: ParsedItem, i: number) => i)));
            setSelectedAssignments(new Set(data.parsed.assignments.map((_: ParsedItem, i: number) => i)));
            setShowPreview(true);
            setParsing(false);
            return;
          }
        }
        await saveClass(null);
      } catch {
        await saveClass(null);
      } finally {
        setParsing(false);
      }
      return;
    }

    await saveClass(parsed);
  };

  const totalSelected = selectedExams.size + selectedAssignments.size;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Add a Class</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Upload your syllabus and Ascend will auto-create your exam folders and tasks.</div>
        </div>

        {!showPreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={cardStyle}>
              <label style={labelStyle}>Class Name <span style={{ color }}>*</span></label>
              <input value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. AP Chemistry" style={inputStyle} />
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Semester <span style={{ color }}>*</span></label>
              <select value={semester} onChange={e => setSemester(e.target.value)} style={inputStyle}>
                <option value="">Select a semester</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Professor <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input value={professor} onChange={e => setProfessor(e.target.value)} placeholder="e.g. Dr. Smith" style={inputStyle} />
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Course Number <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input value={courseNumber} onChange={e => setCourseNumber(e.target.value)} placeholder="e.g. CHEM 101" style={inputStyle} />
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Class Level <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['AP', 'Honors', 'Dual Enrollment', 'Intro', 'Intermediate', 'Advanced'].map(l => (
                  <button key={l} onClick={() => setClassLevel(classLevel === l ? '' : l)} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${classLevel === l ? color : '#E8E5F0'}`, background: classLevel === l ? color : '#FAFAF8', color: classLevel === l ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                    {l}
                  </button>
                ))}
              </div>
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
                  <button key={f} onClick={() => setClassFormat(f)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${classFormat === f ? color : '#E8E5F0'}`, background: classFormat === f ? color : '#FAFAF8', color: classFormat === f ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>Syllabus <span style={{ color: '#9E9BB0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <div onClick={() => document.getElementById('syllabus-matthew')?.click()} style={{ padding: '20px', borderRadius: 12, border: `2px dashed ${file ? color : '#E8E5F0'}`, background: file ? light : '#FAFAF8', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{file ? <IconCheckCircle size={28} /> : <IconFileUpload size={28} />}</div>
                <div style={{ fontSize: 13, color: file ? color : '#9E9BB0', fontWeight: file ? 700 : 400 }}>{file ? file.name : 'Tap to upload your syllabus PDF'}</div>
                {file && <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 4 }}>Ascend will auto-create exam folders and tasks</div>}
                <input id="syllabus-matthew" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { setFile(e.target.files?.[0] || null); setShowPreview(false); setParsed(null); }} />
              </div>
              {file && <button onClick={() => { setFile(null); setShowPreview(false); setParsed(null); }} style={{ marginTop: 8, fontSize: 11, color: '#9E9BB0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Remove file</button>}
            </div>
            {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}
            {parsing ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 28, height: 28, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.75s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#9E9BB0' }}>Reading your syllabus...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={!className || !semester} style={{ padding: '14px', borderRadius: 14, border: 'none', background: color, color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !className || !semester ? 0.4 : 1 }}>
                {file ? 'Add Class & Import Syllabus' : 'Add Class'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: light, border: `1.5px solid ${color}40`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 4 }}>Syllabus parsed ✓</div>
              <div style={{ fontSize: 12, color: '#6B6880' }}>Found {parsed?.exams.length || 0} exam folder{parsed?.exams.length !== 1 ? 's' : ''} and {parsed?.assignments.length || 0} task{parsed?.assignments.length !== 1 ? 's' : ''}. Select what to import.</div>
            </div>

            {parsed?.courseDescription && (
              <div style={cardStyle}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6 }}>Course Overview</div>
                <div style={{ fontSize: 13, color: '#1D1B26', lineHeight: 1.5 }}>{parsed.courseDescription}</div>
              </div>
            )}

            {parsed && parsed.exams.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0' }}>Exam Folders ({selectedExams.size}/{parsed.exams.length})</div>
                  <button onClick={() => setSelectedExams(selectedExams.size === parsed.exams.length ? new Set() : new Set(parsed.exams.map((_, i) => i)))} style={{ fontSize: 11, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                    {selectedExams.size === parsed.exams.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {parsed.exams.map((exam, i) => (
                    <div key={i} onClick={() => toggleExam(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${selectedExams.has(i) ? color : '#E8E5F0'}`, background: selectedExams.has(i) ? light : '#FAFAF8', cursor: 'pointer' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selectedExams.has(i) ? color : '#C4C1D4'}`, background: selectedExams.has(i) ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedExams.has(i) && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>{exam.name}</div>
                        <div style={{ fontSize: 11, color: '#9E9BB0' }}>{formatDate(exam.date)}{exam.date ? ' · Added to calendar' : ''}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>{exam.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed && parsed.assignments.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0' }}>Tasks ({selectedAssignments.size}/{parsed.assignments.length})</div>
                  <button onClick={() => setSelectedAssignments(selectedAssignments.size === parsed.assignments.length ? new Set() : new Set(parsed.assignments.map((_, i) => i)))} style={{ fontSize: 11, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                    {selectedAssignments.size === parsed.assignments.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {parsed.assignments.map((a, i) => (
                    <div key={i} onClick={() => toggleAssignment(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${selectedAssignments.has(i) ? color : '#E8E5F0'}`, background: selectedAssignments.has(i) ? light : '#FAFAF8', cursor: 'pointer' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selectedAssignments.has(i) ? color : '#C4C1D4'}`, background: selectedAssignments.has(i) ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedAssignments.has(i) && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: '#9E9BB0' }}>{formatDate(a.date)}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>{a.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed && Object.keys(parsed.gradingSchema).length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 10 }}>Grading Schema</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(parsed.gradingSchema).map(([cat, pct]) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#1D1B26', textTransform: 'capitalize' }}>{cat}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, borderRadius: 99, background: '#E8E5F0', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color, width: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPreview(false)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>← Back</button>
              <button onClick={() => saveClass(parsed)} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Saving...' : `Add Class${totalSelected > 0 ? ` + ${totalSelected} Item${totalSelected !== 1 ? 's' : ''}` : ''}`}
              </button>
            </div>
            <button onClick={() => saveClass(null)} style={{ fontSize: 12, color: '#9E9BB0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textAlign: 'center' as const, padding: '4px' }}>
              Skip import — just add class
            </button>
          </div>
        )}
      </main>
      <TabBar student="matthew" />
    </div>
  );
}