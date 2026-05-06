'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TabBar from '../../../components/TabBar';
import { supabase } from '../../../../lib/supabase';

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

type ClassRow = { id: string; name: string; semester: string; professor: string; };
type Folder   = { id: string; name: string; exam_date: string | null; created_at: string; };

const color = '#E8956D';
const light = '#FFF3E8';

export default function BrynneClassBinder() {
  const router  = useRouter();
  const params  = useParams();
  const classId = params.classId as string;

  const [cls,     setCls]     = useState<ClassRow | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, semester, professor')
        .eq('id', classId)
        .single();

      if (classData) setCls(classData);

      const { data: folderData } = await supabase
        .from('exam_folders')
        .select('id, name, exam_date, created_at')
        .eq('class_id', classId)
        .order('exam_date', { ascending: true });

      if (folderData) setFolders(folderData);
      setLoading(false);
    };
    load();
  }, [classId]);

  const handleAddFolder = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('exam_folders')
      .insert({ class_id: classId, name: newName.trim(), exam_date: newDate || null })
      .select()
      .single();
    if (data) setFolders(prev => [...prev, data]);
    setNewName(''); setNewDate('');
    setShowAdd(false); setSaving(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysUntil = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000);
    if (diff < 0)   return null;
    if (diff === 0) return 'Today!';
    if (diff === 1) return '1 day away';
    return `${diff} days away`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        <button onClick={() => router.push('/brynne/classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>
          ← Classes
        </button>

        {cls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>
              {classLabel(cls.name)}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.6px', marginBottom: 2 }}>{cls.name}</div>
              <div style={{ fontSize: 12, color: '#9E9BB0' }}>{[cls.semester, cls.professor].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>Exam Folders</div>
          <button onClick={() => setShowAdd(true)} style={{ padding: '6px 14px', borderRadius: 999, background: light, border: 'none', color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
            + Add Folder
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
        ) : folders.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No folders yet!</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Add a folder for each test or unit. You've got this! 🌟</div>
            <button onClick={() => setShowAdd(true)} style={{ padding: '10px 22px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
              Add First Folder
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {folders.map((folder) => {
              const countdown = daysUntil(folder.exam_date);
              const isUrgent  = countdown && countdown !== 'Today!' && parseInt(countdown) <= 7;
              return (
                <div
                  key={folder.id}
                  onClick={() => router.push(`/brynne/classes/${classId}/${folder.id}`)}
                  style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
                      {folder.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>{folder.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {folder.exam_date && <span style={{ fontSize: 11, color: '#9E9BB0' }}>{formatDate(folder.exam_date)}</span>}
                        {countdown && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: countdown === 'Today!' ? '#FDF2F2' : isUrgent ? '#FFF3E8' : light, color: countdown === 'Today!' ? '#C47878' : isUrgent ? '#C8965A' : color }}>
                            {countdown}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: '#C4C1D4', fontSize: 16 }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); setNewName(''); setNewDate(''); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.12)' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>New Folder 📁</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 22 }}>What test or unit is this folder for?</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Folder Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) handleAddFolder(); }}
                placeholder="e.g. Chapter 7 Test, Midterm..."
                style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Test Date (optional)</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewDate(''); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddFolder} disabled={!newName.trim() || saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !newName.trim() || saving ? 0.4 : 1 }}>
                {saving ? 'Saving...' : 'Create Folder 🌟'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar student="brynne" />
    </div>
  );
}