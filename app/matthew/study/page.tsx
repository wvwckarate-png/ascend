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

type Card        = { front: string; back: string; };
type LibResource = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder   = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass    = { id: string; name: string; folders: LibFolder[]; };

function requeue(q: Card[], idx: number, conf: number): Card[] {
  const card = q[idx];
  const rest = q.filter((_, i) => i !== idx);
  if (conf === 3) return rest;
  const pos = Math.min([3, 8, 18, 999][conf], rest.length);
  rest.splice(pos, 0, card);
  return rest;
}

const color = '#7B6FA0';
const light = '#EDE9F7';

function MatthewFlashcardsInner() {
  const searchParams = useSearchParams();
  const folderId   = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');

  // Library
  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const [fileInputRef,    setFileInputRef]     = useState<HTMLInputElement | null>(null);

  // Flashcard config
  const [topic,   setTopic]   = useState('');
  const [count,   setCount]   = useState(15);
  const [mode,    setMode]    = useState<'basic' | 'smart'>('smart');
  const [customInstructions, setCustomInstructions] = useState('');

  // Flashcard state
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [cards,    setCards]    = useState<Card[]>([]);
  const [queue,    setQueue]    = useState<Card[]>([]);
  const [qi,       setQi]       = useState(0);
  const [flipped,  setFlipped]  = useState(false);
  const [ratings,  setRatings]  = useState<Record<number, number>>({});
  const [screen,   setScreen]   = useState<'generate' | 'study' | 'done'>('generate');

  useEffect(() => {
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
      let raw = '';

      const baseInstruction = totalSelected > 1
        ? `You are Ascend analyzing ${allFiles.length} documents for Matthew, a pre-dental high school junior. Perform CROSS-DOCUMENT ANALYSIS: identify concepts recurring across multiple documents, find overlapping themes and high-yield topics. Generate ${count} flashcards focused on these high-frequency, cross-document concepts.${topic.trim() ? ` Additional focus: ${topic.trim()}.` : ''}`
        : `Generate ${count} flashcards${topic.trim() ? ` for: ${topic.trim()}` : ' from the uploaded study material'}. Pre-dental college level.`;

      const custom = customInstructions.trim() ? ` Additional instructions: ${customInstructions.trim()}` : '';
      const prompt = baseInstruction + custom + ' Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"answer"}]';

      if (allFiles.length > 0) {
        const formData = new FormData();
        allFiles.forEach(f => formData.append('files', f));
        formData.append('student', 'matthew');
        formData.append('prompt', prompt);
        formData.append('type', 'flashcards');
        const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        const res  = await fetch('/api/generate-study-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, student: 'matthew', type: 'flashcards' }) });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const parsed: Card[] = JSON.parse(raw);
      setCards(parsed); setQueue([...parsed]); setQi(0); setFlipped(false); setRatings({}); setScreen('study');
    } catch { setError('Could not generate flashcards. Please try again.'); }
    finally { setLoading(false); }
  };

  const next    = () => { setFlipped(false); const isLast = mode === 'smart' ? qi + 1 >= queue.length : qi + 1 >= cards.length; if (isLast) { setScreen('done'); return; } setQi(i => i + 1); };
  const prev    = () => { if (qi > 0) { setQi(i => i - 1); setFlipped(false); } };
  const rate    = (conf: number) => { setRatings(r => ({ ...r, [qi]: conf })); if (mode === 'smart') { const nq = requeue(queue, qi, conf); if (nq.length === 0) { setScreen('done'); return; } setQueue(nq); setFlipped(false); } else { next(); } };
  const restart = () => { setQueue([...cards]); setQi(0); setFlipped(false); setRatings({}); setScreen('study'); };

  const curCard  = mode === 'smart' ? queue[qi] : cards[qi];
  const total    = mode === 'smart' ? queue.length : cards.length;
  const progress = total > 0 ? ((qi / total) * 100) : 0;
  const knewWell = Object.values(ratings).filter(r => r >= 2).length;
  const needWork = Object.values(ratings).filter(r => r < 2).length;

  useEffect(() => {
    if (screen !== 'study') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); next(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); prev(); }
      if (e.key === '1') rate(0); if (e.key === '2') rate(1); if (e.key === '3') rate(2); if (e.key === '4') rate(3);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, qi, flipped, queue, cards]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {screen === 'generate' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Flashcards</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Select materials from your library to generate a deck.</div>
          </div>

          {/* Mode toggle */}
          <div style={{ background: '#F3F1EC', borderRadius: 12, padding: 3, display: 'flex', gap: 2, marginBottom: 20 }}>
            {(['smart', 'basic'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === m ? '#FFFFFF' : 'transparent', color: mode === m ? color : '#9E9BB0', boxShadow: mode === m ? '0 1px 4px rgba(29,27,38,0.08)' : 'none' }}>
                {m === 'smart' ? 'Smart Deck' : 'Basic Deck'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 20, textAlign: 'center' }}>
            {mode === 'smart' ? 'Adaptive — cards repeat until mastered' : 'Linear — card 1 to end, no algorithm'}
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
                    <span style={{ fontSize: 12 }}>📄</span>
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
                <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>No uploaded PDFs yet — upload files to your class folders first, or use the button above.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {library.map(cls => {
                  const clsIds    = cls.folders.flatMap(f => f.resources.map(r => r.id));
                  const clsAllSel = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                  const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                  const clsExp    = expandedClasses.has(cls.id);
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
                            const fIds    = folder.resources.map(r => r.id);
                            const fAllSel = fIds.length > 0 && fIds.every(id => selectedIds.has(id));
                            const fSomeSel = fIds.some(id => selectedIds.has(id));
                            const fExp    = expandedFolders.has(folder.id);
                            return (
                              <div key={folder.id} style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: '#F3F1EC', cursor: 'pointer', marginBottom: 3 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                  <span style={{ fontSize: 9, color: '#9E9BB0', width: 8 }}>{fExp ? '▾' : '▸'}</span>
                                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1D1B26' }}>📁 {folder.name}</span>
                                  <span style={{ fontSize: 9, color: '#9E9BB0' }}>{folder.resources.length} PDF{folder.resources.length !== 1 ? 's' : ''}</span>
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
                                          <span style={{ fontSize: 11, fontWeight: isSel ? 700 : 400, color: isSel ? color : '#1D1B26', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {r.file_name}</span>
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
              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 11, fontWeight: 700 }}>
                📚 {totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — Ascend will find common themes across all documents' : ''}
              </div>
            )}
          </div>

          {/* Topic refine */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>
              {totalSelected > 0 ? 'Refine Focus (optional)' : 'Topic or Subject'}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && canGenerate && !loading) generate(); }} placeholder={totalSelected > 0 ? 'e.g. "Focus on enzymatic reactions"' : 'e.g. AP Biology - Cellular Respiration'} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Custom Instructions (optional)</label>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Emphasize definitions" or "Focus on mechanisms"' rows={2} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Number of Cards</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[10, 15, 20, 30].map(n => (
                <button key={n} onClick={() => setCount(n)} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${count === n ? color : '#E8E5F0'}`, background: count === n ? color : '#FAFAF8', color: count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Analyzing ${totalSelected} documents...` : 'Generating your deck...'}</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: canGenerate ? 1 : 0.4 }}>
              {canGenerate ? (totalSelected > 1 ? `Generate ${count} Cards from ${totalSelected} Files` : `Generate ${count} Cards`) : 'Select resources or enter a topic'}
            </button>
          )}
        </main>
      )}

      {screen === 'study' && curCard && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 80px' }}>
          {mode === 'basic' && (
            <div style={{ height: 3, background: '#E8E5F0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', background: color, width: `${progress}%`, transition: 'width 0.4s' }} />
            </div>
          )}
          {mode === 'smart' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase' }}>Smart</span>
              <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < qi ? '#5FAD8E' : i === qi ? color : '#E8E5F0' }} />
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>{qi + 1}/{total}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prev} style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0' }}>{'<'}</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9E9BB0' }}>{qi + 1} of {total}</span>
            <button onClick={next} style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0' }}>{'>'}</button>
          </div>
          <div onClick={() => setFlipped(f => !f)} style={{ width: '100%', perspective: 1400, cursor: 'pointer', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: '100%', minHeight: 240, transformStyle: 'preserve-3d', transition: 'transform 0.35s', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div style={{ position: 'absolute', width: '100%', minHeight: 240, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#FFFFFF', border: '1.5px solid #E8E5F0', boxShadow: '0 6px 28px rgba(29,27,38,0.08)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 16 }}>Question</div>
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: '#1D1B26' }}>{curCard.front}</div>
                <div style={{ marginTop: 20, fontSize: 11, color: '#C4C1D4' }}>tap · left/right arrow to flip</div>
              </div>
              <div style={{ position: 'absolute', width: '100%', minHeight: 240, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: light, border: `1.5px solid rgba(123,111,160,0.2)`, transform: 'rotateY(180deg)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color, opacity: 0.7, marginBottom: 16 }}>Answer</div>
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: '#5A5078' }}>{curCard.back}</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#C4C1D4', textAlign: 'center', marginBottom: 10 }}>How well did you know this?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {([["Didn't Know", '#C47878'], ['Almost', '#C8965A'], ['Got It', '#5FAD8E'], ['Cold!', color]] as const).map(([label, btnColor], i) => (
              <button key={i} onClick={() => rate(i)} style={{ padding: '12px 4px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: btnColor, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 9, color: '#C4C1D4' }}>press {i + 1}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            {[['←/→', 'flip'], ['↑', 'next'], ['↓', 'back'], ['1-4', 'rate']].map(([key, label]) => (
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
          <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', marginBottom: 8 }}>Session Complete!</div>
          <div style={{ fontSize: 14, color: '#9E9BB0', lineHeight: 1.6, marginBottom: 28 }}>You reviewed <strong>{Object.keys(ratings).length} cards</strong>.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 340, margin: '0 auto 28px' }}>
            {[{ n: Object.keys(ratings).length, l: 'Reviewed', c: color }, { n: knewWell, l: 'Knew Well', c: '#5FAD8E' }, { n: needWork, l: 'Needs Work', c: '#C47878' }, { n: cards.length, l: 'Total Cards', c: '#C8965A' }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Study Again</button>
            <Link href="/matthew" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Dashboard</button>
            </Link>
          </div>
        </main>
      )}
      <TabBar student="matthew" />
    </div>
  );
}

export default function MatthewFlashcards() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <MatthewFlashcardsInner />
    </Suspense>
  );
}