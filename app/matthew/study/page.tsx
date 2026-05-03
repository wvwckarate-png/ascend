'use client';
import Link from 'next/link';
import { useState, useRef } from 'react';
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

export default function MatthewStudy() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studyGuide, setStudyGuide] = useState('');
  const [error, setError] = useState('');
  const [guideName, setGuideName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [saved, setSaved] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student', 'matthew');
      const res = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyGuide(data.studyGuide);
      setGuideName(file.name.replace('.pdf', ''));
      setShowNamePrompt(true);
      setSaved(false);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guideName.trim()) return;
    setSaving(true);
    try {
      const { error: saveError } = await supabase.from('study_guides').insert({
        student_id: 'matthew',
        title: guideName.trim(),
        content: studyGuide,
        source_filename: file?.name || '',
      });
      if (saveError) throw saveError;
      setSaved(true);
      setShowNamePrompt(false);
    } catch (err) {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: guideName || 'Ascend Study Guide',
  });

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
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Generate Study Guide</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Upload a PDF and Ascend will build your study guide.</div>
        </div>

        {!studyGuide ? (
          <>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div onClick={() => document.getElementById('pdf-upload-matthew')?.click()} style={{ padding: '40px 20px', borderRadius: 12, border: '2px dashed #E8E5F0', background: '#FAFAF8', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>{file ? file.name : 'Upload a PDF'}</div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>{file ? 'Click to change file' : 'Click to browse your files'}</div>
                <input id="pdf-upload-matthew" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}
            <button onClick={handleGenerate} disabled={!file || loading} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !file || loading ? 0.4 : 1 }}>
              {loading ? 'Generating your study guide...' : 'Generate Study Guide'}
            </button>
          </>
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
              <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✅</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E' }}>Saved to your Ascend dashboard</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{guideName || 'Your Study Guide'}</div>
              <button onClick={() => { setStudyGuide(''); setFile(null); setSaved(false); setShowNamePrompt(false); }} style={{ fontSize: 12, fontWeight: 700, color: '#7B6FA0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate Another</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#EDE9F7', color: '#5A5078', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>🖨️ Print</button>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#EDE9F7', color: '#5A5078', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>💾 Save as PDF</button>
            </div>
            <div ref={printRef} style={{ padding: '4px' }}>
              <ReactMarkdown components={{
                h1: ({children}) => <h1 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.4rem', fontWeight: 800, color: '#5A5078', marginTop: '1.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EDE9F7' }}>{children}</h1>,
                h2: ({children}) => <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '1.1rem', fontWeight: 800, color: '#5A5078', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>,
                p: ({children}) => <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#1D1B26', marginBottom: '0.75rem' }}>{children}</p>,
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