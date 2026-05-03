'use client';
import Link from 'next/link';
import Image from 'next/image';
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

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function MatthewDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: classData }, { data: guideData }] = await Promise.all([
        supabase.from('classes').select('*').eq('student_id', 'matthew').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('study_guides').select('*').eq('student_id', 'matthew').order('created_at', { ascending: false }).limit(5),
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar */}
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--light)', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', borderRadius: 999, background: 'var(--purple-light)', cursor: 'pointer' }}>
          <Image src="/eagle.png" alt="Matthew" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)' }}>Matthew</span>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--light)', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-1px', marginBottom: 4 }}>Hey, Matthew.</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Pre-Dental · WVU School of Dentistry</div>
        </div>

        {/* Generate Study Guide CTA */}
        <Link href="/matthew/study" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px',
            borderRadius: 18, marginBottom: 16, cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--purple), var(--purple-dark))',
            boxShadow: '0 4px 20px rgba(123,111,160,0.35)',
          }}>
            <div style={{ fontSize: 28 }}>📄</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 2 }}>Generate a Study Guide</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Upload a PDF and get an instant study guide</div>
            </div>
          </div>
        </Link>

        {/* Classes */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)' }}>My Classes</h2>
            <Link href="/matthew/add-class" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', background: 'var(--purple-light)', padding: '4px 12px', borderRadius: 999 }}>+ Add Class</span>
            </Link>
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading...</p>
          ) : classes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No classes added yet. Add your first class to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classes.map((cls) => (
                <div key={cls.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 2 }}>{cls.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {cls.semester}{cls.professor ? ` · ${cls.professor}` : ''}{cls.class_format ? ` · ${cls.class_format}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Study Guides */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px var(--shadow)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 16 }}>Recent Study Guides</h2>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading...</p>
          ) : guides.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Your study guides will appear here once you generate them.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guides.map((guide) => (
                <div key={guide.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guide.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{new Date(guide.created_at).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(guide.id)}
                    disabled={deletingId === guide.id}
                    style={{ marginLeft: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', background: 'var(--border)', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', opacity: deletingId === guide.id ? 0.3 : 1 }}
                  >
                    {deletingId === guide.id ? '...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}