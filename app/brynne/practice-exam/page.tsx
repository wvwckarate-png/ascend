'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
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

type Question = { front: string; back: string; };

export default function BrynnePracticeExam() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [examMode, setExamMode] = useState<'lecture' | 'folder' | 'cumulative'>('folder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<Record<number, boolean>>({});
  const [screen, setScreen] = useState<'setup' | 'exam' | 'done'>('setup');

  const curQ = questions[qi];
  const total = questions.length;
  const progress = total > 0 ? ((qi / total) * 100) : 0;
  const correct = Object.values(scores).filter(Boolean).length;
  const incorrect = Object.values(scores).filter(v => !v).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const modeLabel = examMode === 'lecture' ? 'single lesson' : examMode === 'cumulative' ? 'full review' : 'unit test';
      const prompt = `Generate ${count} practice exam questions for a 5th grade student about: ${topic} (${modeLabel}). Use simple, clear language. Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"detailed answer"}].`;
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, student: 'brynne', type: 'exam' }),
      });
      const data = await res.json();
      const raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed: Question[] = JSON.parse(raw);
      setQuestions(parsed);
      setQi(0);
      setRevealed(false);
      setScores({});
      setScreen('exam');
    } catch (err) {
      setError('Could not generate exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mark = (isCorrect: boolean) => {
    setScores(s => ({ ...s, [qi]: isCorrect }));
    setRevealed(false);
    if (qi + 1 >= total) { setScreen('done'); } else { setQi(i => i + 1); }
  };

  const restart = () => { setQi(0); setRevealed(false); setScores({}); setScreen('exam'); };

  useEffect(() => {
    if (screen !== 'exam') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (revealed) {
        if (e.key === 'ArrowRight' || e.key === 'y') mark(true);
        if (e.key === 'ArrowLeft' || e.key === 'n') mark(false);
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
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Let's see what you know! Pick a topic and go!</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {([['lecture', 'One Lesson', 'Just one lesson. Great for quick review!'], ['folder', 'Unit Test', 'Everything from this unit.'], ['cumulative', 'Full Review', 'Everything you have learned so far!']] as const).map(([k, lbl, desc]) => (
              <div key={k} onClick={() => setExamMode(k)} style={{ border: `2px solid ${examMode === k ? '#E8956D' : '#E8E5F0'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', background: examMode === k ? '#FFF3E8' : '#FFFFFF', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${examMode === k ? '#E8956D' : '#C4C1D4'}`, background: examMode === k ? '#E8956D' : 'transparent', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: examMode === k ? '#C4A882' : '#1D1B26', marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>What do you want to be quizzed on?</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading && topic.trim()) generate(); }} placeholder="e.g. Algebra - Solving Equations" style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 16 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Number of Questions</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setCount(n)} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${count === n ? '#E8956D' : '#E8E5F0'}`, background: count === n ? '#E8956D' : '#FAFAF8', color: count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: '#E8956D', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>Making your quiz... ✨</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!topic.trim()} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #E8956D, #C4A882)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: topic.trim() ? 1 : 0.4 }}>
              {topic.trim() ? 'Start My Quiz! 📝' : 'Enter a topic first'}
            </button>
          )}
        </main>
      )}

      {screen === 'exam' && curQ && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 80px' }}>
          <div style={{ height: 3, background: '#E8E5F0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: '#E8956D', width: `${progress}%`, transition: 'width 0.4s' }} />
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
            <button onClick={() => setRevealed(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '2px dashed #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Show Answer ✨</button>
          ) : (
            <>
              <div style={{ background: '#FFF3E8', border: '1.5px solid rgba(232,149,109,0.2)', borderRadius: 20, padding: '24px 28px', marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#E8956D', opacity: 0.7, marginBottom: 12 }}>Answer</div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: '#C4A882' }}>{curQ.back}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', textAlign: 'center', marginBottom: 10 }}>Did you get it right?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => mark(false)} style={{ padding: '14px', borderRadius: 14, border: '2px solid #C47878', background: '#FDF2F2', color: '#C47878', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✗ Not Quite</button>
                <button onClick={() => mark(true)} style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#5FAD8E', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>✓ Got It! 🎉</button>
              </div>
            </>
          )}
        </main>
      )}

      {screen === 'done' && (
        <main style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px 80px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>{score >= 80 ? '🌟' : score >= 60 ? '📈' : '💪'}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', marginBottom: 8 }}>Quiz Complete!</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: score >= 80 ? '#5FAD8E' : score >= 60 ? '#E8956D' : '#C47878', marginBottom: 4 }}>{score}%</div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 28 }}>{correct} correct · {incorrect} incorrect · {total} questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 380, margin: '0 auto 28px' }}>
            {[{ n: correct, l: 'Correct', c: '#5FAD8E' }, { n: incorrect, l: 'Incorrect', c: '#C47878' }, { n: total, l: 'Total', c: '#E8956D' }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24, padding: '0 20px', lineHeight: 1.6 }}>
            {score >= 80 ? 'Amazing job Brynne! You really know this! 🌟' : score >= 60 ? 'Great work! Keep practicing the ones you missed!' : 'Keep going! Every time you practice you get better! 💪'}
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Try Again</button>
            <Link href="/brynne" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #E8956D, #C4A882)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Dashboard</button>
            </Link>
          </div>
        </main>
      )}
      <TabBar student="brynne" />
    </div>
  );
}