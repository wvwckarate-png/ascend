'use client';
import Link from 'next/link';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MichaelStudy() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [studyGuide, setStudyGuide] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student', 'michael');

      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStudyGuide(data.studyGuide);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/michael" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>
        Generate Study Guide
      </h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>
        Upload a PDF and Ascend will build your study guide.
      </p>

      {!studyGuide ? (
        <>
          <div
            className="rounded-2xl p-6 mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-full py-12 rounded-xl flex flex-col items-center justify-center cursor-pointer"
              style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}
              onClick={() => document.getElementById('pdf-upload-michael')?.click()}
            >
              <div className="text-3xl mb-3">📄</div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {file ? file.name : 'Upload a PDF'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {file ? 'Click to change file' : 'Click to browse your files'}
              </p>
              <input
                id="pdf-upload-michael"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {error && <p className="text-sm mb-4 text-red-500">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={!file || loading}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--purple)', color: 'white' }}
          >
            {loading ? 'Generating your study guide...' : 'Generate Study Guide'}
          </button>
        </>
      ) : (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl" style={{ color: 'var(--text-primary)' }}>
              Your Study Guide
            </h2>
            <button
              onClick={() => { setStudyGuide(''); setFile(null); }}
              className="text-sm"
              style={{ color: 'var(--purple)' }}
            >
              Generate Another
            </button>
          </div>
          <div className="study-guide-content">
            <ReactMarkdown
              components={{
                h1: ({children}) => (
                  <h1 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: '600', color: 'var(--purple-dark)', marginTop: '1.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--purple-light)' }}>{children}</h1>
                ),
                h2: ({children}) => (
                  <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.25rem', fontWeight: '600', color: 'var(--purple-dark)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>
                ),
                p: ({children}) => (
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.75', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{children}</p>
                ),
                strong: ({children}) => (
                  <strong style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{children}</strong>
                ),
                ul: ({children}) => (
                  <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'disc' }}>{children}</ul>
                ),
                ol: ({children}) => (
                  <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem', listStyleType: 'decimal' }}>{children}</ol>
                ),
                li: ({children}) => (
                  <li style={{ fontSize: '0.9rem', lineHeight: '1.75', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{children}</li>
                ),
                hr: () => (
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
                ),
              }}
            >
              {studyGuide}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}