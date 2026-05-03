'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import TabBar from '../components/TabBar';

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

function IconCards() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="8" width="16" height="12" rx="2" stroke="#7B6FA0" strokeWidth="1.6" fill="none"/>
      <rect x="8" y="5" width="16" height="12" rx="2" stroke="#7B6FA0" strokeWidth="1.6" fill="#F3F1EC" strokeOpacity="0.7"/>
      <line x1="11" y1="11" x2="21" y2="11" stroke="#7B6FA0" strokeWidth="1.2" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconExam() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="7" y="3" width="14" height="22" rx="2" stroke="#C8965A" strokeWidth="1.6" fill="none"/>
      <line x1="10" y1="9"  x2="18" y2="9"  stroke="#C8965A" strokeWidth="1.2"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke="#C8965A" strokeWidth="1.2"/>
      <line x1="10" y1="17" x2="15" y2="17" stroke="#C8965A" strokeWidth="1.2"/>
      <path d="M16 19l1.5 1.5 3-3" stroke="#C8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 5v14" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 10l5-5 5 5" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 20h18" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

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
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', borderRadius: 999, background: '#FFF3E8' }}>
          <Image src="/dragon.png" alt="Brynne" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#C4A882' }}>Brynne</span>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D1B26', letterSpacing: '-1px', marginBottom: 4 }}>Hey, Brynne! 🌟</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Future WVU Physician · Keep going!</div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Study Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <Link href="/brynne/study" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer' }}>
              <div style={{ marginBottom: 10 }}><IconCards /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Study Guide ✨</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Upload a PDF to generate</div>
            </div>
          </Link>
          <Link href="/brynne/flashcards" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer' }}>
              <div style={{ marginBottom: 10 }}><IconCards /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Flashcards ✨</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Make or study a deck</div>
            </div>
          </Link>
          <Link href="/brynne/practice-exam" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer' }}>
              <div style={{ marginBottom: 10 }}><IconExam /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Practice Quiz! 📝</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Test your knowledge</div>
            </div>
          </Link>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', opacity: 0.6 }}>
            <div style={{ marginBottom: 10 }}><IconUpload /></div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Upload Resources</div>
            <div style={{ fontSize: 11, color: '#9E9BB0' }}>Coming soon</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>My Classes</h2>
            <Link href="/brynne/add-class" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#C4A882', background: '#FFF3E8', padding: '4px 12px', borderRadius: 999 }}>+ Add Class</span>
            </Link>
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: '#9E9BB0' }}>Loading...</p>
          ) : classes.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9E9BB0' }}>No classes yet! Ask Dad to help you add your first one. 😊</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classes.map((cls) => (
                <div key={cls.id} style={{ padding: '12px 14px', borderRadius: 12, background: '#FAFAF8', border: '1px solid #E8E5F0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>{cls.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>{cls.semester}{cls.professor ? ` · ${cls.professor}` : ''}{cls.class_format ? ` · ${cls.class_format}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 16 }}>My Study Guides 📖</h2>
          {loading ? (
            <p style={{ fontSize: 13, color: '#9E9BB0' }}>Loading...</p>
          ) : guides.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9E9BB0' }}>Your study guides will show up here! 📖</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guides.map((guide) => (
                <div key={guide.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: '#FAFAF8', border: '1px solid #E8E5F0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guide.title}</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 2 }}>{new Date(guide.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleDelete(guide.id)} disabled={deletingId === guide.id} style={{ marginLeft: 12, fontSize: 11, fontWeight: 700, color: '#9E9BB0', background: '#E8E5F0', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', opacity: deletingId === guide.id ? 0.3 : 1 }}>
                    {deletingId === guide.id ? '...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <TabBar student="brynne" />
    </div>
  );
}