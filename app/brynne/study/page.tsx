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
function IconBrain({ c, size = 28 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M4 6c5 0 8 2 10 4C16 8 19 6 24 6v16c-5 0-8 2-10 4C12 24 9 22 4 22V6z" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="14" y1="10" x2="14" y2="24" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M19 11l-2 3h3l-2 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconFolder({ c, size = 16 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/></svg>;
}
function IconFile({ c, size = 16 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconEmptyFolder({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none"><path d="M4 11a2 2 0 012-2h6l3 3h14a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" stroke="#C4C1D4" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><line x1="12" y1="20" x2="24" y2="20" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/><line x1="12" y1="24" x2="19" y2="24" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function IconPrint({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect x="6" y="3" width="16" height="8" rx="1" stroke={c} strokeWidth="1.5" fill="none"/><path d="M6 11H4a2 2 0 00-2 2v7a2 2 0 002 2h2v-4h16v4h2a2 2 0 002-2v-7a2 2 0 00-2-2H6z" stroke={c} strokeWidth="1.5" fill="none"/><rect x="6" y="18" width="16" height="7" rx="1" stroke={c} strokeWidth="1.5" fill="none"/></svg>;
}
function IconShare({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M14 4v14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 9l5-5 5 5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 16v6a2 2 0 002 2h14a2 2 0 002-2v-6" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function IconCopy({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect x="9" y="9" width="15" height="16" rx="2" stroke={c} strokeWidth="1.5" fill="none"/><path d="M5 19V6a2 2 0 012-2h13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconDownload({ c = '#6B6880', size = 16 }: { c?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><path d="M14 4v14" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 13l5 5 5-5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 22h20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function IconStack({ c, size = 16 }: { c: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"><rect x="4" y="14" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill="none"/><rect x="6" y="9" width="16" height="8" rx="2" stroke={c} strokeWidth="1.4" fill="none" opacity="0.6"/><rect x="8" y="4" width="12" height="8" rx="2" stroke={c} strokeWidth="1.3" fill="none" opacity="0.35"/></svg>;
}

const LEVELS = [
  { id: 'outline',  label: 'Outline',  desc: 'Headers and bullets only. Quick overview!' },
  { id: 'basic',    label: 'Basic',    desc: 'Short explanations. Good for review.' },
  { id: 'detailed', label: 'Detailed', desc: 'Full explanations with examples.' },
  { id: 'mastery',  label: 'Mastery',  desc: 'Deep dive into everything. For real learning!' },
];
const QUESTION_FORMATS = ['Multiple Choice', 'Short Answer', 'Both'];

function addDays(date: Date, days: number): string {
  const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0];
}

type LibResource = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder   = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass    = { id: string; name: string; folders: LibFolder[]; };
type SavedGuide  = { id: string; title: string; created_at: string; source_filename: string | null; folder_id: string | null; folder_name?: string; class_name?: string; };

const color = '#E8956D';
const light = '#FFF3E8';

const PRINT_STYLES = `
  @media print {
    @page {
      margin: 18mm 16mm 18mm 16mm;
    }
    body * { visibility: hidden !important; }
    #ascend-print-zone, #ascend-print-zone * { visibility: visible !important; }
    #ascend-print-zone {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #ascend-print-zone h1 {
      font-size: 20pt !important;
      font-weight: 800 !important;
      color: #000 !important;
      border-bottom: 2pt solid #000 !important;
      padding-bottom: 4pt !important;
      margin-top: 18pt !important;
      margin-bottom: 8pt !important;
      page-break-after: avoid !important;
    }
    #ascend-print-zone h2 {
      font-size: 14pt !important;
      font-weight: 700 !important;
      color: #000 !important;
      margin-top: 14pt !important;
      margin-bottom: 5pt !important;
      page-break-after: avoid !important;
    }
    #ascend-print-zone h3 {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #000 !important;
      margin-top: 10pt !important;
      margin-bottom: 3pt !important;
      page-break-after: avoid !important;
    }
    #ascend-print-zone p {
      font-size: 10pt !important;
      line-height: 1.6 !important;
      color: #000 !important;
      margin-bottom: 6pt !important;
    }
    #ascend-print-zone strong {
      font-weight: 700 !important;
      color: #000 !important;
    }
    #ascend-print-zone em {
      font-style: italic !important;
    }
    #ascend-print-zone ul {
      padding-left: 18pt !important;
      margin-bottom: 6pt !important;
      list-style-type: disc !important;
    }
    #ascend-print-zone ol {
      padding-left: 18pt !important;
      margin-bottom: 6pt !important;
      list-style-type: decimal !important;
    }
    #ascend-print-zone li {
      font-size: 10pt !important;
      line-height: 1.55 !important;
      color: #000 !important;
      margin-bottom: 2pt !important;
    }
    #ascend-print-zone table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 10pt !important;
      font-size: 9.5pt !important;
      page-break-inside: avoid !important;
    }
    #ascend-print-zone th {
      background: #e8e8e8 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-weight: 700 !important;
      border: 1pt solid #999 !important;
      padding: 4pt 6pt !important;
      text-align: left !important;
      color: #000 !important;
    }
    #ascend-print-zone td {
      border: 1pt solid #bbb !important;
      padding: 4pt 6pt !important;
      color: #000 !important;
      vertical-align: top !important;
    }
    #ascend-print-zone tr:nth-child(even) td {
      background: #f4f4f4 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #ascend-print-zone blockquote {
      border-left: 3pt solid #555 !important;
      margin: 8pt 0 !important;
      padding: 4pt 0 4pt 10pt !important;
      background: #f2f2f2 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      page-break-inside: avoid !important;
    }
    #ascend-print-zone blockquote p {
      font-size: 9.5pt !important;
      font-style: italic !important;
      color: #222 !important;
      margin: 0 !important;
    }
    #ascend-print-zone hr {
      border: none !important;
      border-top: 1pt solid #ccc !important;
      margin: 10pt 0 !important;
    }
    #ascend-print-zone code {
      font-family: monospace !important;
      font-size: 9pt !important;
      background: #f0f0f0 !important;
      padding: 1pt 3pt !important;
      border-radius: 2pt !important;
    }
    #ascend-print-header {
      display: block !important;
      border-bottom: 1.5pt solid #000 !important;
      padding-bottom: 6pt !important;
      margin-bottom: 14pt !important;
    }
    #ascend-print-header .guide-title {
      font-size: 11pt !important;
      font-weight: 800 !important;
      color: #000 !important;
    }
    #ascend-print-header .guide-meta {
      font-size: 8.5pt !important;
      color: #444 !important;
      margin-top: 2pt !important;
    }
  }
`;

function BrynneStudyInner() {
  const searchParams = useSearchParams();
  const folderId      = searchParams.get('folderId');
  const folderName    = searchParams.get('folderName');
  const guideId       = searchParams.get('guideId');
  const weakSpotsRaw  = searchParams.get('weakSpots');
  const weakSpotsList: string[] = weakSpotsRaw ? (() => { try { return JSON.parse(decodeURIComponent(weakSpotsRaw)); } catch { return []; } })() : [];

  const [screen, setScreen] = useState<'history' | 'setup' | 'view'>('history');
  const [savedGuides, setSavedGuides] = useState<SavedGuide[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [renamingId,  setRenamingId]  = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [level,              setLevel]              = useState('detailed');
  const [customInstructions, setCustomInstructions] = useState('');
  const [chemMode,           setChemMode]           = useState(false);
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
  const [classMeta, setClassMeta] = useState<{ className: string; professor: string; notes: string; folderName: string; examDate: string | null; studentName: string; studentGrade: string; studentTrack: string; studentSchool: string; studentProgram: string; studentGradYear: string; generationProfile: string; } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchClassMeta = async (fId: string) => {
    const [{ data: folder }, { data: student }] = await Promise.all([
      supabase.from('exam_folders').select('name, exam_date, class_id').eq('id', fId).single(),
      supabase.from('students').select('name, grade, track, target_school, target_program, grad_year, generation_profile').eq('id', 'brynne').single(),
    ]);
    if (!folder) return;
    const { data: cls } = await supabase.from('classes').select('name, professor, notes').eq('id', folder.class_id).single();
    if (cls) setClassMeta({
      className: cls.name, professor: cls.professor || '', notes: cls.notes || '',
      folderName: folder.name, examDate: folder.exam_date,
      studentName: student?.name || 'Brynne',
      studentGrade: student?.grade || '5th grade',
      studentTrack: student?.track || 'Pre-Med',
      studentSchool: student?.target_school || 'WVU',
      studentProgram: student?.target_program || 'WVU School of Medicine',
      studentGradYear: student?.grad_year ? String(student.grad_year) : '2033',
      generationProfile: student?.generation_profile || '',
    });
  };

  const loadHistory = async () => {
    setHistLoading(true);
    const { data } = await supabase.from('study_guides').select('id, title, created_at, source_filename, folder_id').eq('student_id', 'brynne').order('created_at', { ascending: false });
    if (data) {
      const folderIds = data.map(g => g.folder_id).filter(Boolean);
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
      setSavedGuides(data.map(g => ({
        ...g,
        folder_name: g.folder_id ? folderMap[g.folder_id]?.name : undefined,
        class_name:  g.folder_id ? classMap[folderMap[g.folder_id]?.class_id] : undefined,
      })));
    }
    setHistLoading(false);
  };

  const loadLibrary = async () => {
    setLibLoading(true);
    const { data: classData } = await supabase.from('classes').select('id, name').eq('student_id', 'brynne').eq('is_active', true).order('created_at', { ascending: true });
    if (!classData || classData.length === 0) { setLibLoading(false); return; }
    const classIds = classData.map(c => c.id);
    const { data: folderData } = await supabase.from('exam_folders').select('id, name, class_id').in('class_id', classIds).order('exam_date', { ascending: true });
    const folderIds = (folderData || []).map(f => f.id);
    let resourceData: any[] = [];
    if (folderIds.length > 0) {
      const { data } = await supabase.from('resources').select('id, file_name, file_type, storage_url, folder_id').in('folder_id', folderIds).in('file_type', ['pdf', 'youtube', 'audio', 'image', 'pptx']).not('storage_url', 'is', null);
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

  useEffect(() => {
    loadHistory();
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
          setScreen('view');
        }
        setLoading(false);
      };
      loadExisting();
    } else if (folderId) {
      loadLibrary();
      fetchClassMeta(folderId);
      setScreen('setup');
    } else {
      loadLibrary();
    }
  }, [folderId, folderName, guideId]);

  const renameGuide = async (id: string, title: string) => {
    await supabase.from('study_guides').update({ title: title.trim() }).eq('id', id);
    setSavedGuides(prev => prev.map(g => g.id === id ? { ...g, title: title.trim() } : g));
    setRenamingId(null);
  };

  const openGuide = async (id: string) => {
    setLoading(true);
    const { data } = await supabase.from('study_guides').select('title, content, source_filename').eq('id', id).single();
    if (data) {
      setStudyGuide(data.content);
      setGuideName(data.title);
      setSourceFiles(data.source_filename ? data.source_filename.split(', ') : []);
      setSaved(true);
      setShowNamePrompt(false);
      setScreen('view');
    }
    setLoading(false);
  };

  const deleteGuide = async (id: string) => {
    await supabase.from('study_guides').delete().eq('id', id);
    setSavedGuides(prev => prev.filter(g => g.id !== id));
  };

  const toggleResource = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFolder   = (folder: LibFolder) => { const ids = folder.resources.map(r => r.id); const allSel = ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const toggleClass    = (cls: LibClass) => { const ids = cls.folders.flatMap(f => f.resources.map(r => r.id)); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const handleNewFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf'); setNewFiles(prev => [...prev, ...selected]); e.target.value = ''; };

  const buildPrompt = (fileCount: number) => {
    const levelPrompts: Record<string, string> = {
      outline:  'Generate a clean outline with headers and bullet points only. No prose.',
      basic:    'Generate a basic study guide with short, simple explanations.',
      detailed: 'Generate a detailed study guide with full explanations and examples.',
      mastery:  'Generate a comprehensive mastery-level guide with deep explanations across all materials.',
    };
    const studentCtx = classMeta
      ? `${classMeta.studentName} is a ${classMeta.studentGrade} student on a ${classMeta.studentTrack} track, targeting ${classMeta.studentProgram} (graduating ${classMeta.studentGradYear}).${classMeta.generationProfile ? ` Additional context: ${classMeta.generationProfile}` : ''}`
      : 'Brynne is an advanced 5th grader doing high school level math and science, targeting WVU School of Medicine.';
    const classCtx = classMeta
      ? `Class: ${classMeta.className}. Exam: ${classMeta.folderName}${classMeta.examDate ? ` (${new Date(classMeta.examDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}. Teacher: ${classMeta.professor || 'unknown'}.${classMeta.notes ? ` Teacher notes: "${classMeta.notes}"` : ''}`
      : '';
    const goalCtx = classMeta
      ? `Your ONLY goal: help ${classMeta.studentName} earn an A on ${classMeta.folderName} in ${classMeta.className}${classMeta.professor ? ` with ${classMeta.professor}` : ''}. Think like this teacher — focus on their emphasis, their scope, what they actually test. Use friendly, encouraging language.`
      : `Your goal: help Brynne earn an A in this class. Focus only on what was actually taught. Use friendly, encouraging language.`;
    const base = fileCount > 1
      ? `You are Ascend, an expert study assistant. ${studentCtx} ${classCtx}\n\n${goalCtx}\n\nAnalyze these ${fileCount} documents and identify the highest-yield topics. Do NOT go deeper than what the teacher's materials cover.\n\n${level ? levelPrompts[level] : ''}`
      : `You are Ascend, an expert study assistant. ${studentCtx} ${classCtx}\n\n${goalCtx}\n\nFocus only on what is in these materials. Do not expand beyond the scope of what was taught.\n\n${level ? levelPrompts[level] : 'Generate a focused study guide from the provided material.'}`;
    const q = addQuestions ? `\n\nAdd a "Practice Questions" section with ${questionFormat === 'Both' ? 'mixed multiple choice and short answer' : questionFormat.toLowerCase()} questions.${showAnswers ? ' Include answers and explanations.' : ' Do not include answers.'}` : '';
    const c = customInstructions.trim() ? `\n\nAdditional instructions: ${customInstructions.trim()}` : '';
    const w = weakSpotsList.length > 0 ? `\n\nPRIORITY FOCUS — These are Brynne's confirmed weak spots from prior study sessions: ${weakSpotsList.map((ws, i) => `${i + 1}. ${ws}`).join('; ')}. Dedicate a clearly labeled section to these topics with thorough, friendly explanations and examples to help them really click! 🌟` : '';
    const chem = chemMode ? '\n\nCHEMISTRY MODE — When referencing molecules, compounds, or chemical structures, include their SMILES string formatted exactly as [SMILES: xxx] inline so they can be rendered as structural diagrams. Use standard SMILES notation.' : '';
    return base + c + w + chem + q + '\n\nFormat with clear markdown headers and structure.';
  };

  const handleGenerate = async () => {
    const totalCount = selectedIds.size + newFiles.length;
    if (totalCount === 0 && !customInstructions.trim()) return;
    setLoading(true); setError('');
    try {
      const allResources = library.flatMap(c => c.folders.flatMap(f => f.resources));
      const selectedResources = allResources.filter(r => selectedIds.has(r.id));
      const selectedFolderIds = [...new Set(selectedResources.map(r => r.folder_id))];
      let transcripts: { name: string; text: string }[] = [];
      if (selectedFolderIds.length > 0) {
        const { data: transcriptResources } = await supabase
          .from('resources')
          .select('file_name, transcript')
          .in('folder_id', selectedFolderIds)
          .not('transcript', 'is', null);
        if (transcriptResources) {
          transcripts = transcriptResources.map(r => ({ name: r.file_name, text: r.transcript }));
        }
      }
      const fetchedFiles: File[] = [];
      for (const r of selectedResources) {
        if (!r.storage_url) continue;
        try { const res = await fetch(r.storage_url); const blob = await res.blob(); fetchedFiles.push(new File([blob], r.file_name + '.pdf', { type: 'application/pdf' })); } catch { /* skip */ }
      }
      const allFiles = [...fetchedFiles, ...newFiles];
      const formData = new FormData();
      allFiles.forEach(f => formData.append('files', f));
      formData.append('student', 'brynne');
      formData.append('prompt', buildPrompt(allFiles.length + transcripts.length));
      if (transcripts.length > 0) formData.append('transcripts', JSON.stringify(transcripts));
      const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyGuide(data.studyGuide);
      setSourceFiles([...allFiles.map(f => f.name), ...transcripts.map(t => t.name)]);
      if (!guideName) setGuideName(allFiles.length > 0 ? allFiles[0].name.replace('.pdf', '') : 'My Study Guide');
      setShowNamePrompt(true); setSaved(false);
      setScreen('view');
    } catch { setError('Something went wrong. Please try again!'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!guideName.trim()) return;
    setSaving(true);
    try {
      await supabase.from('study_guides').insert({ student_id: 'brynne', title: guideName.trim(), content: studyGuide, source_filename: sourceFiles.join(', ') || 'Custom', folder_id: folderId || null });
      const today = new Date();
      const { data: savedGuide } = await supabase.from('study_guides').select('id').eq('student_id', 'brynne').order('created_at', { ascending: false }).limit(1).single();
      await supabase.from('tasks').insert([1, 3, 7].map(days => ({ student_id: 'brynne', title: `Review: ${guideName.trim()}`, due_date: addDays(today, days), task_type: 'review', completed: false, resource_id: savedGuide?.id || null, resource_type: 'study_guide' })));
      setSaved(true); setShowNamePrompt(false);
      loadHistory();
    } catch { setError('Could not save. Please try again!'); }
    finally { setSaving(false); }
  };

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: guideName || 'Ascend Study Guide' });
  const handlePDF   = () => { window.print(); };
  const handleCopy  = async () => { await navigator.clipboard.writeText(studyGuide); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare = async () => { if (navigator.share) { await navigator.share({ title: guideName || 'Ascend Study Guide', text: studyGuide }); } else handleCopy(); };

  const canGenerate   = selectedIds.size > 0 || newFiles.length > 0 || customInstructions.trim().length > 0;
  const totalSelected = selectedIds.size + newFiles.length;
  const formatDate    = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <style>{PRINT_STYLES}</style>

      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {/* HISTORY */}
      {screen === 'history' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Brynne</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>Study Guides</div>
            </div>
            <button onClick={() => setScreen('setup')} style={{ padding: '10px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ New Guide</button>
          </div>
          {histLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
          ) : savedGuides.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><IconBrain c={color} size={36} /></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 8 }}>No study guides yet!</div>
              <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24 }}>Ascend can make you an awesome study guide from your notes! 🌟</div>
              <button onClick={() => setScreen('setup')} style={{ padding: '12px 24px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Make My First Guide! 🌟</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {savedGuides.map(guide => (
                <div key={guide.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renamingId === guide.id ? (
                        <div style={{ marginBottom: 4 }}>
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && renameValue.trim()) renameGuide(guide.id, renameValue); if (e.key === 'Escape') setRenamingId(null); }} autoFocus style={{ width: '100%', padding: '4px 8px', border: `1.5px solid ${color}`, borderRadius: 7, fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button onClick={() => { if (renameValue.trim()) renameGuide(guide.id, renameValue); }} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: 'white', background: color, border: 'none', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Save</button>
                            <button onClick={() => setRenamingId(null)} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#9E9BB0', background: '#F3F1EC', border: 'none', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{guide.title}</div>
                      )}
                      {(guide.class_name || guide.folder_name) && (
                        <div style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 7px', borderRadius: 999, display: 'inline-block', marginBottom: 3 }}>
                          {guide.class_name}{guide.folder_name ? ` · ${guide.folder_name}` : ''}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#9E9BB0' }}>{formatDate(guide.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => { setRenamingId(guide.id); setRenameValue(guide.title); }} style={{ color: '#9E9BB0', background: '#F3F1EC', border: 'none', borderRadius: 6, padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 28 28" fill="none"><path d="M4 24l4-1 13-13-3-3L5 20l-1 4z" stroke="#9E9BB0" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M18 8l3 3" stroke="#9E9BB0" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                      <button onClick={() => { if (confirm('Delete this study guide?')) deleteGuide(guide.id); }} style={{ fontSize: 10, color: '#C47878', background: '#FDF2F2', border: 'none', borderRadius: 6, padding: '5px 6px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  </div>
                  <button onClick={() => openGuide(guide.id)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: 'none', background: color, color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>View Guide</button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* SETUP */}
      {screen === 'setup' && (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
          <button onClick={() => setScreen('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Study Guides</button>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Brynne</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>New Study Guide</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Pick your materials and Ascend will make you an awesome study guide!</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Pick Your Materials</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>{totalSelected > 0 ? `${totalSelected} file${totalSelected !== 1 ? 's' : ''} selected! 🎉` : 'Choose from your uploaded files or add new ones'}</div>
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
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9E9BB0', fontSize: 13 }}>Loading your files...</div>
              ) : library.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', border: '2px dashed #E8E5F0', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconEmptyFolder size={40} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>No files uploaded yet!</div>
                  <div style={{ fontSize: 12, color: '#9E9BB0' }}>Upload files to your class folders, or use the button above.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {library.map(cls => {
                    const clsIds = cls.folders.flatMap(f => f.resources.map(r => r.id));
                    const clsAllSel = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                    const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                    const clsExp = expandedClasses.has(cls.id);
                    return (
                      <div key={cls.id} style={{ border: '1.5px solid #E8E5F0', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF8', cursor: 'pointer' }} onClick={() => setExpandedClasses(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })}>
                          <span style={{ fontSize: 11, color: '#9E9BB0', width: 12 }}>{clsExp ? '▾' : '▸'}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#1D1B26' }}>{cls.name}</span>
                          <button onClick={e => { e.stopPropagation(); toggleClass(cls); }} style={{ fontSize: 10, fontWeight: 700, color: clsAllSel || clsSomeSel ? color : '#9E9BB0', background: clsAllSel || clsSomeSel ? light : '#F3F1EC', border: 'none', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{clsAllSel ? 'Deselect all' : 'Select all'}</button>
                        </div>
                        {clsExp && (
                          <div style={{ padding: '0 14px 10px' }}>
                            {cls.folders.map(folder => {
                              const fIds = folder.resources.map(r => r.id);
                              const fAllSel = fIds.every(id => selectedIds.has(id));
                              const fSomeSel = fIds.some(id => selectedIds.has(id));
                              const fExp = expandedFolders.has(folder.id);
                              return (
                                <div key={folder.id} style={{ marginTop: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#F3F1EC', cursor: 'pointer', marginBottom: 4 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                    <span style={{ fontSize: 10, color: '#9E9BB0', width: 10 }}>{fExp ? '▾' : '▸'}</span>
                                    <IconFolder c="#9E9BB0" size={13} />
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#1D1B26' }}>{folder.name}</span>
                                    <span style={{ fontSize: 10, color: '#9E9BB0' }}>{folder.resources.length} file{folder.resources.length !== 1 ? 's' : ''}</span>
                                    <button onClick={e => { e.stopPropagation(); toggleFolder(folder); }} style={{ fontSize: 10, fontWeight: 700, color: fAllSel || fSomeSel ? color : '#9E9BB0', background: fAllSel || fSomeSel ? light : '#FFFFFF', border: `1px solid ${fAllSel || fSomeSel ? color : '#E8E5F0'}`, borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{fAllSel ? 'Deselect' : 'Select all'}</button>
                                  </div>
                                  {fExp && (
                                    <div style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {folder.resources.map(r => {
                                        const isSel = selectedIds.has(r.id);
                                        return (
                                          <div key={r.id} onClick={() => toggleResource(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${isSel ? color : '#E8E5F0'}`, background: isSel ? light : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s' }}>
                                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? color : '#C4C1D4'}`, background: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isSel && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}</div>
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
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: color, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconStack c="rgba(255,255,255,0.8)" size={15} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — Ascend will find what shows up most! 🌟' : ''}</span>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 12 }}>How Much Detail?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {LEVELS.map(l => (
                  <div key={l.id} onClick={() => setLevel(level === l.id ? '' : l.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${level === l.id ? color : '#E8E5F0'}`, background: level === l.id ? light : '#FAFAF8', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: level === l.id ? color : '#1D1B26', marginBottom: 3 }}>{l.label}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0', lineHeight: 1.4 }}>{l.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 4 }}>Special Instructions</div>
              <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 10 }}>Tell Ascend anything special you want it to focus on!</div>
              <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Focus on chapter 3" or "Make it easy to understand"' rows={3} style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${color}20`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addQuestions ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Add Practice Questions?</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>Add some questions to test yourself!</div>
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
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>See the answers right away</div>
                    </div>
                    <button onClick={() => setShowAnswers(a => !a)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: showAnswers ? color : '#E8E5F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: showAnswers ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div onClick={() => setChemMode(m => !m)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Chemistry Mode</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>Include molecular structure diagrams in the guide</div>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 999, background: chemMode ? color : '#E8E5F0', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: chemMode ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Looking through ${totalSelected} files for the best stuff... 🌟` : 'Making your study guide...'}</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <button onClick={handleGenerate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: canGenerate ? color : '#F3F1EC', color: canGenerate ? 'white' : '#C4C1D4', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {canGenerate ? (totalSelected > 1 ? `Make Study Guide from ${totalSelected} Files 🌟` : 'Make My Study Guide! 🌟') : 'Pick some files or add instructions to start'}
              </button>
            )}
          </div>
        </main>
      )}

      {/* VIEW */}
      {screen === 'view' && (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
          <button onClick={() => { setScreen('history'); setStudyGuide(''); setSaved(false); setShowNamePrompt(false); setGuideName(''); setSourceFiles([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Study Guides</button>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '24px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            {showNamePrompt && (
              <div style={{ background: light, borderRadius: 14, padding: '18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>What should we call this study guide?</div>
                <input type="text" value={guideName} onChange={e => setGuideName(e.target.value)} placeholder='e.g. "Chapter 4 Math Study Guide"' style={{ width: '100%', padding: '10px 13px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FFFFFF', outline: 'none', marginBottom: 10 }} />
                <button onClick={handleSave} disabled={!guideName.trim() || saving} style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !guideName.trim() || saving ? 0.4 : 1 }}>
                  {saving ? 'Saving...' : 'Save to Ascend 🌟'}
                </button>
              </div>
            )}
            {saved && !showNamePrompt && (
              <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E' }}>✅ Saved! Review reminders set for Day 1, Day 3, and Day 7!</div>
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
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{guideName || 'Your Study Guide'}</div>
              <button onClick={() => { setStudyGuide(''); setSelectedIds(new Set()); setNewFiles([]); setSaved(false); setShowNamePrompt(false); setGuideName(''); setSourceFiles([]); setScreen('setup'); }} style={{ fontSize: 12, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Make Another</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}><IconPrint size={14} /> Print</button>
              <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}><IconShare size={14} /> Share</button>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${copied ? '#5FAD8E' : '#E8E5F0'}`, background: copied ? '#EDF7F2' : '#FAFAF8', color: copied ? '#5FAD8E' : '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}><IconCopy c={copied ? '#5FAD8E' : '#6B6880'} size={14} /> {copied ? 'Copied!' : 'Copy'}</button>
              <button onClick={handlePDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}><IconDownload size={14} /> PDF</button>
            </div>

            <div id="ascend-print-zone">
              <div id="ascend-print-header" style={{ display: 'none' }}>
                <div className="guide-title">{guideName || 'Study Guide'} — Brynne Peters</div>
                <div className="guide-meta">Pre-Med Track · Ascend · studywithascend.com</div>
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
                  table: ({children}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.875rem' }}>{children}</table>,
                  thead: ({children}) => <thead style={{ background: light }}>{children}</thead>,
                  th: ({children}) => <th style={{ border: '1px solid #C4C1D4', padding: '6px 10px', fontWeight: 700, color: '#1D1B26', textAlign: 'left', fontSize: '0.825rem' }}>{children}</th>,
                  td: ({children}) => <td style={{ border: '1px solid #E8E5F0', padding: '6px 10px', color: '#1D1B26', fontSize: '0.825rem', verticalAlign: 'top' }}>{children}</td>,
                  blockquote: ({children}) => <blockquote style={{ borderLeft: '3px solid #E8956D', margin: '1rem 0', padding: '8px 0 8px 14px', background: '#FFF3E8', borderRadius: '0 8px 8px 0' }}>{children}</blockquote>,
                }}>{studyGuide}</ReactMarkdown>
              </div>
            </div>
          </div>
        </main>
      )}

      <TabBar student="brynne" />
    </div>
  );
}

export default function BrynneStudy() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <BrynneStudyInner />
    </Suspense>
  );
}