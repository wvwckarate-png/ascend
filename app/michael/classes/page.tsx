'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../../components/TabBar';
import { supabase } from '../../../lib/supabase';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function classLabel(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('physics'))   return 'PHY';
  if (n.includes('biology'))   return 'BIO';
  if (n.includes('chemistry')) return 'CHM';
  if (n.includes('algebra') || n.includes('math')) return 'MTH';
  if (n.includes('english'))   return 'ENG';
  if (n.includes('science'))   return 'SCI';
  if (n.includes('history'))   return 'HIS';
  if (n.includes('sat') || n.includes('act')) return 'SAT';
  return name.slice(0, 3).toUpperCase();
}

type Class = { id: string; name: string; semester: string; professor: string | null; };

const CLASS_COLORS = ['#9B8EC4', '#7B6FA0', '#A89EC4', '#6B7FA0', '#8E9BC4', '#7B8FA0'];

export default function MichaelClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name, semester, professor')
      .eq('student_id', 'michael')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setClasses(data);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/michael" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Michael</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>My Classes</div>
          </div>
          <Link href="/michael/add-class" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7B6FA0', background: '#EDE9F7', padding: '8px 16px', borderRadius: 999 }}>+ Add Class</span>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
        ) : classes.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No classes yet</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Add your first class to get started.</div>
            <Link href="/michael/add-class" style={{ textDecoration: 'none' }}>
              <span style={{ padding: '10px 22px', borderRadius: 999, background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add a Class</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
            {classes.map((cls, i) => {
              const color = CLASS_COLORS[i % CLASS_COLORS.length];
              return (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/michael/classes/${cls.id}`)}
                  style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(123,111,160,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(29,27,38,0.06)'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color, marginBottom: 10 }}>
                    {classLabel(cls.name)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 3, lineHeight: 1.3 }}>{cls.name}</div>
                  <div style={{ fontSize: 10, color: '#9E9BB0' }}>{cls.semester || cls.professor || ''}</div>
                </div>
              );
            })}
            <div
              onClick={() => router.push('/michael/add-class')}
              style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 16, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', opacity: 0.5, minHeight: 100 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.5'}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#C4C1D4', marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>Add a Class</div>
            </div>
          </div>
        )}
      </main>
      <TabBar student="michael" />
    </div>
  );
}