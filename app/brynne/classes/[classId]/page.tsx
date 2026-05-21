'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TabBar from '../../../components/TabBar';
import { supabase } from '../../../../lib/supabase';

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

type ClassRow   = { id: string; name: string; semester: string; professor: string; };
type Folder     = { id: string; name: string; exam_date: string | null; created_at: string; };
type ParsedExam = { name: string; date: string | null; };

const color = '#E8956D';
const light = '#FFF3E8';

async function createNudges(examName: string, examDate: string, studentId: string) {
  const exam  = new Date(examDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nudgeDays = [
    { days: 14, label: `2 weeks until ${examName}` },
    { days: 7,  label: `1 week until ${examName}` },
    { days: 3,  label: `${examName} in 3 days` },
    { days: 1,  label: `${examName} tomorrow` },
  ];
  const nudges = nudgeDays
    .map(n => { const d = new Date(exam); d.setDate(exam.getDate() - n.days); return { date: d, label: n.label }; })
    .filter(n => n.date >= today)
    .map(n => ({ student_id: studentId, title: n.label, due_date: n.date.toISOString().split('T')[0], task_type: 'nudge', completed: false }));
  if (nudges.length > 0) await supabase.from('tasks').insert(nudges);
}

export default function BrynneClassBinder() {
  const router  = useRouter();
  const params  = useParams();
  const classId = params.classId as string;

  const [cls,          setCls]          = useState<ClassRow | null>(null);
  const [folders,      setFolders]      = useState<Folder[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showAdd,      setShowAdd]      = useState(false);
  const [newName,      setNewName]      = useState('');
  const [newDate,      setNewDate]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [parsing,      setParsing]      = useState(false);
  const [parsedExams,  setParsedExams]  = useState<ParsedExam[]>([]);
  const [parseError,   setParseError]   = useState('');
  const [creating,     setCreating]     = useState(false);
  const [createDone,   setCreateDone]   = useState(false);
  const syllabusRef = useRef<HTMLInputElement>(null);

  const [showEdit,      setShowEdit]      = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editSemester,  setEditSemester]  = useState('');
  const [editProfessor, setEditProfessor] = useState('');
  const [editSaving,    setEditSaving]    = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: classData } = await supabase.from('classes').select('id, name, semester, professor').eq('id', classId).single();
      if (classData) setCls(classData);
      const { data: folderData } = await supabase.from('exam_folders').select('id, name, exam_date, created_at').eq('class_id', classId).order('exam_date', { ascending: true });
      if (folderData) setFolders(folderData);
      setLoading(false);
    };
    load();
  }, [classId]);

  const openEdit = () => {
    if (!cls) return;
    setEditName(cls.name);
    setEditSemester(cls.semester || '');
    setEditProfessor(cls.professor || '');
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    await supabase.from('classes').update({
      name: editName.trim(),
      semester: editSemester.trim() || null,
      professor: editProfessor.trim() || null,
    }).eq('id', classId);
    setCls(prev => prev ? { ...prev, name: editName.trim(), semester: editSemester.trim(), professor: editProfessor.trim() } : prev);
    setShowEdit(false);
    setEditSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('classes').update({ is_active: false }).eq('id', classId);
    router.push('/brynne/classes');
  };

  const sortedInsert = (prev: Folder[], newItems: Folder[]) =>
    [...prev, ...newItems].sort((a, b) => { if (!a.exam_date) return 1; if (!b.exam_date) return -1; return a.exam_date.localeCompare(b.exam_date); });

  const handleAddFolder = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('exam_folders').insert({ class_id: classId, name: newName.trim(), exam_date: newDate || null }).select().single();
    if (data) {
      setFolders(prev => sortedInsert(prev, [data]));
      if (newDate) await createNudges(newName.trim(), newDate, 'brynne');
    }
    setNewName(''); setNewDate(''); setShowAdd(false); setSaving(false);
  };

  const handleSyllabusParse = async () => {
    if (!syllabusFile) return;
    setParsing(true); setParseError(''); setParsedExams([]);
    try {
      const formData = new FormData();
      formData.append('file', syllabusFile);
      const res  = await fetch('/api/parse-syllabus', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.exams || data.exams.length === 0) { setParseError('No exams found. Try adding folders manually.'); }
      else { setParsedExams(data.exams); }
    } catch (err: any) {
      setParseError(err.message || 'Could not parse syllabus.');
    } finally { setParsing(false); }
  };

  const updateParsedExam = (i: number, field: 'name' | 'date', value: string) =>
    setParsedExams(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const removeParsedExam = (i: number) =>
    setParsedExams(prev => prev.filter((_, idx) => idx !== i));

  const handleCreateFolders = async () => {
    if (parsedExams.length === 0) return;
    setCreating(true);
    try {
      const { data } = await supabase.from('exam_folders').insert(parsedExams.map(e => ({ class_id: classId, name: e.name, exam_date: e.date || null }))).select();
      if (data) {
        setFolders(prev => sortedInsert(prev, data));
        for (const exam of parsedExams) { if (exam.date) await createNudges(exam.name, exam.date, 'brynne'); }
      }
      setCreateDone(true);
      setTimeout(() => { setShowSyllabus(false); setSyllabusFile(null); setParsedExams([]); setCreateDone(false); setParseError(''); }, 1200);
    } catch { setParseError('Could not create folders. Please try again.'); }
    finally { setCreating(false); }
  };

  const resetSyllabus = () => { setSyllabusFile(null); setParsedExams([]); setParseError(''); setCreateDone(false); if (syllabusRef.current) syllabusRef.current.value = ''; };
  const formatDate = (d: string | null) => { if (!d) return null; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const daysUntil  = (d: string | null) => { if (!d) return null; const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000); if (diff < 0) return null; if (diff === 0) return 'Today!'; if (diff === 1) return '1 day away'; return `${diff} days away`; };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0',
    borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14,
    color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
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

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <button onClick={() => router.push('/brynne/classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Classes</button>

        {cls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>{classLabel(cls.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.6px', marginBottom: 2 }}>{cls.name}</div>
              <div style={{ fontSize: 12, color: '#9E9BB0' }}>{[cls.semester, cls.professor].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={openEdit} style={{ padding: '7px 14px', borderRadius: 999, background: light, border: 'none', color, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Edit</button>
              <button onClick={() => setShowDelete(true)} style={{ padding: '7px 14px', borderRadius: 999, background: '#F3F1EC', border: 'none', color: '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Archive</button>
            </div>
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div style={{ background: `linear-gradient(135deg, ${color}, #C4A882)`, borderRadius: 18, padding: '20px 22px', marginBottom: 20, color: 'white' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Quick Setup</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Upload your syllabus!</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 16, lineHeight: 1.5 }}>Ascend reads your syllabus and creates all your folders and reminders automatically — so cool!</div>
            <button onClick={() => setShowSyllabus(true)} style={{ padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.35)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Upload Syllabus →</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>Exam Folders</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {folders.length > 0 && <button onClick={() => setShowSyllabus(true)} style={{ padding: '6px 14px', borderRadius: 999, background: '#F3F1EC', border: 'none', color: '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Syllabus</button>}
            <button onClick={() => setShowAdd(true)} style={{ padding: '6px 14px', borderRadius: 999, background: light, border: 'none', color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Add Folder</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
        ) : folders.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No folders yet!</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Upload your syllabus above or add folders manually.</div>
            <button onClick={() => setShowAdd(true)} style={{ padding: '10px 22px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Add First Folder</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {folders.map((folder) => {
              const countdown = daysUntil(folder.exam_date);
              const isUrgent  = countdown && countdown !== 'Today!' && parseInt(countdown) <= 7;
              return (
                <div key={folder.id} onClick={() => router.push(`/brynne/classes/${classId}/${folder.id}`)} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>{folder.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>{folder.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {folder.exam_date && <span style={{ fontSize: 11, color: '#9E9BB0' }}>{formatDate(folder.exam_date)}</span>}
                        {countdown && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: countdown === 'Today!' ? '#FDF2F2' : light, color: countdown === 'Today!' ? '#C47878' : isUrgent ? '#C8965A' : color }}>{countdown}</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#C4C1D4', fontSize: 16 }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── EDIT CLASS MODAL ── */}
      {showEdit && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(29,27,38,0.18)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 20 }}>Edit Class</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Class Name</label>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Algebra" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Semester (optional)</label>
              <input value={editSemester} onChange={e => setEditSemester(e.target.value)} placeholder="e.g. Fall 2026" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Teacher (optional)</label>
              <input value={editProfessor} onChange={e => setEditProfessor(e.target.value)} placeholder="e.g. Mrs. Johnson" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={!editName.trim() || editSaving} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !editName.trim() ? 0.4 : 1 }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CLASS MODAL ── */}
      {showDelete && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowDelete(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(29,27,38,0.18)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 8 }}>Archive Class?</div>
            <div style={{ fontSize: 14, color: '#9E9BB0', marginBottom: 24, lineHeight: 1.6 }}>
              <strong style={{ color: '#1D1B26' }}>{cls?.name}</strong> will be moved to your archived classes. All folders, resources, and materials are preserved — you can restore it anytime from the Classes page!
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#E8956D', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD FOLDER MODAL ── */}
      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); setNewName(''); setNewDate(''); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '24px 20px 28px', width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(29,27,38,0.18)' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>New Folder</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 22 }}>Ascend will add countdown reminders automatically when you pick a date!</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Folder Name</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) handleAddFolder(); }} placeholder="e.g. Chapter 4 Test, Midterm..." style={{ ...inputStyle, border: `1.5px solid ${color}` }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Test Date (optional)</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={inputStyle} />
            </div>
            {newDate && <div style={{ background: light, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color, fontWeight: 600 }}>Reminders at 14 days, 7 days, 3 days, and 1 day before — you got this! 🌟</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewDate(''); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddFolder} disabled={!newName.trim() || saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !newName.trim() || saving ? 0.4 : 1 }}>{saving ? 'Saving...' : 'Create Folder 🌟'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SYLLABUS MODAL ── */}
      {showSyllabus && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowSyllabus(false); resetSyllabus(); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '24px 20px 32px', width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(29,27,38,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Upload Syllabus</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Ascend will create all your folders and reminders automatically — so easy!</div>
            {!parsedExams.length && !parsing && (
              <>
                <input ref={syllabusRef} type="file" accept=".pdf" onChange={e => { setSyllabusFile(e.target.files?.[0] || null); setParseError(''); }} style={{ display: 'none' }} />
                {syllabusFile ? (
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${color}`, background: light, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M16 4v6h6" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{syllabusFile.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>{(syllabusFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button onClick={resetSyllabus} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                  </div>
                ) : (
                  <div onClick={() => syllabusRef.current?.click()} style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', marginBottom: 14 }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = color} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E5F0'}>
                    <svg width="40" height="40" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 10px', display: 'block' }}><path d="M20 19a5 5 0 10-1-9.9A7 7 0 104 17" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M14 15v8" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round"/><path d="M11 18l3-3 3 3" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>Tap to choose your syllabus!</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0' }}>PDF files only</div>
                  </div>
                )}
                {parseError && <div style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 14 }}>{parseError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowSyllabus(false); resetSyllabus(); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSyllabusParse} disabled={!syllabusFile} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: syllabusFile ? color : '#F3F1EC', color: syllabusFile ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: syllabusFile ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>Read My Syllabus ✨</button>
                </div>
              </>
            )}
            {parsing && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.75s linear infinite' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 6 }}>Reading your syllabus... 🌟</div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>Finding all your tests and making reminders!</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {parsedExams.length > 0 && !parsing && (
              <>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>{parsedExams.length} test{parsedExams.length !== 1 ? 's' : ''} found! 🎉</div>
                <div style={{ fontSize: 12, color: '#9E9BB0', marginBottom: 16 }}>Check them and make any changes!</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {parsedExams.map((exam, i) => (
                    <div key={i} style={{ background: '#FAFAF8', border: '1.5px solid #E8E5F0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={exam.name} onChange={e => updateParsedExam(i, 'name', e.target.value)} style={{ padding: '7px 10px', border: `1.5px solid ${color}`, borderRadius: 8, fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, color: '#1D1B26', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' as const }} />
                        <input type="date" value={exam.date || ''} onChange={e => updateParsedExam(i, 'date', e.target.value)} style={{ padding: '7px 10px', border: '1.5px solid #E8E5F0', borderRadius: 8, fontFamily: 'var(--font-jakarta)', fontSize: 12, color: '#9E9BB0', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' as const }} />
                      </div>
                      <button onClick={() => removeParsedExam(i)} style={{ fontSize: 14, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ background: light, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color, fontWeight: 600 }}>Reminders at 14, 7, 3, and 1 day before each test — you got this! 🌟</div>
                {parseError && <div style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 14 }}>{parseError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={resetSyllabus} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Start Over</button>
                  <button onClick={handleCreateFolders} disabled={parsedExams.length === 0 || creating || createDone} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: createDone ? '#5FAD8E' : color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: creating ? 0.7 : 1 }}>
                    {createDone ? 'Folders Created!' : creating ? 'Creating...' : `Create ${parsedExams.length} Folder${parsedExams.length !== 1 ? 's' : ''} 🌟`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <TabBar student="brynne" />
    </div>
  );
}