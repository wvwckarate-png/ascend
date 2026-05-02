'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddClass() {
  const router = useRouter();
  const [className, setClassName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!className) return;
    setLoading(true);
    // We'll wire this to Supabase next
    setTimeout(() => {
      router.push('/matthew');
    }, 1000);
  };

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/matthew" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>
        Add a Class
      </h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>
        Enter your class info and upload your syllabus.
      </p>

      <div
        className="rounded-2xl p-6 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Class Name
        </label>
        <input
          type="text"
          placeholder="e.g. AP Chemistry"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Syllabus Upload <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
        </label>
        <div
          className="w-full py-8 rounded-xl flex flex-col items-center justify-center cursor-pointer"
          style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}
          onClick={() => document.getElementById('syllabus-upload')?.click()}
        >
          <div className="text-2xl mb-2">📄</div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {file ? file.name : 'Tap to upload your syllabus PDF'}
          </p>
          <input
            id="syllabus-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!className || loading}
        className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-40"
        style={{ background: 'var(--purple)', color: 'white' }}
      >
        {loading ? 'Adding Class...' : 'Add Class'}
      </button>
    </main>
  );
}