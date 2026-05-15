'use client';
import Link from 'next/link';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
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

function IconFolder({ c, size = 16 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconFile({ c, size = 16 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEmptyFolder({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path d="M4 11a2 2 0 012-2h6l3 3h14a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" stroke="#C4C1D4" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <line x1="12" y1="20" x2="24" y2="20" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="12" y1="24" x2="19" y2="24" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconPrint({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="6" y="3" width="16" height="8" rx="1" stroke={c} strokeWidth="1.5" fill="none"/>
      <path d="M6 11H4a2 2 0 00-2 2v7a2 2 0 002 2h2v-4h16v4h2a2 2 0 002-2v-7a2 2 0 00-2-2H6z" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="6" y="18" width="16" height="7" rx="1" stroke={c} strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function IconShare({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 4v14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M9 9l5-5 5 5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 16v6a2 2 0 002 2h14a2 2 0 002-2v-6" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconCopy({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="9" y="9" width="15" height="16" rx="2" stroke={c} strokeWidth="1.5" fill="none"/>
      <path d="M5 19V6a2 2 0 012-2h13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconDownload({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 4v14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M9 13l5 5 5-5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 22h20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconStack({ c, size = 16 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="14" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="6" y="9"  width="16" height="8"  rx="2" stroke={c} strokeWidth="1.4" fill="none" opacity="0.6"/>
      <rect x="8" y="4"  width="12" height="8"  rx="2" stroke={c} strokeWidth="1.3" fill="none" opacity="0.35"/>
    </svg>
  );
}

const LEVELS = [
  { id: 'outline',  label: 'Outline',  desc: 'Headers and bullets only. Quick overview.' },
  { id: 'basic',    label: 'Basic',    desc: 'Short explanations. Good for review.' },
  { id: 'detailed', label: 'Detailed', desc: 'Full explanations with examples.' },
  { id: 'mastery',  label: 'Mastery',  desc: 'Deep dive. For thorough understanding.' },
];

const QUESTION_FORMATS = ['Multiple Choice', 'Short Answer', 'Both'];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

type LibResource = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder   = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass    = { id: string; name: string; folders: LibFolder[]; };

const color = '#7B6FA0';
const light = '#EDE9F7';

function MatthewStudyInner() {
  const searchParams = useSearchParams();
  const folderId   = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');
  const guideId    = searchParams.get('guideId');

  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [level,              setLevel]              = useState('detailed');
  const [customInstructions, setCustomInstructions] = useState('');
  const [addQuestions,       setAddQuestions]       = useState(false);
  const [questionFormat,     setQuestionFormat]     = useState('Multiple Choice');
  const [showAnswers,        setShowAnswers]        = useState(true);
  const [loading,            setLoading]            = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [studyGuide,         setStudyGuide]         = useState('');
  const [error,              setError]              = useState('');
  const [guideName,          setGuideName]          = useState('');
  const [showNamePrompt,     setShowNamePrompt]     = useState(false);
  const [saved,              setSaved]              = useState(false);
  const [copied,             setCopied]             = useState(false);
  const [sourceFiles,        setSourceFiles]        = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guideId) {
      const loadExisting = async () => {
        setLoading(true);
        const { data } = await supabase.from('study_guides').select('title, content, source_filename').eq('id', guideId).single();
        if (data) {
          setStudyGuide(data.content);
          setGuideName(data.title);
          setSourceFiles(data.source_filename ? data.source_filename.split(', ') : []);
          setSaved(true);
          setShowNamePrompt(false);
        }
        setLoading(false);
      };
      loadExisting();
      return;
    }
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
        if (folder) {
          setExpandedClasses(new Set([folder.class_id]));
          setExpandedFolders(new Set([folderId]));
          setSelectedIds(new Set((rByFolder[folderId] || []).map(r => r.id)));
          if (folderName) setGuideName(folderName + ' — Study Guide');
        }
      }
      setLibLoading(false);
    };
    loadLibrary();
  }, [folderId, folderName, guideId]);

  const toggleResource = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFolder   = (folder: LibFolder) => { const ids = folder.resources.map(r => r.id); const allSel = ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const toggleClass    = (cls: LibClass)    => { const ids = cls.folders.flatMap(f => f.resources.map(r => r.id)); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const handleNewFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf'); setNewFiles(prev => [...prev, ...selected]); e.target.value = ''; };

  const buildPrompt = (fileCount: number) => {
    const levelPrompts: Record<string, string> = {
      outline:  'Generate a clean outline with headers and bullet points only. No prose.',
      basic:    'Generate a basic study guide with concise explanations.',
      detailed: 'Generate a detailed study guide with full explanations and examples.',
      mastery:  'Generate a comprehensive mastery-level guide with deep explanations across all materials.',
    };
    const base = fileCount > 1
      ? `You are Ascend analyzing ${fileCount} study documents for Matthew, a pre-dental high school junior taking AP Physics 2, AP Biology, and AP Chemistry. Perform CROSS-DOCUMENT ANALYSIS: identify concepts recurring across multiple documents, find overlapping themes, and focus your output on these high-frequency areas. ${level ? levelPrompts[level] : ''}`
      : `You are Ascend, an AI study assistant for Matthew, a pre-dental high school junior. Be precise and thorough. ${level ? levelPrompts[level] : 'Generate a study guide based on the instructions below.'}`;
    const q = addQuestions ? `\n\nAdd a "Practice Questions" section with ${questionFormat === 'Both' ? 'mixed multiple choice and short answer' : questionFormat.toLowerCase()} questions.${showAnswers ? ' Include answers and explanations.' : ' Do not include answers.'}` : '';
    const c = customInstructions.trim() ? `\n\nAdditional instructions: ${customInstructions.trim()}` : '';
    return base + c + q + '\n\nFormat with clear markdown headers and structure.';
  };

  const handleGenerate = async () => {
    const totalCount = selectedIds.size + newFiles.length;
    if (totalCount === 0 && !customInstructions.trim()) return;
    setLoading(true); setError('');
    try {
      const allResources = library.flatMap(c => c.folders.flatMap(f => f.resources));
      const selectedResources = allResources.filter(r => selectedIds.has(r.id));
      const fetchedFiles: File[] = [];
      for (const r of selectedResources) {
        if (!r.storage_url) continue;
        try { const res = await fetch(r.storage_url); const blob = await res.blob(); fetchedFiles.push(new File([blob], r.file_name + '.pdf', { type: 'application/pdf' })); } catch { /* skip */ }
      }
      const allFiles = [...fetchedFiles, ...newFiles];
      const formData = new FormData();
      allFiles.forEach(f => formData.append('files', f));
      formData.append('student', 'matthew');
      formData.append('prompt', buildPrompt(allFiles.length));
      const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyGuide(data.studyGuide);
      setSourceFiles(allFiles.map(f => f.name));
      if (!guideName) setGuideName(allFiles.length > 0 ? allFiles[0].name.replace('.pdf', '') : 'Study Guide');
      setShowNamePrompt(true); setSaved(false);
    } catch { setError('Could not generate study guide. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!guideName.trim()) return;
    setSaving(true);
    try {
      await supabase.from('study_guides').insert({ student_id: 'matthew', title: guideName.trim(), content: studyGuide, source_filename: sourceFiles.join(', ') || 'Custom', folder_id: folderId || null });
      const today = new Date();
      await supabase.from('tasks').insert([1, 3, 7].map(days => ({ student_id: 'matthew', title: `Review: ${guideName.trim()}`, due_date: addDays(today, days), task_type: 'review', completed: false })));
      setSaved(true); setShowNamePrompt(false);
    } catch { setError('Could not save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handlePrint    = useReactToPrint({ contentRef: printRef, documentTitle: guideName || 'Ascend Study Guide' });
  const handleCopy     = async () => { await navigator.clipboard.writeText(studyGuide); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare    = async () => { if (navigator.share) { await navigator.share({ title: guideName || 'Ascend Study Guide', text: studyGuide }); } else handleCopy(); };
  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const lines = doc.splitTextToSize(studyGuide.replace(/[#*`]/g, ''), 170);
    let y = 20; doc.setFontSize(11);
    lines.forEach((line: string) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += 6; });
    doc.save(`${guideName || 'Ascend Study Guide'}.pdf`);
  };

  const canGenerate   = selectedIds.size > 0 || newFiles.length > 0 || customInstructions.trim().length > 0;
  const totalSelected = selectedIds.size + newFiles.length;

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
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Study Guide</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Select materials and Ascend will generate a structured study guide.</div>
        </div>

        {!studyGuide ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Resource Library */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Select Resources</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>{totalSelected > 0 ? `${totalSelected} file${totalSelected !== 1 ? 's' : ''} selected` : 'Choose from your uploaded library or add new files'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {totalSelected > 0 && <button onClick={() => { setSelectedIds(new Set()); setNewFiles([]); }} style={{ padding: '6px 12px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear</button>}
                  <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={handleNewFileInput} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 999, background: light, border: 'none', color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Upload</button>
                </div>
              </div>

              {newFiles.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6 }}>New Files</div>
                  {newFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: light, marginBottom: 4 }}>
                      <IconFile c={color} size={14} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <button onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ fontSize: 12, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {libLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9E9BB0', fontSize: 13 }}>Loading library...</div>
              ) : library.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', border: '2px dashed #E8E5F0', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <IconEmptyFolder size={40} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>No uploaded PDFs yet</div>
                  <div style={{ fontSize: 12, color: '#9E9BB0' }}>Upload files to your class folders, or use the button above.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {library.map(cls => {
                    const clsIds     = cls.folders.flatMap(f => f.resources.map(r => r.id));
                    const clsAllSel  = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                    const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                    const clsExp     = expandedClasses.has(cls.id);
                    return (
                      <div key={cls.id} style={{ border: '1.5px solid #E8E5F0', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF8', cursor: 'pointer' }} onClick={() => setExpandedClasses(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })}>
                          <span style={{ fontSize: 11, color: '#9E9BB0', width: 12 }}>{clsExp ? '▾' : '▸'}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#1D1B26' }}>{cls.name}</span>
                          <button onClick={e => { e.stopPropagation(); toggleClass(cls); }} style={{ fontSize: 10, fontWeight: 700, color: clsAllSel || clsSomeSel ? color : '#9E9BB0', background: clsAllSel || clsSomeSel ? light : '#F3F1EC', border: 'none', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                            {clsAllSel ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                        {clsExp && (
                          <div style={{ padding: '0 14px 10px' }}>
                            {cls.folders.map(folder => {
                              const fIds     = folder.resources.map(r => r.id);
                              const fAllSel  = fIds.every(id => selectedIds.has(id));
                              const fSomeSel = fIds.some(id => selectedIds.has(id));
                              const fExp     = expandedFolders.has(folder.id);
                              return (
                                <div key={folder.id} style={{ marginTop: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#F3F1EC', cursor: 'pointer', marginBottom: 4 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                    <span style={{ fontSize: 10, color: '#9E9BB0', width: 10 }}>{fExp ? '▾' : '▸'}</span>
                                    <IconFolder c="#9E9BB0" size={13} />
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#1D1B26' }}>{folder.name}</span>
                                    <span style={{ fontSize: 10, color: '#9E9BB0' }}>{folder.resources.length} file{folder.resources.length !== 1 ? 's' : ''}</span>
                                    <button onClick={e => { e.stopPropagation(); toggleFolder(folder); }} style={{ fontSize: 10, fontWeight: 700, color: fAllSel || fSomeSel ? color : '#9E9BB0', background: fAllSel || fSomeSel ? light : '#FFFFFF', border: `1px solid ${fAllSel || fSomeSel ? color : '#E8E5F0'}`, borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                                      {fAllSel ? 'Deselect' : 'Select all'}
                                    </button>
                                  </div>
                                  {fExp && (
                                    <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {folder.resources.map(r => {
                                        const isSel = selectedIds.has(r.id);
                                        return (
                                          <div key={r.id} onClick={() => toggleResource(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${isSel ? color : '#E8E5F0'}`, background: isSel ? light : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}>
                                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? color : '#C4C1D4'}`, background: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                              {isSel && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                                            </div>
                                            <IconFile c={isSel ? color : '#9E9BB0'} size={13} />
                                            <span style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? color : '#1D1B26', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file_name}</span>
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
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconStack c="rgba(255,255,255,0.8)" size={15} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — Ascend will identify cross-document patterns' : ''}</span>
                </div>
              )}
            </div>

            {/* Level selector */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 12 }}>Detail Level</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {LEVELS.map(l => (
                  <div key={l.id} onClick={() => setLevel(level === l.id ? '' : l.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${level === l.id ? color : '#E8E5F0'}`, background: level === l.id ? light : '#FAFAF8', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: level === l.id ? color : '#1D1B26', marginBottom: 3 }}>{l.label}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0', lineHeight: 1.4 }}>{l.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom instructions */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 4 }}>Custom Instructions</div>
              <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 10 }}>Narrow the focus or give Ascend specific direction.</div>
              <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Focus on Chapter 3" or "Emphasize reaction mechanisms"' rows={3} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            {/* Practice questions toggle */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addQuestions ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Add Practice Questions</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>Append active recall questions to the guide.</div>
                </div>
                <button onClick={() => setAddQuestions(q => !q)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: addQuestions ? color : '#E8E5F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: addQuestions ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </button>
              </div>
              {addQuestions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8 }}>Question Type</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {QUESTION_FORMATS.map(f => (
                        <button key={f} onClick={() => setQuestionFormat(f)} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, border: `1.5px solid ${questionFormat === f ? color : '#E8E5F0'}`, background: questionFormat === f ? color : '#FAFAF8', color: questionFormat === f ? 'white' : '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Show Answers</div>
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>Include answers and explanations</div>
                    </div>
                    <button onClick={() => setShowAnswers(a => !a)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: showAnswers ? color : '#E8E5F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: showAnswers ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Analyzing ${totalSelected} documents...` : 'Generating study guide...'}</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <button onClick={handleGenerate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: canGenerate ? 'linear-gradient(135deg, #7B6FA0, #5A5078)' : '#F3F1EC', color: canGenerate ? 'white' : '#C4C1D4', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {canGenerate ? (totalSelected > 1 ? `Generate Study Guide from ${totalSelected} Files` : 'Generate Study Guide') : 'Select resources or add instructions to start'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '24px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            {showNamePrompt && (
              <div style={{ background: light, borderRadius: 14, padding: '18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>Name this study guide</div>
                <input type="text" value={guideName} onChange={e => setGuideName(e.target.value)} placeholder='e.g. "AP Bio — Cell Respiration"' style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FFFFFF', outline: 'none', marginBottom: 10 }} />
                <button onClick={handleSave} disabled={!guideName.trim() || saving} style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !guideName.trim() || saving ? 0.4 : 1 }}>
                  {saving ? 'Saving...' : 'Save to Ascend'}
                </button>
              </div>
            )}
            {saved && (
              <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E', marginBottom: 4 }}>Saved — review tasks created for Day 1, 3, and 7.</div>
              </div>
            )}
            {sourceFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9E9BB0', letterSpacing: 1, textTransform: 'uppercase', alignSelf: 'center', marginRight: 2 }}>From</span>
                {sourceFiles.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: light, border: `1px solid ${color}30` }}>
                    <IconFile c={color} size={11} />
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{name}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{guideName || 'Study Guide'}</div>
              <button onClick={() => { setStudyGuide(''); setSelectedIds(new Set()); setNewFiles([]); setSaved(false); setShowNamePrompt(false); setGuideName(''); setSourceFiles([]); }} style={{ fontSize: 12, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate Another</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                <IconPrint size={14} /> Print
              </button>
              <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                <IconShare size={14} /> Share
              </button>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${copied ? '#5FAD8E' : '#E8E5F0'}`, background: copied ? '#EDF7F2' : '#FAFAF8', color: copied ? '#5FAD8E' : '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                <IconCopy c={copied ? '#5FAD8E' : '#6B6880'} size={14} /> {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                <IconDownload size={14} /> PDF
              </button>
            </div>
            <div ref={printRef} style={{ padding: '4px' }}>
              <ReactMarkdown components={{
                h1: ({children}) => <h1 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.4rem', fontWeight: 800, color, marginTop: '1.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${light}` }}>{children}</h1>,
                h2: ({children}) => <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.1rem', fontWeight: 800, color, marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1D1B26', marginTop: '1rem', marginBottom: '0.25rem' }}>{children}</h3>,
                p:  ({children}) => <p  style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#1D1B26', marginBottom: '0.75rem' }}>{children}</p>,
                strong: ({children}) => <strong style={{ fontWeight: 700, color: '#1D1B26' }}>{children}</strong>,
                ul: ({children}) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'disc' }}>{children}</ul>,
                ol: ({children}) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'decimal' }}>{children}</ol>,
                li: ({children}) => <li style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#1D1B26', marginBottom: '0.2rem' }}>{children}</li>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid #E8E5F0', margin: '1.5rem 0' }} />,
              }}>{studyGuide}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
      <TabBar student="matthew" />
    </div>
  );
}

export default function MatthewStudy() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <MatthewStudyInner />
    </Suspense>
  );
}