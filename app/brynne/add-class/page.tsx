'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const SEMESTERS = [
  'Fall 2025', 'Spring 2026', 'Summer 2026',
  'Fall 2026', 'Spring 2027', 'Summer 2027',
];

const CLASS_FORMATS = ['In Person', 'Online', 'Hybrid'];

const CLASS_DAYS = [
  'Mon/Wed/Fri',
  'Tue/Thu',
  'Mon/Wed',
  'Once a Week',
  'Asynchronous',
  'Other',
];

export default function BrynneAddClass() {
  const router = useRouter();
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('');
  const [professor, setProfessor] = useState('');
  const [classDays, setClassDays] = useState('');
  const [classFormat, setClassFormat] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!className || !semester) return;
    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('classes')
        .insert({
          student_id: 'brynne',
          name: className,
          semester: semester,
          professor: professor || null,
          class_time: classDays || null,
          class_format: classFormat || null,
        });

      if (insertError) throw insertError;
      router.push('/brynne');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/brynne" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>
        Add a Class! 🌟
      </h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>
        Tell Ascend about your class. You can add your syllabus later!
      </p>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Class Name <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Science Class"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Semester <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">Select a semester</option>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Teacher <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mrs. Johnson"
            value={professor}
            onChange={(e) => setProfessor(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Class Days <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
          </label>
          <select
            value={classDays}
            onChange={(e) => setClassDays(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">Select class days</option>
            {CLASS_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Class Format <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
          </label>
          <div className="flex gap-3">
            {CLASS_FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setClassFormat(f)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: classFormat === f ? 'var(--accent)' : 'var(--bg)',
                  color: classFormat === f ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Syllabus <span style={{ color: 'var(--text-secondary)' }}>(optional — can be added later)</span>
          </label>
          <div
            className="w-full py-8 rounded-xl flex flex-col items-center justify-center cursor-pointer"
            style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}
            onClick={() => document.getElementById('syllabus-upload-brynne')?.click()}
          >
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {file ? file.name : 'Tap to upload your syllabus PDF'}
            </p>
            <input
              id="syllabus-upload-brynne"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!className || !semester || loading}
          className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {loading ? 'Adding Class...' : 'Add My Class! ✨'}
        </button>
      </div>
    </main>
  );
}