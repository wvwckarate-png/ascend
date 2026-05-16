'use client';
import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
function IconFile({ c, size = 14 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconFolder({ c, size = 14 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/></svg>;
}
function IconEmptyFolder({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none"><path d="M4 11a2 2 0 012-2h6l3 3h14a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" stroke="#C4C1D4" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><line x1="12" y1="20" x2="24" y2="20" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/><line x1="12" y1="24" x2="19" y2="24" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function IconStack({ c, size = 14 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect x="4" y="14" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill="none"/><rect x="6" y="9" width="16" height="8" rx="2" stroke={c} strokeWidth="1.4" fill="none" opacity="0.6"/><rect x="8" y="4" width="12" height="8" rx="2" stroke={c} strokeWidth="1.3" fill="none" opacity="0.35"/></svg>;
}
function IconExam({ c, size = 28 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect x="7" y="3" width="14" height="22" rx="2" stroke={c} strokeWidth="1.6" fill="none"/><line x1="10" y1="9" x2="18" y2="9" stroke={c} strokeWidth="1.2"/><line x1="10" y1="13" x2="18" y2="13" stroke={c} strokeWidth="1.2"/><line x1="10" y1="17" x2="15" y2="17" stroke={c} strokeWidth="1.2"/><path d="M16 19l1.5 1.5 3-3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconTimer({ c, size = 16 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><circle cx="14" cy="16" r="10" stroke={c} strokeWidth="1.6" fill="none"/><path d="M14 10v6l4 3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="11" y1="3" x2="17" y2="3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><line x1="14" y1="3" x2="14" y2="6" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

type MCQuestion   = { type: 'mc'; question: string; options: { A: string; B: string; C: string; D: string }; answer: string; explanation: string; };
type TFQuestion   = { type: 'tf'; question: string; answer: string; explanation: string; };
type SAQuestion   = { type: 'sa'; question: string; model_answer: string; };
type EssayQuestion = { type: 'essay'; question: string; key_points: string; };
type Question     = MCQuestion | TFQuestion | SAQuestion | EssayQuestion;
type PastExam     = { id: string; title: string; questions: Question[]; responses: Record<string, string>; score: number | null; status: string; created_at: string; completed_at: string | null; timer_seconds: number | null; folder_id?: string | null; folder_name?: string; class_name?: string; };
type LibResource  = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder    = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass     = { id: string; name: string; folders: LibFolder[]; };

const color  = '#7B6FA0';
const light  = '#EDE9F7';

function MatthewPracticeExamInner() {
  const searchParams = useSearchParams();
  const folderId   = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');

  const [screen,        setScreen]        = useState<'history' | 'setup' | 'exam' | 'results'>('history');
  const [pastExams,     setPastExams]     = useState<PastExam[]>([]);
  const [histLoading,   setHistLoading]   = useState(true);
  const [activeExam,    setActiveExam]    = useState<PastExam | null>(null);

  // Setup
  const [topic,              setTopic]              = useState('');
  const [questionTypes,      setQuestionTypes]      = useState<Set<string>>(new Set(['mc']));
  const [countMode,          setCountMode]          = useState<'preset' | 'auto' | 'custom'>('preset');
  const [count,              setCount]              = useState(20);
  const [customCount,        setCustomCount]        = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [timerEnabled,       setTimerEnabled]       = useState(false);
  const [timerMinutes,       setTimerMinutes]       = useState(30);
  const [examNameInput,      setExamNameInput]      = useState('');
  const [renamingId,         setRenamingId]         = useState<string | null>(null);
  const [renameValue,        setRenameValue]        = useState('');
  const [scheduleReview,     setScheduleReview]     = useState(false);
  const [reviewScheduled,    setReviewScheduled]    = useState(false);

  // Library
  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const [fileInputRef,    setFileInputRef]     = useState<HTMLInputElement | null>(null);

  // Exam
  const [questions,       setQuestions]       = useState<Question[]>([]);
  const [responses,       setResponses]       = useState<Record<number, string>>({});
  const [reviewed,        setReviewed]        = useState<Set<number>>(new Set());
  const [showExplanation, setShowExplanation] = useState<Set<number>>(new Set());
  const [examId,          setExamId]          = useState<string | null>(null);
  const [examTitle,       setExamTitle]       = useState('');
  const [generating,      setGenerating]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveFlash,       setSaveFlash]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  // Timer
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory();
    loadLibrary();
    if (folderId) { setScreen('setup'); if (folderName) setTopic(folderName); }
  }, []);

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerRunning && timeLeft === 0) {
      setTimerRunning(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerRunning, timeLeft]);

  const loadHistory = async () => {
    setHistLoading(true);
    const { data } = await supabase.from('practice_exams').select('*').eq('student_id', 'matthew').order('created_at', { ascending: false });
    if (data) {
      const folderIds = data.map(e => e.folder_id).filter(Boolean);
      let folderMap: Record<string, { name: string; class_id: string }> = {};
      let classMap: Record<string, string> = {};
      if (folderIds.length > 0) {
        const { data: folders } = await supabase.from('exam_folders').select('id, name, class_id').in('id', folderIds);
        if (folders) {
          folders.forEach(f => { folderMap[f.id] = { name: f.name, class_id: f.class_id }; });
          const classIds = folders.map(f => f.class_id);
          const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds);
          if (classes) classes.forEach(c => { classMap[c.id] = c.name; });
        }
      }
      setPastExams(data.map(e => ({
        ...e,
        folder_name: e.folder_id ? folderMap[e.folder_id]?.name : undefined,
        class_name:  e.folder_id ? classMap[folderMap[e.folder_id]?.class_id] : undefined,
      })));
    }
    setHistLoading(false);
  };

  const loadLibrary = async () => {
    setLibLoading(true);
    const { data: classData } = await supabase.from('classes').select('id, name').eq('student_id', 'matthew').eq('is_active', true).order('created_at', { ascending: true });
    if (!classData || classData.length === 0) { setLibLoading(false); return; }
    const classIds = classData.map(c => c.id);
    const { data: folderData } = await supabase.from('exam_folders').select('id, name, class_id').in('class_id', classIds).order('exam_date', { ascending: true });
    const folderIds = (folderData || []).map(f => f.id);
    let resourceData: any[] = [];
    if (folderIds.length > 0) {
      const { data } = await supabase.from('resources').select('id, file_name, file_type, storage_url, folder_id').in('folder_id', folderIds).eq('file_type', 'pdf').not('storage_url', 'is', null);
      resourceData = data || [];
    }
    const rByFolder: Record<string, LibResource[]> = {};
    resourceData.forEach(r => { if (!rByFolder[r.folder_id]) rByFolder[r.folder_id] = []; rByFolder[r.folder_id].push(r); });
    const fByClass: Record<string, LibFolder[]> = {};
    (folderData || []).forEach(f => { if (!fByClass[f.class_id]) fByClass[f.class_id] = []; fByClass[f.class_id].push({ ...f, resources: rByFolder[f.id] || [] }); });
    const lib = classData.map(c => ({ ...c, folders: (fByClass[c.id] || []).filter(f => f.resources.length > 0) })).filter(c => c.folders.length > 0);
    setLibrary(lib);
    if (folderId) {
      const folder = (folderData || []).find(f => f.id === folderId);
      if (folder) { setExpandedClasses(new Set([folder.class_id])); setExpandedFolders(new Set([folderId])); setSelectedIds(new Set((rByFolder[folderId] || []).map(r => r.id))); }
    }
    setLibLoading(false);
  };

  const toggleType     = (t: string) => setQuestionTypes(prev => { const n = new Set(prev); if (n.has(t) && n.size === 1) return n; n.has(t) ? n.delete(t) : n.add(t); return n; });
  const toggleResource = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFolder   = (folder: LibFolder) => { const ids = folder.resources.map(r => r.id); const allSel = ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const toggleClass    = (cls: LibClass) => { const ids = cls.folders.flatMap(f => f.resources.map(r => r.id)); const allSel = ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const handleNewFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const sel = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf'); setNewFiles(prev => [...prev, ...sel]); e.target.value = ''; };

  const totalSelected = selectedIds.size + newFiles.length;
  const canGenerate   = totalSelected > 0 || topic.trim().length > 0;
  const actualCount   = countMode === 'auto' ? 'auto' : countMode === 'custom' ? (parseInt(customCount) || 20) : count;

  const buildPrompt = (fileCount: number) => {
    const typeList = Array.from(questionTypes);
    const typeDescriptions = typeList.map(t => t === 'mc' ? 'Multiple Choice (4 options A/B/C/D)' : t === 'tf' ? 'True/False' : t === 'sa' ? 'Short Answer' : 'Essay').join(', ');
    const countStr = countMode === 'auto' ? 'an appropriate number of' : `exactly ${actualCount}`;
    const crossDoc = fileCount > 1 ? `Perform CROSS-DOCUMENT ANALYSIS — identify the most important recurring concepts across all ${fileCount} documents and weight questions toward those high-yield topics. ` : '';
    const custom   = customInstructions.trim() ? ` Additional instructions: ${customInstructions.trim()}.` : '';
    const formats  = typeList.map(t => {
      if (t === 'mc')    return `MC: {"type":"mc","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"Why this is correct and why others are wrong..."}`;
      if (t === 'tf')    return `TF: {"type":"tf","question":"...","answer":"True","explanation":"Why this statement is true/false..."}`;
      if (t === 'sa')    return `SA: {"type":"sa","question":"...","model_answer":"Key points a strong short answer should include: ..."}`;
      if (t === 'essay') return `Essay: {"type":"essay","question":"...","key_points":"Key points a strong essay response should address: 1)... 2)... 3)..."}`;
      return '';
    }).join('\n');
    return `You are Ascend generating a practice exam for Matthew, a pre-dental high school junior.${topic.trim() ? ` Topic: ${topic.trim()}.` : ''} ${crossDoc}Generate ${countStr} questions of these types: ${typeDescriptions}. ${typeList.length > 1 ? 'Distribute evenly across all types.' : ''} Make questions challenging and exam-realistic.${custom}\n\nReturn ONLY a JSON array, no markdown, no backticks. Use these exact formats:\n${formats}`;
  };

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true); setError('');
    try {
      const allResources = library.flatMap(c => c.folders.flatMap(f => f.resources));
      const selResources = allResources.filter(r => selectedIds.has(r.id));
      const fetchedFiles: File[] = [];
      for (const r of selResources) {
        if (!r.storage_url) continue;
        try { const res = await fetch(r.storage_url); const blob = await res.blob(); fetchedFiles.push(new File([blob], r.file_name + '.pdf', { type: 'application/pdf' })); } catch {}
      }
      const allFiles = [...fetchedFiles, ...newFiles];
      const prompt   = buildPrompt(allFiles.length);
      let raw = '';
      if (allFiles.length > 0) {
        const fd = new FormData(); allFiles.forEach(f => fd.append('files', f)); fd.append('student', 'matthew'); fd.append('prompt', prompt); fd.append('type', 'exam');
        const res = await fetch('/api/generate-study-guide', { method: 'POST', body: fd });
        const d = await res.json(); raw = (d.studyGuide || d.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        const res = await fetch('/api/generate-study-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, student: 'matthew', type: 'exam' }) });
        const d = await res.json(); raw = (d.studyGuide || d.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      }
      const parsed: Question[] = JSON.parse(raw);
      const title = examNameInput.trim() || topic.trim() || folderName || `Practice Exam — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      const { data: examData } = await supabase.from('practice_exams').insert({ student_id: 'matthew', title, questions: parsed, responses: {}, status: 'in_progress', timer_seconds: timerEnabled ? timerMinutes * 60 : null, folder_id: folderId || null }).select().single();
      if (examData) { setExamId(examData.id); setActiveExam(examData); }
      setExamTitle(title); setQuestions(parsed); setResponses({}); setReviewed(new Set()); setShowExplanation(new Set());
      if (timerEnabled) { setTimeLeft(timerMinutes * 60); setTimerRunning(true); }
      setScreen('exam');
    } catch { setError('Could not generate exam. Please try again.'); }
    finally { setGenerating(false); }
  };

  const saveProgress = async () => {
    if (!examId) return;
    setSaving(true);
    await supabase.from('practice_exams').update({ responses: Object.fromEntries(Object.entries(responses)) }).eq('id', examId);
    setSaving(false); setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1500);
  };

  const submitExam = async () => {
    if (!examId) return;
    setSubmitting(true); setTimerRunning(false);
    let correct = 0; let objTotal = 0;
    questions.forEach((q, i) => { if (q.type === 'mc' || q.type === 'tf') { objTotal++; if ((responses[i] || '') === q.answer) correct++; } });
    const scoreVal = objTotal > 0 ? Math.round((correct / objTotal) * 100) : null;
    await supabase.from('practice_exams').update({ responses: Object.fromEntries(Object.entries(responses)), score: scoreVal, status: 'completed', completed_at: new Date().toISOString() }).eq('id', examId);
    setSubmitting(false); setScreen('results'); loadHistory();
  };

  const openExam = (exam: PastExam) => {
    setActiveExam(exam); setExamId(exam.id); setExamTitle(exam.title);
    setQuestions(exam.questions);
    const resp: Record<number, string> = {};
    Object.entries(exam.responses || {}).forEach(([k, v]) => { resp[parseInt(k)] = v; });
    setResponses(resp); setReviewed(new Set()); setShowExplanation(new Set());
    if (exam.status === 'completed') { setScreen('results'); }
    else { if (exam.timer_seconds) { setTimeLeft(exam.timer_seconds); setTimerRunning(true); } setScreen('exam'); }
  };

  const retakeExam = async () => {
    if (!examId) return;
    await supabase.from('practice_exams').update({ responses: {}, score: null, status: 'in_progress', completed_at: null }).eq('id', examId);
    setResponses({}); setReviewed(new Set()); setShowExplanation(new Set());
    if (activeExam?.timer_seconds) { setTimeLeft(activeExam.timer_seconds); setTimerRunning(true); }
    setScreen('exam');
  };

  const deleteExam = async (id: string) => {
    await supabase.from('practice_exams').delete().eq('id', id);
    setPastExams(prev => prev.filter(e => e.id !== id));
  };

  const objQuestions  = questions.filter(q => q.type === 'mc' || q.type === 'tf');
  const correctCount  = objQuestions.filter((q, _) => { const i = questions.indexOf(q); return (responses[i] || '') === q.answer; }).length;
  const displayScore  = objQuestions.length > 0 ? Math.round((correctCount / objQuestions.length) * 100) : null;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {/* ── HISTORY SCREEN ── */}
      {screen === 'history' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>Practice Exams</div>
            </div>
            <button onClick={() => setScreen('setup')} style={{ padding: '10px 18px', borderRadius: 999, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ New Exam</button>
          </div>
          {histLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
          ) : pastExams.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconExam c={color} size={36} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 8 }}>No practice exams yet</div>
              <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24 }}>Generate a practice exam from your uploaded materials.</div>
              <button onClick={() => setScreen('setup')} style={{ padding: '12px 24px', borderRadius: 999, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate First Exam</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {pastExams.map(exam => (
                <div key={exam.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === exam.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter') { await supabase.from('practice_exams').update({ title: renameValue.trim() }).eq('id', exam.id); setPastExams(prev => prev.map(ex => ex.id === exam.id ? { ...ex, title: renameValue.trim() } : ex)); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }} autoFocus style={{ width: '100%', padding: '4px 8px', border: `1.5px solid ${color}`, borderRadius: 7, fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={async () => { await supabase.from('practice_exams').update({ title: renameValue.trim() }).eq('id', exam.id); setPastExams(prev => prev.map(ex => ex.id === exam.id ? { ...ex, title: renameValue.trim() } : ex)); setRenamingId(null); }} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: 'white', background: color, border: 'none', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Save</button>
                            <button onClick={() => setRenamingId(null)} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#9E9BB0', background: '#F3F1EC', border: 'none', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>{exam.title}</div>
                      )}
                      {(exam.class_name || exam.folder_name) && (
                        <div style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 7px', borderRadius: 999, display: 'inline-block', marginBottom: 4 }}>
                          {exam.class_name}{exam.folder_name ? ` · ${exam.folder_name}` : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: exam.status === 'completed' ? '#5FAD8E' : color, background: exam.status === 'completed' ? '#EDF7F2' : light, padding: '2px 6px', borderRadius: 999 }}>{exam.status === 'completed' ? 'Done' : 'In Progress'}</span>
                        {exam.score !== null && <span style={{ fontSize: 10, fontWeight: 700, color: exam.score >= 80 ? '#5FAD8E' : exam.score >= 60 ? '#C8965A' : '#C47878' }}>{exam.score}%</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#9E9BB0' }}>{formatDate(exam.created_at)} · {exam.questions?.length || 0}q</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setRenamingId(exam.id); setRenameValue(exam.title); }} style={{ color: '#9E9BB0', background: '#F3F1EC', border: 'none', borderRadius: 6, padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 28 28" fill="none"><path d="M4 24l4-1 13-13-3-3L5 20l-1 4z" stroke="#9E9BB0" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M18 8l3 3" stroke="#9E9BB0" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                      <button onClick={() => { if (confirm('Delete this exam?')) deleteExam(exam.id); }} style={{ color: '#C47878', background: '#FDF2F2', border: 'none', borderRadius: 6, padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 28 28" fill="none"><path d="M6 6l16 16M22 6L6 22" stroke="#C47878" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                  <button onClick={() => openExam(exam)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{exam.status === 'completed' ? 'View Results' : 'Continue'}</button>
                  {exam.status === 'completed' && (
                    <button onClick={() => { setActiveExam(exam); setExamId(exam.id); setExamTitle(exam.title); setQuestions(exam.questions); const resp: Record<number, string> = {}; Object.entries(exam.responses || {}).forEach(([k, v]) => { resp[parseInt(k)] = v as string; }); setResponses(resp); setReviewed(new Set()); setShowExplanation(new Set()); retakeExam(); }} style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear & Retake</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── SETUP SCREEN ── */}
      {screen === 'setup' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <button onClick={() => setScreen('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Exams</button>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>New Practice Exam</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Select materials, choose question types, and generate a realistic exam.</div>
          </div>

          {/* Exam Name */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Exam Name (optional)</label>
            <input value={examNameInput} onChange={e => setExamNameInput(e.target.value)} placeholder='e.g. "Chem 115 Exam 1 Practice"' style={{ ...inputStyle }} />
          </div>

          {/* Question Types */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 12 }}>Question Types</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['mc', 'Multiple Choice'], ['tf', 'True / False'], ['sa', 'Short Answer'], ['essay', 'Essay']].map(([key, label]) => {
                const active = questionTypes.has(key);
                return <button key={key} onClick={() => toggleType(key)} style={{ padding: '8px 16px', borderRadius: 999, border: `1.5px solid ${active ? color : '#E8E5F0'}`, background: active ? color : '#FAFAF8', color: active ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{label}</button>;
              })}
            </div>
            <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 10 }}>Select one or more. Questions will be distributed evenly across types.</div>
          </div>

          {/* Resource Library */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Select Resources</div>
                <div style={{ fontSize: 11, color: '#9E9BB0' }}>{totalSelected > 0 ? `${totalSelected} file${totalSelected !== 1 ? 's' : ''} selected` : 'Pick from your uploaded library'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {totalSelected > 0 && <button onClick={() => { setSelectedIds(new Set()); setNewFiles([]); }} style={{ padding: '6px 10px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear</button>}
                <input type="file" accept=".pdf" multiple ref={el => setFileInputRef(el)} onChange={handleNewFileInput} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef?.click()} style={{ padding: '6px 12px', borderRadius: 999, background: light, border: 'none', color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Upload</button>
              </div>
            </div>
            {newFiles.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {newFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: light, marginBottom: 4 }}>
                    <IconFile c={color} size={14} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <button onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ fontSize: 11, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {libLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9E9BB0', fontSize: 12 }}>Loading library...</div>
            ) : library.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #E8E5F0', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconEmptyFolder size={32} /></div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>No uploaded PDFs yet — upload files to your class folders first.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {library.map(cls => {
                  const clsIds = cls.folders.flatMap(f => f.resources.map(r => r.id));
                  const clsAllSel = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                  const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                  const clsExp = expandedClasses.has(cls.id);
                  return (
                    <div key={cls.id} style={{ border: '1.5px solid #E8E5F0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#FAFAF8', cursor: 'pointer' }} onClick={() => setExpandedClasses(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })}>
                        <span style={{ fontSize: 10, color: '#9E9BB0', width: 10 }}>{clsExp ? '▾' : '▸'}</span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>{cls.name}</span>
                        <button onClick={e => { e.stopPropagation(); toggleClass(cls); }} style={{ fontSize: 10, fontWeight: 700, color: clsAllSel || clsSomeSel ? color : '#9E9BB0', background: clsAllSel || clsSomeSel ? light : '#F3F1EC', border: 'none', borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{clsAllSel ? 'Deselect' : 'Select all'}</button>
                      </div>
                      {clsExp && (
                        <div style={{ padding: '0 12px 8px' }}>
                          {cls.folders.map(folder => {
                            const fIds = folder.resources.map(r => r.id);
                            const fAllSel = fIds.length > 0 && fIds.every(id => selectedIds.has(id));
                            const fSomeSel = fIds.some(id => selectedIds.has(id));
                            const fExp = expandedFolders.has(folder.id);
                            return (
                              <div key={folder.id} style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: '#F3F1EC', cursor: 'pointer', marginBottom: 3 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                  <span style={{ fontSize: 9, color: '#9E9BB0', width: 8 }}>{fExp ? '▾' : '▸'}</span>
                                  <IconFolder c="#9E9BB0" size={12} />
                                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1D1B26', marginLeft: 2 }}>{folder.name}</span>
                                  <span style={{ fontSize: 9, color: '#9E9BB0' }}>{folder.resources.length} PDF{folder.resources.length !== 1 ? 's' : ''}</span>
                                  <button onClick={e => { e.stopPropagation(); toggleFolder(folder); }} style={{ fontSize: 9, fontWeight: 700, color: fAllSel || fSomeSel ? color : '#9E9BB0', background: fAllSel || fSomeSel ? light : '#FFFFFF', border: `1px solid ${fAllSel || fSomeSel ? color : '#E8E5F0'}`, borderRadius: 999, padding: '2px 7px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{fAllSel ? 'Deselect' : 'Select all'}</button>
                                </div>
                                {fExp && (
                                  <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {folder.resources.map(r => {
                                      const isSel = selectedIds.has(r.id);
                                      return (
                                        <div key={r.id} onClick={() => toggleResource(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${isSel ? color : '#E8E5F0'}`, background: isSel ? light : '#FFFFFF', cursor: 'pointer' }}>
                                          <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSel ? color : '#C4C1D4'}`, background: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSel && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}</div>
                                          <IconFile c={isSel ? color : '#9E9BB0'} size={12} />
                                          <span style={{ fontSize: 11, fontWeight: isSel ? 700 : 400, color: isSel ? color : '#1D1B26', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 2 }}>{r.file_name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {totalSelected > 0 && (
              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconStack c="rgba(255,255,255,0.8)" size={14} />
                {totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — Ascend will cross-reference all materials' : ''}
              </div>
            )}
          </div>

          {/* Topic + Instructions */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>{totalSelected > 0 ? 'Refine Focus (optional)' : 'Subject / Topic'}</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && canGenerate && !generating) generate(); }} placeholder={totalSelected > 0 ? 'e.g. "Focus on enzyme kinetics"' : 'e.g. AP Biology - Cellular Respiration'} style={{ ...inputStyle, marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Custom Instructions (optional)</label>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Weight toward mechanisms" or "Include calculation questions"' rows={2} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Number of Questions</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => { setCountMode('preset'); setCount(n); }} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${countMode === 'preset' && count === n ? color : '#E8E5F0'}`, background: countMode === 'preset' && count === n ? color : '#FAFAF8', color: countMode === 'preset' && count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
              <button onClick={() => setCountMode('auto')} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${countMode === 'auto' ? color : '#E8E5F0'}`, background: countMode === 'auto' ? color : '#FAFAF8', color: countMode === 'auto' ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Auto</button>
              <button onClick={() => setCountMode('custom')} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${countMode === 'custom' ? color : '#E8E5F0'}`, background: countMode === 'custom' ? color : '#FAFAF8', color: countMode === 'custom' ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Custom</button>
            </div>
            {countMode === 'auto' && <div style={{ fontSize: 11, color: '#9E9BB0' }}>Ascend will determine the ideal number based on your material.</div>}
            {countMode === 'custom' && <input type="number" value={customCount} onChange={e => setCustomCount(e.target.value)} placeholder="e.g. 100" style={{ ...inputStyle, width: 120, marginTop: 6 }} />}
          </div>

          {/* Timer */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconTimer c={color} size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Timer (optional)</div>
              {timerEnabled && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {[15, 20, 30, 45, 60, 90].map(m => (
                    <button key={m} onClick={() => setTimerMinutes(m)} style={{ padding: '4px 10px', borderRadius: 999, border: `1.5px solid ${timerMinutes === m ? color : '#E8E5F0'}`, background: timerMinutes === m ? color : '#FAFAF8', color: timerMinutes === m ? 'white' : '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{m}m</button>
                  ))}
                </div>
              )}
            </div>
            <div onClick={() => setTimerEnabled(t => !t)} style={{ width: 36, height: 20, borderRadius: 999, background: timerEnabled ? color : '#E8E5F0', transition: 'background 0.2s', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: timerEnabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}

          {generating ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Analyzing ${totalSelected} documents...` : 'Generating your exam...'}</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: canGenerate ? 1 : 0.4 }}>
              {canGenerate ? `Generate ${countMode === 'auto' ? 'Auto' : actualCount}-Question Exam` : 'Select resources or enter a topic'}
            </button>
          )}
        </main>
      )}

      {/* ── EXAM SCREEN ── */}
      {screen === 'exam' && questions.length > 0 && (
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 120px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 2 }}>{questions.length} Questions</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.4px' }}>{examTitle}</div>
            </div>
            {timerEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: timeLeft < 300 ? '#FDF2F2' : light, border: `1.5px solid ${timeLeft < 300 ? '#C47878' : color}40`, borderRadius: 10, padding: '8px 14px' }}>
                <IconTimer c={timeLeft < 300 ? '#C47878' : color} size={14} />
                <span style={{ fontSize: 14, fontWeight: 800, color: timeLeft < 300 ? '#C47878' : color, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* All questions scrollable */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '22px 24px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: responses[i] ? color : '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: responses[i] ? 'white' : '#9E9BB0' }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C4C1D4' }}>
                    {q.type === 'mc' ? 'Multiple Choice' : q.type === 'tf' ? 'True / False' : q.type === 'sa' ? 'Short Answer' : 'Essay'}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, color: '#1D1B26', marginBottom: 16 }}>{q.question}</div>

                {/* MC options */}
                {q.type === 'mc' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries((q as MCQuestion).options).map(([letter, text]) => {
                      const selected = responses[i] === letter;
                      return (
                        <div key={letter} onClick={() => setResponses(r => ({ ...r, [i]: letter }))} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${selected ? color : '#E8E5F0'}`, background: selected ? light : '#FAFAF8', cursor: 'pointer' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected ? color : '#C4C1D4'}`, background: selected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            {selected && <span style={{ color: 'white', fontSize: 10, fontWeight: 800 }}>{letter}</span>}
                            {!selected && <span style={{ color: '#9E9BB0', fontSize: 10, fontWeight: 700 }}>{letter}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? color : '#1D1B26', lineHeight: 1.5 }}>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* T/F */}
                {q.type === 'tf' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['True', 'False'].map(opt => {
                      const selected = responses[i] === opt;
                      return (
                        <button key={opt} onClick={() => setResponses(r => ({ ...r, [i]: opt }))} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${selected ? color : '#E8E5F0'}`, background: selected ? color : '#FAFAF8', color: selected ? 'white' : '#6B6880', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{opt}</button>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {q.type === 'sa' && (
                  <textarea value={responses[i] || ''} onChange={e => setResponses(r => ({ ...r, [i]: e.target.value }))} placeholder="Write your answer here..." rows={4} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 12, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
                )}

                {/* Essay */}
                {q.type === 'essay' && (
                  <textarea value={responses[i] || ''} onChange={e => setResponses(r => ({ ...r, [i]: e.target.value }))} placeholder="Write your essay response here..." rows={8} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 12, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div style={{ marginTop: 24, background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 14, textAlign: 'center' }}>
              {Object.keys(responses).length} of {questions.length} questions answered
            </div>
            <button onClick={submitExam} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>

          {/* Floating save button */}
          <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 150 }}>
            <button onClick={saveProgress} disabled={saving} style={{ padding: '10px 16px', borderRadius: 999, background: saveFlash ? '#5FAD8E' : 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', boxShadow: '0 4px 16px rgba(29,27,38,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saveFlash ? '✅ Saved' : saving ? 'Saving...' : '💾 Save Progress'}
            </button>
          </div>
        </main>
      )}

      {/* ── RESULTS SCREEN ── */}
      {screen === 'results' && questions.length > 0 && (
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 100px' }}>
          {/* Score summary */}
          <div style={{ background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', borderRadius: 20, padding: '28px 24px', marginBottom: 24, color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>{examTitle}</div>
            {displayScore !== null ? (
              <>
                <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 4 }}>{displayScore}%</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{correctCount} correct · {objQuestions.length - correctCount} incorrect · {objQuestions.length} objective questions</div>
                {questions.filter(q => q.type === 'sa' || q.type === 'essay').length > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{questions.filter(q => q.type === 'sa' || q.type === 'essay').length} open-ended questions — review below</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Exam Complete</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>Review your responses below</div>
              </>
            )}
          </div>

          {/* Retake options */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button onClick={retakeExam} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear & Retake</button>
            <button onClick={() => setScreen('history')} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>My Exams</button>
          </div>

          {/* Answer key */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>Answer Key</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questions.map((q, i) => {
              const userResp = responses[i] || '';
              const isReviewed = reviewed.has(i);
              const showExp = showExplanation.has(i);
              let isCorrect: boolean | null = null;
              if (q.type === 'mc' || q.type === 'tf') isCorrect = userResp === q.answer;
              return (
                <div key={i} style={{ background: '#FFFFFF', border: `1.5px solid ${isCorrect === true ? '#5FAD8E40' : isCorrect === false ? '#C47878' + '40' : '#E8E5F0'}`, borderRadius: 18, padding: '20px 22px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: isCorrect === true ? '#EDF7F2' : isCorrect === false ? '#FDF2F2' : '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: isCorrect === true ? '#5FAD8E' : isCorrect === false ? '#C47878' : '#9E9BB0' }}>
                        {isCorrect === true ? '✓' : isCorrect === false ? '✗' : i + 1}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#C4C1D4' }}>
                      {q.type === 'mc' ? 'Multiple Choice' : q.type === 'tf' ? 'True / False' : q.type === 'sa' ? 'Short Answer' : 'Essay'}
                    </span>
                    <div style={{ marginLeft: 'auto' }}>
                      <div onClick={() => setReviewed(r => { const n = new Set(r); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isReviewed ? color : '#C4C1D4'}`, background: isReviewed ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isReviewed && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isReviewed ? color : '#9E9BB0' }}>Reviewed</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, color: '#1D1B26', marginBottom: 14 }}>{q.question}</div>

                  {/* User response */}
                  {userResp && (
                    <div style={{ background: '#F3F1EC', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 4 }}>Your Answer</div>
                      <div style={{ fontSize: 13, color: '#1D1B26', lineHeight: 1.5 }}>{userResp}</div>
                    </div>
                  )}
                  {!userResp && (
                    <div style={{ background: '#F3F1EC', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#C4C1D4', fontStyle: 'italic' }}>No answer provided</div>
                    </div>
                  )}

                  {/* Correct answer for MC/TF */}
                  {(q.type === 'mc' || q.type === 'tf') && (
                    <div style={{ background: '#EDF7F2', border: '1.5px solid #5FAD8E40', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#5FAD8E', marginBottom: 4 }}>Correct Answer</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>
                        {q.type === 'mc' 
  ? `${q.answer} — ${((q as MCQuestion).options as any)[q.answer]}` 
  : q.answer
}
                      </div>
                    </div>
                  )}

                  {/* Show explanation toggle for MC/TF */}
                  {(q.type === 'mc' || q.type === 'tf') && (
                    <div>
                      <button onClick={() => setShowExplanation(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ fontSize: 12, fontWeight: 700, color: color, background: light, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', marginBottom: showExp ? 10 : 0 }}>
                        {showExp ? 'Hide Explanation' : 'Show Explanation'}
                      </button>
                      {showExp && (
                        <div style={{ background: light, border: `1.5px solid ${color}30`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, color: '#5A5078', lineHeight: 1.6 }}>{(q as MCQuestion | TFQuestion).explanation}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model answer for SA/Essay */}
                  {(q.type === 'sa' || q.type === 'essay') && (
                    <div style={{ background: light, border: `1.5px solid ${color}30`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color, marginBottom: 6 }}>
                        {q.type === 'sa' ? 'Model Answer' : 'Key Points'}
                      </div>
                      <div style={{ fontSize: 13, color: '#5A5078', lineHeight: 1.6 }}>
                        {q.type === 'sa' ? (q as SAQuestion).model_answer : (q as EssayQuestion).key_points}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Review schedule */}
          {!reviewScheduled && (
            <div style={{ background: light, borderRadius: 14, padding: '16px', marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10 }}>Add to review schedule?</div>
              <div onClick={() => setScheduleReview(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: scheduleReview ? 12 : 0 }}>
                <div style={{ width: 36, height: 20, borderRadius: 999, background: scheduleReview ? color : '#E8E5F0', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: scheduleReview ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: scheduleReview ? color : '#9E9BB0' }}>Review this exam (Day +1, +3, +7)</span>
              </div>
              {scheduleReview && (
                <button onClick={async () => {
                  const today = new Date();
                  const tasks = [1, 3, 7].map(d => { const due = new Date(today); due.setDate(today.getDate() + d); return { student_id: 'matthew', title: `Review: ${examTitle}`, due_date: due.toISOString().split('T')[0], task_type: 'review', completed: false }; });
                  await supabase.from('tasks').insert(tasks);
                  setReviewScheduled(true);
                }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Confirm Schedule</button>
              )}
            </div>
          )}
          {reviewScheduled && (
            <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '10px 16px', marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E' }}>✅ Review sessions added to your calendar</div>
            </div>
          )}

          {/* Bottom retake */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={retakeExam} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear & Retake</button>
            <button onClick={() => setScreen('history')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>My Exams</button>
          </div>
        </main>
      )}

      <TabBar student="matthew" />
    </div>
  );
}

export default function MatthewPracticeExam() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <MatthewPracticeExamInner />
    </Suspense>
  );
}