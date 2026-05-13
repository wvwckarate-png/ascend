'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
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
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFolder({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
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

function IconScoreHigh({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke="#5FAD8E" strokeWidth="2" fill="#EDF7F2"/>
      <path d="M16 27l7 7 13-14" stroke="#5FAD8E" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconScoreMid({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke="#E8956D" strokeWidth="2" fill="#FFF3E8"/>
      <path d="M18 32l4-8 4 5 4-6 4 5" stroke="#E8956D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconScoreLow({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke="#7B6FA0" strokeWidth="2" fill="#EDE9F7"/>
      <path d="M20 20l4 6 4-6" stroke="#7B6FA0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 30h12" stroke="#7B6FA0" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="26" cy="38" r="1.5" fill="#7B6FA0"/>
    </svg>
  );
}

type Question    = { front: string; back: string; };
type LibResource = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder   = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass    = { id: string; name: string; folders: LibFolder[]; };

const color = '#E8956D';
const light = '#FFF3E8';

function BrynnePracticeExamInner() {
  const searchParams = useSearchParams();
  const folderId   = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');

  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const [fileInputRef,    setFileInputRef]     = useState<HTMLInputElement | null>(null);

  const [topic,              setTopic]              = useState('');
  const [count,              setCount]              = useState(15);
  const [examMode,           setExamMode]           = useState<'lecture' | 'folder' | 'cumulative'>('folder');
  const [customInstructions, setCustomInstructions] = useState('');

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi,        setQi]        = useState(0);
  const [revealed,  setRevealed]  = useState(false);
  const [scores,    setScores]    = useState<Record<number, boolean>>({});
  const [screen,    setScreen]    = useState<'setup' | 'exam' | 'done'>('setup');

  useEffect(() => {
    const loadLibrary = async () => {
      setLibLoading(true);
      const { data: classData } = await supabase.from('classes').select('id, name').eq('student_id', 'brynne').eq('is_active', true).order('created_at', { ascending: true });
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
          if (folderName) setTopic(folderName);
        }
      }
      setLibLoading(false);
    };
    loadLibrary();
  }, [folderId, folderName]);

  const toggleResource = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFolder   = (folder: LibFolder) => { const ids = folder.resources.map(r => r.id); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const toggleClass    = (cls: LibClass)    => { const ids = cls.folders.flatMap(f => f.resources.map(r => r.id)); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };

  const handleNewFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf'); setNewFiles(prev => [...prev, ...selected]); e.target.value = ''; };

  const totalSelected = selectedIds.size + newFiles.length;
  const canGenerate   = totalSelected > 0 || topic.trim().length > 0;

  const generate = async () => {
    if (!canGenerate) return;
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
      const modeLabel = examMode === 'lecture' ? 'one lesson' : examMode === 'cumulative' ? 'everything we learned' : 'this unit';
      const custom = customInstructions.trim() ? ` Additional instructions: ${customInstructions.trim()}.` : '';

      const basePrompt = allFiles.length > 1
        ? `You are Ascend analyzing ${allFiles.length} study documents for Brynne, an advanced 5th grader who does high school level math and science. Use friendly, encouraging language. Perform CROSS-DOCUMENT ANALYSIS: identify concepts recurring across multiple documents, weight your questions toward these important overlapping topics. Generate ${count} practice questions about ${modeLabel}.${topic.trim() ? ` Focus area: ${topic.trim()}.` : ''}${custom} Make questions clear and age-appropriate but challenging. Return ONLY a JSON array with no markdown, no backticks. Format: [{"front":"question","back":"answer"}]`
        : `Generate ${count} practice questions${topic.trim() ? ` about: ${topic.trim()}` : ' from the uploaded material'} (${modeLabel}).${custom} Use friendly, encouraging language for an advanced 5th grader. Make questions clear but challenging. Return ONLY a JSON array with no markdown, no backticks. Format: [{"front":"question","back":"answer"}]`;

      let raw = '';
      if (allFiles.length > 0) {
        const formData = new FormData();
        allFiles.forEach(f => formData.append('files', f));
        formData.append('student', 'brynne');
        formData.append('prompt', basePrompt);
        formData.append('type', 'exam');
        const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        const res  = await fetch('/api/generate-study-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: basePrompt, student: 'brynne', type: 'exam' }) });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const parsed: Question[] = JSON.parse(raw);
      setQuestions(parsed); setQi(0); setRevealed(false); setScores({}); setScreen('exam');
    } catch { setError('Could not make the practice test. Please try again!'); }
    finally { setLoading(false); }
  };

  const mark    = (isCorrect: boolean) => { setScores(s => ({ ...s, [qi]: isCorrect })); setRevealed(false); if (qi + 1 >= total) { setScreen('done'); } else { setQi(i => i + 1); } };
  const restart = () => { setQi(0); setRevealed(false); setScores({}); setScreen('exam'); };

  const total     = questions.length;
  const progress  = total > 0 ? ((qi / total) * 100) : 0;
  const correct   = Object.values(scores).filter(Boolean).length;
  const incorrect = Object.values(scores).filter(v => !v).length;
  const score     = total > 0 ? Math.round((correct / total) * 100) : 0;
  const curQ      = questions[qi];

  useEffect(() => {
    if (screen !== 'exam') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (revealed) { if (e.key === 'ArrowRight' || e.key === 'y') mark(true); if (e.key === 'ArrowLeft' || e.key === 'n') mark(false); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, qi, revealed]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {screen === 'setup' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Brynne</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Practice Test</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Pick your files and Ascend will make a practice test for you!</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {([['lecture', 'Just One Lesson', 'Questions from one lesson. Great for a quick review!'], ['folder', 'This Unit', 'Questions covering everything in this unit.'], ['cumulative', 'Everything!', 'Questions from all your materials. The big challenge!']] as const).map(([k, lbl, desc]) => (
              <div key={k} onClick={() => setExamMode(k)} style={{ border: `2px solid ${examMode === k ? color : '#E8E5F0'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', background: examMode === k ? light : '#FFFFFF', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${examMode === k ? color : '#C4C1D4'}`, background: examMode === k ? color : 'transparent', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: examMode === k ? color : '#1D1B26', marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Pick Your Files</div>
                <div style={{ fontSize: 11, color: '#9E9BB0' }}>{totalSelected > 0 ? `${totalSelected} file${totalSelected !== 1 ? 's' : ''} selected! 🎉` : 'Choose from your uploaded files'}</div>
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
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9E9BB0', fontSize: 12 }}>Loading your files...</div>
            ) : library.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #E8E5F0', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <IconEmptyFolder size={36} />
                </div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>No uploaded files yet — upload files to your class folders first!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {library.map(cls => {
                  const clsIds     = cls.folders.flatMap(f => f.resources.map(r => r.id));
                  const clsAllSel  = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                  const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                  const clsExp     = expandedClasses.has(cls.id);
                  return (
                    <div key={cls.id} style={{ border: '1.5px solid #E8E5F0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#FAFAF8', cursor: 'pointer' }} onClick={() => setExpandedClasses(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })}>
                        <span style={{ fontSize: 10, color: '#9E9BB0', width: 10 }}>{clsExp ? '▾' : '▸'}</span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>{cls.name}</span>
                        <button onClick={e => { e.stopPropagation(); toggleClass(cls); }} style={{ fontSize: 10, fontWeight: 700, color: clsAllSel || clsSomeSel ? color : '#9E9BB0', background: clsAllSel || clsSomeSel ? light : '#F3F1EC', border: 'none', borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                          {clsAllSel ? 'Deselect' : 'Select all'}
                        </button>
                      </div>
                      {clsExp && (
                        <div style={{ padding: '0 12px 8px' }}>
                          {cls.folders.map(folder => {
                            const fIds     = folder.resources.map(r => r.id);
                            const fAllSel  = fIds.length > 0 && fIds.every(id => selectedIds.has(id));
                            const fSomeSel = fIds.some(id => selectedIds.has(id));
                            const fExp     = expandedFolders.has(folder.id);
                            return (
                              <div key={folder.id} style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: '#F3F1EC', cursor: 'pointer', marginBottom: 3 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                  <span style={{ fontSize: 9, color: '#9E9BB0', width: 8 }}>{fExp ? '▾' : '▸'}</span>
                                  <IconFolder c="#9E9BB0" size={12} />
                                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1D1B26' }}>{folder.name}</span>
                                  <span style={{ fontSize: 9, color: '#9E9BB0' }}>{folder.resources.length} file{folder.resources.length !== 1 ? 's' : ''}</span>
                                  <button onClick={e => { e.stopPropagation(); toggleFolder(folder); }} style={{ fontSize: 9, fontWeight: 700, color: fAllSel || fSomeSel ? color : '#9E9BB0', background: fAllSel || fSomeSel ? light : '#FFFFFF', border: `1px solid ${fAllSel || fSomeSel ? color : '#E8E5F0'}`, borderRadius: 999, padding: '2px 7px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                                    {fAllSel ? 'Deselect' : 'Select all'}
                                  </button>
                                </div>
                                {fExp && (
                                  <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {folder.resources.map(r => {
                                      const isSel = selectedIds.has(r.id);
                                      return (
                                        <div key={r.id} onClick={() => toggleResource(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${isSel ? color : '#E8E5F0'}`, background: isSel ? light : '#FFFFFF', cursor: 'pointer' }}>
                                          <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSel ? color : '#C4C1D4'}`, background: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {isSel && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                                          </div>
                                          <IconFile c={isSel ? color : '#9E9BB0'} size={12} />
                                          <span style={{ fontSize: 11, fontWeight: isSel ? 700 : 400, color: isSel ? color : '#1D1B26', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file_name}</span>
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
              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, background: color, color: 'white', fontSize: 11, fontWeight: 700 }}>
                🌟 {totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — questions will focus on the most important stuff!' : ''}
              </div>
            )}
          </div>

          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>
              {totalSelected > 0 ? 'What to Focus On? (optional)' : 'What Subject?'}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && canGenerate && !loading) generate(); }} placeholder={totalSelected > 0 ? 'e.g. "Focus on fractions"' : 'e.g. Algebra - Chapter 4'} style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${color}40`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Special Instructions (optional)</label>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Use simple words" or "More word problems"' rows={2} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>How Many Questions?</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[10, 15, 20, 25].map(n => (
                <button key={n} onClick={() => setCount(n)} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${count === n ? color : '#E8E5F0'}`, background: count === n ? color : '#FAFAF8', color: count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Looking through ${totalSelected} files for great questions... 🌟` : 'Making your practice test...'}</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: canGenerate ? color : '#F3F1EC', color: canGenerate ? 'white' : '#C4C1D4', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
              {canGenerate ? (totalSelected > 1 ? `Make ${count} Questions from ${totalSelected} Files 🌟` : 'Make My Practice Test! 🌟') : 'Pick some files or enter a subject first'}
            </button>
          )}
        </main>
      )}

      {screen === 'exam' && curQ && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 80px' }}>
          <div style={{ height: 3, background: '#E8E5F0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: color, width: `${progress}%`, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>Question {qi + 1} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5FAD8E', background: '#EDF7F2', padding: '3px 10px', borderRadius: 999 }}>✓ {correct}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#C47878', background: '#FDF2F2', padding: '3px 10px', borderRadius: 999 }}>✗ {incorrect}</span>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 20, padding: '32px', marginBottom: 14, boxShadow: '0 4px 20px rgba(29,27,38,0.07)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>Question</div>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, color: '#1D1B26' }}>{curQ.front}</div>
          </div>
          {!revealed ? (
            <button onClick={() => setRevealed(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: `2px dashed ${color}60`, background: light, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Show Answer · press Space</button>
          ) : (
            <>
              <div style={{ background: light, border: `1.5px solid ${color}40`, borderRadius: 20, padding: '24px 28px', marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color, opacity: 0.7, marginBottom: 12 }}>Answer 🌟</div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: '#1D1B26' }}>{curQ.back}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', textAlign: 'center', marginBottom: 10 }}>Did you get it right? 🤔</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => mark(false)} style={{ padding: '14px', borderRadius: 14, border: '2px solid #C47878', background: '#FDF2F2', color: '#C47878', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✗ Not quite · N</button>
                <button onClick={() => mark(true)}  style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#5FAD8E', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✓ Got it! · Y</button>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            {[['Space', 'show answer'], ['Y / →', 'correct'], ['N / ←', 'wrong']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#C4C1D4' }}>
                <span style={{ background: '#F3F1EC', border: '1px solid #E8E5F0', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 9 }}>{key}</span>
                {label}
              </div>
            ))}
          </div>
        </main>
      )}

      {screen === 'done' && (
        <main style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px 80px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            {score >= 80 ? <IconScoreHigh size={64} /> : score >= 60 ? <IconScoreMid size={64} /> : <IconScoreLow size={64} />}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', marginBottom: 8 }}>You did it!</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: score >= 80 ? '#5FAD8E' : score >= 60 ? color : '#C47878', marginBottom: 4 }}>{score}%</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 28 }}>{correct} right · {incorrect} to review · {total} total</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 380, margin: '0 auto 28px' }}>
            {[{ n: correct, l: 'Correct', c: '#5FAD8E' }, { n: incorrect, l: 'Review', c: '#C47878' }, { n: total, l: 'Total', c: color }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24, padding: '0 20px', lineHeight: 1.6 }}>
            {score >= 80 ? "Wow, you're amazing! You really know this stuff! 🌟" : score >= 60 ? "Great job! Keep practicing the ones you missed!" : "Good try! Go over the answers and try again — you've got this! 💪"}
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Try Again!</button>
            <Link href="/brynne" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Dashboard</button>
            </Link>
          </div>
        </main>
      )}
      <TabBar student="brynne" />
    </div>
  );
}

export default function BrynnePracticeExam() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <BrynnePracticeExamInner />
    </Suspense>
  );
}