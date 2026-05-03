'use client';
import Link from 'next/link';
import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../../../lib/supabase';

export default function BrynneStudy() {
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
      formData.append('student', 'brynne');
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
        student_id: 'brynne',
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
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/brynne" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
      </div>
      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>Let's Make a Study Guide! 🌟</h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>Upload a PDF and Ascend will turn it into something amazing!</p>

      {!studyGuide ? (
        <>
          <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div
              className="w-full py-12 rounded-xl flex flex-col items-center justify-center cursor-pointer"
              style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}
              onClick={() => document.getElementById('pdf-upload-brynne')?.click()}
            >
              <div className="text-3xl mb-3">📄</div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{file ? file.name : 'Upload a PDF'}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{file ? 'Click to change file' : 'Click to browse your files'}</p>
              <input id="pdf-upload-brynne" type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          {error && <p className="text-sm mb-4 text-red-500">{error}</p>}
          <button onClick={handleGenerate} disabled={!file || loading} className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-40" style={{ background: 'var(--accent)', color: 'white' }}>
            {loading ? 'Making your study guide... ✨' : 'Make My Study Guide! ✨'}
          </button>
        </>
      ) : (
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {showNamePrompt && (
            <div className="rounded-xl p-4 mb-6" style={{ background: '#FFF3E8', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#C4A882' }}>What should we call this study guide? 🌟</p>
              <input type="text" value={guideName} onChange={(e) => setGuideName(e.target.value)} className="w-full px-4 py-2 rounded-xl text-sm outline-none mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} placeholder="e.g. Algebra Chapter 7 - Equations" />
              <button onClick={handleSave} disabled={!guideName.trim() || saving} className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'var(--accent)', color: 'white' }}>
                {saving ? 'Saving... ✨' : 'Save to Ascend! ✨'}
              </button>
            </div>
          )}
          {saved && (
            <div className="rounded-xl p-3 mb-6 flex items-center gap-2" style={{ background: '#EDF7F2', border: '1px solid var(--border)' }}>
              <span>✅</span>
              <span className="text-sm font-medium" style={{ color: 'var(--green)' }}>Saved to your Ascend dashboard! 🎉</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl" style={{ color: 'var(--text-primary)' }}>{guideName || 'Your Study Guide'} 🎉</h2>
            <button onClick={() => { setStudyGuide(''); setFile(null); setSaved(false); setShowNamePrompt(false); }} className="text-sm" style={{ color: 'var(--accent)' }}>Make Another</button>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: '#FFF3E8', color: '#C4A882' }}>🖨️ Print</button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: '#FFF3E8', color: '#C4A882' }}>💾 Save as PDF</button>
          </div>
          <div ref={printRef} className="study-guide-content p-4">
            <ReactMarkdown components={{
              h1: ({children}) => <h1 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: '600', color: 'var(--purple-dark)', marginTop: '1.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--purple-light)' }}>{children}</h1>,
              h2: ({children}) => <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.25rem', fontWeight: '600', color: 'var(--purple-dark)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>,
              p: ({children}) => <p style={{ fontSize: '0.9rem', lineHeight: '1.75', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{children}</p>,
              strong: ({children}) => <strong style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{children}</strong>,
              ul: ({children}) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'disc' }}>{children}</ul>,
              ol: ({children}) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'decimal' }}>{children}</ol>,
              li: ({children}) => <li style={{ fontSize: '0.9rem', lineHeight: '1.75', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{children}</li>,
              hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />,
            }}>{studyGuide}</ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}