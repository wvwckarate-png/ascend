'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Class = {
  id: string;
  name: string;
  semester: string;
  professor: string | null;
  class_time: string | null;
  class_format: string | null;
};

type StudyGuide = {
  id: string;
  title: string;
  source_filename: string;
  created_at: string;
};

export default function BrynneDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: classData }, { data: guideData }] = await Promise.all([
        supabase.from('classes').select('*').eq('student_id', 'brynne').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('study_guides').select('*').eq('student_id', 'brynne').order('created_at', { ascending: false }).limit(5),
      ]);
      if (classData) setClasses(classData);
      if (guideData) setGuides(guideData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study guide?')) return;
    setDeletingId(id);
    await supabase.from('study_guides').delete().eq('id', id);
    setGuides(guides.filter(g => g.id !== id));
    setDeletingId(null);
  };

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
        <div className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: '#FFF3E8', color: '#C4A882' }}>
          Future Physician 🐉
        </div>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>Hey, Brynne! 🌟</h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>Let's learn something amazing today!</p>

      <Link href="/brynne/study">
        <div className="flex items-center gap-4 p-5 rounded-2xl mb-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(196,168,130,0.3)' }}>
          <div className="text-2xl">📄</div>
          <div>
            <div className="font-semibold text-white">Make a Study Guide! ✨</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Upload a PDF and Ascend will make it awesome</div>
          </div>
        </div>
      </Link>

      <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl mb-4" style={{ color: 'var(--text-primary)' }}>My Classes</h2>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : classes.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>No classes yet! Ask Dad to help you add your first one. 😊</p>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{cls.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {cls.semester}{cls.professor ? ` · ${cls.professor}` : ''}{cls.class_format ? ` · ${cls.class_format}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/brynne/add-class">
          <button className="w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:opacity-90" style={{ background: '#FFF3E8', color: '#C4A882' }}>
            + Add a Class
          </button>
        </Link>
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl mb-4" style={{ color: 'var(--text-primary)' }}>My Study Guides 📖</h2>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : guides.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your study guides will show up here! 📖</p>
        ) : (
          <div className="flex flex-col gap-3">
            {guides.map((guide) => (
              <div key={guide.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{guide.title}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(guide.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleDelete(guide.id)} disabled={deletingId === guide.id} className="ml-3 text-xs px-3 py-1 rounded-lg transition-all hover:opacity-70 disabled:opacity-30" style={{ color: 'var(--text-secondary)', background: 'var(--border)' }}>
                  {deletingId === guide.id ? '...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}