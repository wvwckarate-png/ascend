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

const LEVELS = [
  { id: 'outline',  label: 'Outline',  desc: 'Headers and bullets only. Quick pre-class scan.' },
  { id: 'basic',    label: 'Basic',    desc: 'Short explanations. Good for review.' },
  { id: 'detailed', label: 'Detailed', desc: 'Full explanations with examples. Everyday workhorse.' },
  { id: 'mastery',  label: 'Mastery',  desc: 'Deep synthesis across all materials. For primary learning.' },
];

const QUESTION_FORMATS = ['Multiple Choice', 'Short Answer', 'Both'];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function MatthewStudyInner() {
  const searchParams = useSearchParams();
  const folderId     = searchParams.get('folderId');
  const folderName   = searchParams.get('folderName');

  const [files,             setFiles]             = useState<File[]>([]);
  const [folderLoading,     setFolderLoading]     = useState(false);
  const [folderLabel,       setFolderLabel]       = useState('');
  const [level,             setLevel]             = useState<string>('detailed');
  const [customInstructions,setCustomInstructions]= useState('');
  const [addQuestions,      setAddQuestions]      = useState(false);
  const [questionFormat,    setQuestionFormat]    = useState('Multiple Choice');
  const [showAnswers,       setShowAnswers]       = useState(true);
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [studyGuide,        setStudyGuide]        = useState('');
  const [error,             setError]             = useState('');
  const [guideName,         setGuideName]         = useState('');
  const [showNamePrompt,    setShowNamePrompt]    = useState(false);
  const [saved,             setSaved]             = useState(false);
  const [copied,            setCopied]            = useState(false);
  const [sourceFiles,       setSourceFiles]       = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Load folder resources on mount if folderId is in URL
  useEffect(() => {
    if (!folderId) return;
    const loadFolderFiles = async () => {
      setFolderLoading(true);
      setError('');
      try {
        // Get resources for this folder
        const { data: resources } = await supabase
          .from('resources')
          .select('id, file_name, file_type, storage_url')
          .eq('folder_id', folderId)
          .in('file_type', ['pdf']);

        if (!resources || resources.length === 0) {
          setFolderLabel(folderName ? `${folderName} — no PDFs found` : 'No PDFs in this folder');
          setFolderLoading(false);
          return;
        }

        // Fetch each PDF from storage and convert to File
        const fetchedFiles: File[] = [];
        for (const resource of resources) {
          if (!resource.storage_url) continue;
          try {
            const res = await fetch(resource.storage_url);
            const blob = await res.blob();
            const file = new File([blob], resource.file_name + '.pdf', { type: 'application/pdf' });
            fetchedFiles.push(file);
          } catch {
            // Skip files that fail to fetch
          }
        }

        setFiles(fetchedFiles);
        setFolderLabel(folderName || 'Folder resources loaded');
        if (folderName) setGuideName(folderName + ' — Study Guide');

      } catch {
        setError('Could not load folder resources. You can still upload files manually.');
      } finally {
        setFolderLoading(false);
      }
    };
    loadFolderFiles();
  }, [folderId, folderName]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const buildPrompt = () => {
    const levelPrompts: Record<string, string> = {
      outline:  'Generate a clean outline with headers and bullet points only. No prose. Make it scannable.',
      basic:    'Generate a basic study guide with short explanations. High-level and accessible.',
      detailed: 'Generate a detailed study guide with full explanations, examples, and context for each concept.',
      mastery:  'Generate a comprehensive mastery-level guide. Full explanations, cross-material synthesis, recurring themes, connections between concepts, deep discussion. For primary learning.',
    };
    const questionPrompt = addQuestions
      ? `\n\nAfter the study guide, add a "Practice Questions" section with ${questionFormat === 'Both' ? 'a mix of multiple choice and short answer' : questionFormat.toLowerCase()} questions.${showAnswers ? ' Include answers and brief explanation after each.' : ' Do not include answers.'}`
      : '';
    const custom = customInstructions.trim() ? `\n\nAdditional instructions: ${customInstructions.trim()}` : '';
    return `You are Ascend, an AI study assistant for Matthew, a pre-dental high school junior. Be precise and thorough.\n\n${level ? levelPrompts[level] : 'Generate a study guide based on the custom instructions below.'}${custom}${questionPrompt}\n\nFormat with clear markdown headers and structure.`;
  };

  const handleGenerate = async () => {
    if (files.length === 0 && !customInstructions.trim()) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('student', 'matthew');
      formData.append('prompt', buildPrompt());
      const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyGuide(data.studyGuide);
      setSourceFiles(files.map(f => f.name));
      if (!guideName) setGuideName(files.length > 0 ? files[0].name.replace('.pdf', '') : 'Custom Study Guide');
      setShowNamePrompt(true);
      setSaved(false);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guideName.trim()) return;
    setSaving(true);
    try {
      await supabase.from('study_guides').insert({
        student_id:      'matthew',
        title:           guideName.trim(),
        content:         studyGuide,
        source_filename: sourceFiles.join(', ') || 'Custom',
        folder_id:       folderId || null,
      });
      const today = new Date();
      await supabase.from('tasks').insert([1, 3, 7].map(days => ({
        student_id: 'matthew',
        title:      `Review: ${guideName.trim()}`,
        due_date:   addDays(today, days),
        task_type:  'review',
        completed:  false,
      })));
      setSaved(true);
      setShowNamePrompt(false);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint    = useReactToPrint({ contentRef: printRef, documentTitle: guideName || 'Ascend Study Guide' });
  const handleCopy     = async () => { await navigator.clipboard.writeText(studyGuide); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare    = async () => { if (navigator.share) { await navigator.share({ title: guideName || 'Ascend Study Guide', text: studyGuide }); } else handleCopy(); };
  const handleDownload = async () => {
    const { jsPDF } = await import('jspdf');
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const lines = doc.splitTextToSize(studyGuide.replace(/[#*`]/g, ''), 170);
    let y = 20;
    doc.setFontSize(11);
    lines.forEach((line: string) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += 6; });
    doc.save(`${guideName || 'Ascend Study Guide'}.pdf`);
  };

  const canGenerate = files.length > 0 || customInstructions.trim().length > 0;

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
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Generate Study Guide</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Upload your materials and Ascend will build your study guide.</div>
        </div>

        {/* Folder context banner */}
        {folderId && (
          <div style={{ background: '#EDE9F7', border: '1.5px solid rgba(123,111,160,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5A5078' }}>
                {folderLoading ? 'Loading folder resources...' : folderLabel || folderName}
              </div>
              <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 2 }}>
                {folderLoading ? 'Fetching your uploaded PDFs...' : `${files.length} PDF${files.length !== 1 ? 's' : ''} loaded from this folder`}
              </div>
            </div>
            {folderLoading && <div style={{ width: 18, height: 18, border: '2px solid #E8E5F0', borderTopColor: '#7B6FA0', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />}
          </div>
        )}

        {!studyGuide ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Upload */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 12 }}>Upload Materials</div>
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('pdf-upload-matthew')?.click()} style={{ padding: '32px 20px', borderRadius: 12, border: `2px dashed ${files.length > 0 ? '#7B6FA0' : '#E8E5F0'}`, background: '#FAFAF8', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>
                  {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Upload PDFs'}
                </div>
                <div style={{ fontSize: 11, color: '#9E9BB0' }}>Click or drag and drop · Multiple files supported</div>
                <input id="pdf-upload-matthew" type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={handleFileInput} />
              </div>
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: '#EDE9F7' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5078', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {f.name}</span>
                      <button onClick={() => removeFile(i)} style={{ marginLeft: 8, fontSize: 13, color: '#9E9BB0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Level */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 12 }}>Level of Detail</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {LEVELS.map(l => (
                  <div key={l.id} onClick={() => setLevel(level === l.id ? '' : l.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${level === l.id ? '#7B6FA0' : '#E8E5F0'}`, background: level === l.id ? '#EDE9F7' : '#FAFAF8', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: level === l.id ? '#5A5078' : '#1D1B26', marginBottom: 3 }}>{l.label}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0', lineHeight: 1.4 }}>{l.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom instructions */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 4 }}>Custom Instructions</div>
              <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 10 }}>Supplement or override the level. Tell Ascend exactly what you need.</div>
              <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Focus on the Krebs cycle" or "Give me a one-page cheat sheet"' rows={3} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            {/* Sample questions */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addQuestions ? 16 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Add Sample Questions</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>Append practice questions to the guide</div>
                </div>
                <button onClick={() => setAddQuestions(q => !q)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: addQuestions ? '#7B6FA0' : '#E8E5F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: addQuestions ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </button>
              </div>
              {addQuestions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8 }}>Format</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {QUESTION_FORMATS.map(f => (
                        <button key={f} onClick={() => setQuestionFormat(f)} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, border: `1.5px solid ${questionFormat === f ? '#7B6FA0' : '#E8E5F0'}`, background: questionFormat === f ? '#7B6FA0' : '#FAFAF8', color: questionFormat === f ? 'white' : '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Include Answers</div>
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>Show answers and discussion after each question</div>
                    </div>
                    <button onClick={() => setShowAnswers(a => !a)} style={{ width: 44, height: 26, borderRadius: 999, border: 'none', background: showAnswers ? '#7B6FA0' : '#E8E5F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: showAnswers ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ fontSize: 13, color: '#C47878' }}>{error}</p>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: '#7B6FA0', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#9E9BB0' }}>Generating your study guide...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <button onClick={handleGenerate} disabled={!canGenerate || folderLoading} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: canGenerate && !folderLoading ? 1 : 0.4 }}>
                {folderLoading ? 'Loading folder files...' : canGenerate ? 'Generate Study Guide' : 'Upload files or add instructions to begin'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '24px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            {showNamePrompt && (
              <div style={{ background: '#EDE9F7', borderRadius: 14, padding: '18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5A5078', marginBottom: 10 }}>What should we call this study guide?</div>
                <input type="text" value={guideName} onChange={e => setGuideName(e.target.value)} placeholder="e.g. AP Bio Chapter 8 - Cell Respiration" style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FFFFFF', outline: 'none', marginBottom: 10 }} />
                <button onClick={handleSave} disabled={!guideName.trim() || saving} style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !guideName.trim() || saving ? 0.4 : 1 }}>
                  {saving ? 'Saving...' : 'Save to Ascend'}
                </button>
              </div>
            )}

            {saved && (
              <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E', marginBottom: 4 }}>✅ Saved to your Ascend dashboard</div>
                <div style={{ fontSize: 11, color: '#9E9BB0' }}>📅 Review sessions scheduled for Day 1, Day 3, and Day 7 on your calendar.</div>
              </div>
            )}

            {sourceFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9E9BB0', letterSpacing: 1, textTransform: 'uppercase', alignSelf: 'center', marginRight: 2 }}>From</span>
                {sourceFiles.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: '#EDE9F7', border: '1px solid rgba(123,111,160,0.2)' }}>
                    <span style={{ fontSize: 10 }}>📄</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5078' }}>{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{guideName || 'Your Study Guide'}</div>
              <button onClick={() => { setStudyGuide(''); setFiles([]); setSaved(false); setShowNamePrompt(false); setGuideName(''); setSourceFiles([]); }} style={{ fontSize: 12, fontWeight: 700, color: '#7B6FA0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate Another</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>🖨️ Print</button>
              <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>📤 Share</button>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${copied ? '#5FAD8E' : '#E8E5F0'}`, background: copied ? '#EDF7F2' : '#FAFAF8', color: copied ? '#5FAD8E' : '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
              <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#6B6880', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>⬇️ Download PDF</button>
            </div>

            <div ref={printRef} style={{ padding: '4px' }}>
              <ReactMarkdown components={{
                h1: ({children}) => <h1 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.4rem', fontWeight: 800, color: '#5A5078', marginTop: '1.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EDE9F7' }}>{children}</h1>,
                h2: ({children}) => <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.1rem', fontWeight: 800, color: '#5A5078', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>,
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