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

type Card = { front: string; back: string; };

function requeue(q: Card[], idx: number, conf: number): Card[] {
  const card = q[idx];
  const rest = q.filter((_, i) => i !== idx);
  if (conf === 3) return rest;
  const positions = [3, 8, 18, 999];
  const pos = Math.min(positions[conf], rest.length);
  rest.splice(pos, 0, card);
  return rest;
}

export default function MichaelFlashcards() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(15);
  const [mode, setMode] = useState<'basic' | 'smart'>('smart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [qi, setQi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [screen, setScreen] = useState<'generate' | 'study' | 'done'>('generate');

  const curCard = mode === 'smart' ? queue[qi] : cards[qi];
  const total = mode === 'smart' ? queue.length : cards.length;
  const progress = total > 0 ? ((qi / total) * 100) : 0;
  const knewWell = Object.values(ratings).filter(r => r >= 2).length;
  const needWork = Object.values(ratings).filter(r => r < 2).length;

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const prompt = `Generate ${count} flashcards for: ${topic}. Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"answer"}]. Pre-med college level.`;
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, student: 'michael', type: 'flashcards' }),
      });
      const data = await res.json();
      const raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed: Card[] = JSON.parse(raw);
      setCards(parsed);
      setQueue([...parsed]);
      setQi(0);
      setFlipped(false);
      setRatings({});
      setScreen('study');
    } catch (err) {
      setError('Could not generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setFlipped(false);
    const isLast = mode === 'smart' ? qi + 1 >= queue.length : qi + 1 >= cards.length;
    if (isLast) { setScreen('done'); return; }
    setQi(i => i + 1);
  };

  const prev = () => {
    if (qi > 0) { setQi(i => i - 1); setFlipped(false); }
  };

  const rate = (conf: number) => {
    setRatings(r => ({ ...r, [qi]: conf }));
    if (mode === 'smart') {
      const nq = requeue(queue, qi, conf);
      if (nq.length === 0) { setScreen('done'); return; }
      setQueue(nq);
      setFlipped(false);
    } else {
      next();
    }
  };

  const restart = () => {
    setQueue([...cards]);
    setQi(0);
    setFlipped(false);
    setRatings({});
    setScreen('study');
  };

  useEffect(() => {
    if (screen !== 'study') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowUp') { e.preventDefault(); next(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); prev(); }
      if (e.key === '1') rate(0);
      if (e.key === '2') rate(1);
      if (e.key === '3') rate(2);
      if (e.key === '4') rate(3);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, qi, flipped, queue, cards]);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/michael" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {screen === 'generate' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Michael</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Flashcards</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Generate a deck from any topic or chapter.</div>
          </div>
          <div style={{ background: '#F3F1EC', borderRadius: 12, padding: 3, display: 'flex', gap: 2, marginBottom: 8 }}>
            {(['smart', 'basic'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === m ? '#FFFFFF' : 'transparent', color: mode === m ? '#7B6FA0' : '#9E9BB0', boxShadow: mode === m ? '0 1px 4px rgba(29,27,38,0.08)' : 'none' }}>
                {m === 'smart' ? 'Smart Deck' : 'Basic Deck'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 20, textAlign: 'center' }}>
            {mode === 'smart' ? 'Adaptive — cards repeat until mastered' : 'Linear — card 1 to end, no algorithm'}
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Topic or Subject</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !loading && topic.trim()) generate(); }} placeholder="e.g. Biology - Ecosystems" style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 16 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Number of Cards</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[10, 15, 20, 30].map(n => (
                <button key={n} onClick={() => setCount(n)} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${count === n ? '#7B6FA0' : '#E8E5F0'}`, background: count === n ? '#7B6FA0' : '#FAFAF8', color: count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
            </div>
          </div>
          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: '#7B6FA0', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>Generating your deck...</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!topic.trim()} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: topic.trim() ? 1 : 0.4 }}>
              {topic.trim() ? 'Generate Deck' : 'Enter a topic first'}
            </button>
          )}
        </main>
      )}

      {screen === 'study' && curCard && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 80px' }}>
          {mode === 'basic' && (
            <div style={{ height: 3, background: '#E8E5F0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', background: '#7B6FA0', width: `${progress}%`, transition: 'width 0.4s' }} />
            </div>
          )}
          {mode === 'smart' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#7B6FA0', letterSpacing: 1, textTransform: 'uppercase' }}>Smart</span>
              <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < qi ? '#5FAD8E' : i === qi ? '#7B6FA0' : '#E8E5F0' }} />
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
              <div style={{ position: 'absolute', width: '100%', minHeight: 240, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#EDE9F7', border: '1.5px solid rgba(123,111,160,0.2)', transform: 'rotateY(180deg)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#7B6FA0', opacity: 0.7, marginBottom: 16 }}>Answer</div>
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: '#5A5078' }}>{curCard.back}</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#C4C1D4', textAlign: 'center', marginBottom: 10 }}>How well did you know this?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {([["Didn't Know", '#C47878'], ['Almost', '#C8965A'], ['Got It', '#5FAD8E'], ['Cold!', '#7B6FA0']] as const).map(([label, color], i) => (
              <button key={i} onClick={() => rate(i)} style={{ padding: '12px 4px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
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
          <div style={{ fontSize: 14, color: '#9E9BB0', lineHeight: 1.6, marginBottom: 28 }}>You reviewed <strong>{Object.keys(ratings).length} cards</strong>. Day 1 review scheduled for tomorrow.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 340, margin: '0 auto 28px' }}>
            {[{ n: Object.keys(ratings).length, l: 'Reviewed', c: '#7B6FA0' }, { n: knewWell, l: 'Knew Well', c: '#5FAD8E' }, { n: needWork, l: 'Needs Work', c: '#C47878' }, { n: cards.length, l: 'Total Cards', c: '#C8965A' }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Study Again</button>
            <Link href="/michael" style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Dashboard</button>
            </Link>
          </div>
        </main>
      )}
      <TabBar student="michael" />
    </div>
  );
}