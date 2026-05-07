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

type Question = { front: string; back: string; };

const color = '#E8956D';
const light = '#FFF3E8';

function BrynnePracticeExamInner() {
  const searchParams = useSearchParams();
  const folderId     = searchParams.get('folderId');
  const folderName   = searchParams.get('folderName');

  const [topic,         setTopic]         = useState('');
  const [count,         setCount]         = useState(15);
  const [examMode,      setExamMode]      = useState<'lecture' | 'folder' | 'cumulative'>('folder');
  const [loading,       setLoading]       = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderFiles,   setFolderFiles]   = useState<File[]>([]);
  const [folderLabel,   setFolderLabel]   = useState('');
  const [error,         setError]         = useState('');
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [qi,            setQi]            = useState(0);
  const [revealed,      setRevealed]      = useState(false);
  const [scores,        setScores]        = useState<Record<number, boolean>>({});
  const [screen,        setScreen]        = useState<'setup' | 'exam' | 'done'>('setup');

  useEffect(() => {
    if (!folderId) return;
    if (folderName) setTopic(folderName);
    const load = async () => {
      setFolderLoading(true);
      try {
        const { data: resources } = await supabase
          .from('resources')
          .select('id, file_name, file_type, storage_url')
          .eq('folder_id', folderId)
          .eq('file_type', 'pdf');

        if (!resources || resources.length === 0) {
          setFolderLabel(folderName ? `${folderName} — no PDFs found` : 'No PDFs found');
          setFolderLoading(false);
          return;
        }

        const fetched: File[] = [];
        for (const r of resources) {
          if (!r.storage_url) continue;
          try {
            const res  = await fetch(r.storage_url);
            const blob = await res.blob();
            fetched.push(new File([blob], r.file_name + '.pdf', { type: 'application/pdf' }));
          } catch { /* skip */ }
        }

        setFolderFiles(fetched);
        setFolderLabel(folderName || 'Folder loaded');
      } catch {
        setFolderLabel('Could not load folder PDFs — generating from topic');
      } finally {
        setFolderLoading(false);
      }
    };
    load();
  }, [folderId, folderName]);

  const curQ      = questions[qi];
  const total     = questions.length;
  const progress  = total > 0 ? ((qi / total) * 100) : 0;
  const correct   = Object.values(scores).filter(Boolean).length;
  const incorrect = Object.values(scores).filter(v => !v).length;
  const score     = total > 0 ? Math.round((correct / total) * 100) : 0;

  const generate = async () => {
    if (!topic.trim() && folderFiles.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const modeLabel = examMode === 'lecture' ? 'single lesson' : examMode === 'cumulative' ? 'cumulative review' : 'unit test';
      let raw = '';

      if (folderFiles.length > 0) {
        const prompt = `Generate ${count} practice quiz questions from the uploaded study materials${topic.trim() ? ` about: ${topic}` : ''} (${modeLabel}). Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"detailed answer"}]. Brynne is a 5th grader who is advanced — keep language clear and encouraging but make the questions appropriately challenging.`;
        const formData = new FormData();
        folderFiles.forEach(f => formData.append('files', f));
        formData.append('student', 'brynne');
        formData.append('prompt', prompt);
        formData.append('type', 'exam');
        const res  = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        const prompt = `Generate ${count} practice quiz questions for: ${topic} (${modeLabel}). Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"detailed answer"}]. Brynne is a 5th grader who is advanced — keep language clear and encouraging but make the questions appropriately challenging.`;
        const res  = await fetch('/api/generate-study-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, student: 'brynne', type: 'exam' }),
        });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const parsed: Question[] = JSON.parse(raw);
      setQuestions(parsed);
      setQi(0);
      setRevealed(false);
      setScores({});
      setScreen('exam');
    } catch {
      setError('Could not generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mark = (isCorrect: boolean) => {
    setScores(s => ({ ...s, [qi]: isCorrect }));
    setRevealed(false);
    if (qi + 1 >= total) { setScreen('done'); } else { setQi(i => i + 1); }
  };

  const restart   = () => { setQi(0); setRevealed(false); setScores({}); setScreen('exam'); };
  const canGenerate = topic.trim().length > 0 || folderFiles.length > 0;

  useEffect(() => {
    if (screen !== 'exam') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (revealed) {
        if (e.key === 'ArrowRight' || e.key === 'y') mark(true);
        if (e.key === 'ArrowLeft'  || e.key === 'n') mark(false);
      }
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
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Brynne</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Practice Quiz! 📝</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Choose your topic and test your knowledge!</div>
          </div>

          {folderId && (
            <div style={{ background: light, border: `1.5px solid rgba(232,149,109,0.2)`, borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📁</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{folderLoading ? 'Loading folder resources...' : folderLabel || folderName}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 2 }}>{folderLoading ? 'Fetching your uploaded PDFs...' : `${folderFiles.length} PDF${folderFiles.length !== 1 ? 's' : ''} loaded from this folder`}</div>
              </div>
              {folderLoading && <div style={{ width: 18, height: 18, border: '2px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {([['lecture', 'Single Lesson', 'One lesson. Great for quick review!'], ['folder', 'Unit Test', 'Everything for this unit. Let\'s go!'], ['cumulative', 'Big Review', 'Everything so far. Challenge mode! 💪']] as const).map(([k, lbl, desc]) => (
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
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>
              {folderFiles.length > 0 ? 'Topic (optional — folder PDFs will be used)' : 'Subject / Topic'}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading && canGenerate) generate(); }} placeholder={folderFiles.length > 0 ? 'Refine focus (optional)...' : 'e.g. Fractions or Chapter 4 Science'} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 16 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Questions</label>
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
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>Making your quiz... 🌟</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!canGenerate || folderLoading} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: color, color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: canGenerate && !folderLoading ? 1 : 0.4 }}>
              {folderLoading ? 'Loading folder files...' : canGenerate ? 'Generate Practice Quiz! 📝' : 'Enter a topic first'}
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
            <button onClick={() => setRevealed(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: `2px dashed ${color}`, background: 'transparent', color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Show Answer · press Space 👇</button>
          ) : (
            <>
              <div style={{ background: light, border: `1.5px solid rgba(232,149,109,0.2)`, borderRadius: 20, padding: '24px 28px', marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color, opacity: 0.7, marginBottom: 12 }}>Answer</div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: '#1D1B26' }}>{curQ.back}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', textAlign: 'center', marginBottom: 10 }}>Did you get it right? 🤔</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => mark(false)} style={{ padding: '14px', borderRadius: 14, border: '2px solid #C47878', background: '#FDF2F2', color: '#C47878', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✗ Not yet · N</button>
                <button onClick={() => mark(true)}  style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#5FAD8E', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✓ Got it! · Y</button>
              </div>
            </>
          )}
        </main>
      )}

      {screen === 'done' && (
        <main style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px 80px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>{score >= 80 ? '🌟' : score >= 60 ? '📈' : '💪'}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', marginBottom: 8 }}>Quiz Complete!</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: score >= 80 ? '#5FAD8E' : score >= 60 ? color : '#C47878', marginBottom: 4 }}>{score}%</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 28 }}>{correct} correct · {incorrect} to review · {total} questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 380, margin: '0 auto 28px' }}>
            {[{ n: correct, l: 'Correct', c: '#5FAD8E' }, { n: incorrect, l: 'Keep Trying', c: '#C47878' }, { n: total, l: 'Total', c: color }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24, padding: '0 20px', lineHeight: 1.6 }}>
            {score >= 80 ? "You're a superstar! Great job studying! 🌟" : score >= 60 ? "Nice work! Review the ones you missed and try again!" : "Keep going — every time you practice you get better! 💪"}
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Try Again</button>
            <Link href="/brynne" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Dashboard 🏠</button>
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