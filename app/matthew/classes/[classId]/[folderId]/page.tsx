'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TabBar from '../../../../components/TabBar';
import { supabase } from '../../../../../lib/supabase';

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

type ClassRow  = { id: string; name: string; semester: string; professor: string; };
type Folder    = { id: string; name: string; exam_date: string | null; };
type Resource  = { id: string; file_name: string; file_type: string; storage_url: string | null; created_at: string; };

const TABS = [
  { key: 'resources', label: 'Resources' },
  { key: 'guide',     label: 'Study Guide' },
  { key: 'cards',     label: 'Flashcards' },
  { key: 'exam',      label: 'Practice Exam' },
];

const FILE_TYPES = [
  { key: 'pdf',   label: 'PDF',            icon: '📄' },
  { key: 'pptx',  label: 'Slides',         icon: '📊' },
  { key: 'audio', label: 'Audio',          icon: '🎙️' },
  { key: 'image', label: 'Image',          icon: '🖼️' },
  { key: 'gdoc',  label: 'Google Doc',     icon: '🔗' },
];

function fileIcon(type: string) {
  return FILE_TYPES.find(f => f.key === type)?.icon || '📎';
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000);
  if (diff < 0)  return null;
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day away';
  return `${diff} days away`;
}

export default function MatthewBinder() {
  const router   = useRouter();
  const params   = useParams();
  const classId  = params.classId as string;
  const folderId = params.folderId as string;

  const [cls,       setCls]       = useState<ClassRow | null>(null);
  const [folder,    setFolder]    = useState<Folder | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [tab,       setTab]       = useState('resources');
  const [loading,   setLoading]   = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [upType,    setUpType]    = useState('');
  const [upName,    setUpName]    = useState('');
  const [upLink,    setUpLink]    = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: classData }, { data: folderData }, { data: resourceData }] = await Promise.all([
        supabase.from('classes').select('id, name, semester, professor').eq('id', classId).single(),
        supabase.from('exam_folders').select('id, name, exam_date').eq('id', folderId).single(),
        supabase.from('resources').select('id, file_name, file_type, storage_url, created_at').eq('folder_id', folderId).order('created_at', { ascending: false }),
      ]);
      if (classData)  setCls(classData);
      if (folderData) setFolder(folderData);
      if (resourceData) setResources(resourceData);
      setLoading(false);
    };
    load();
  }, [classId, folderId]);

  const handleAddResource = async () => {
    if (!upName.trim() || !upType) return;
    setSaving(true);
    const { data } = await supabase
      .from('resources')
      .insert({ folder_id: folderId, file_name: upName.trim(), file_type: upType, storage_url: upLink || null })
      .select()
      .single();
    if (data) setResources(prev => [data, ...prev]);
    setUpType(''); setUpName(''); setUpLink('');
    setShowUpload(false);
    setSaving(false);
  };

  const countdown = folder ? daysUntil(folder.exam_date) : null;
  const isUrgent  = countdown && countdown !== 'Today' && parseInt(countdown) <= 7;

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

        {/* Back */}
        <button
          onClick={() => router.push(`/matthew/classes/${classId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}
        >
          ← {cls?.name || 'Back'}
        </button>

        {/* Binder header card */}
        {!loading && cls && folder && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', marginBottom: 20 }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: '#EDE9F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#7B6FA0', flexShrink: 0 }}>
                  {classLabel(cls.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 2 }}>{cls.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.4px' }}>{folder.name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {folder.exam_date && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>{formatDate(folder.exam_date)}</span>
                  )}
                  {countdown && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: countdown === 'Today' ? '#FDF2F2' : isUrgent ? '#FFF3E8' : '#EDE9F7', color: countdown === 'Today' ? '#C47878' : isUrgent ? '#C8965A' : '#7B6FA0' }}>
                      {countdown}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1.5px solid #E8E5F0', gap: 0 }}>
                {TABS.map(t => (
                  <div
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderBottom: `2.5px solid ${tab === t.key ? '#7B6FA0' : 'transparent'}`, marginBottom: -1.5, color: tab === t.key ? '#7B6FA0' : '#C4C1D4', whiteSpace: 'nowrap' }}
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: '20px' }}>

              {/* RESOURCES */}
              {tab === 'resources' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: '#9E9BB0', lineHeight: 1.5 }}>Lecture notes, PDFs, slides, audio, links.</div>
                    <button
                      onClick={() => setShowUpload(true)}
                      style={{ padding: '8px 16px', borderRadius: 999, background: '#7B6FA0', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0, marginLeft: 12 }}
                    >
                      + Upload
                    </button>
                  </div>

                  {resources.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', border: '2px dashed #E8E5F0', borderRadius: 12 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 6 }}>No resources yet</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0', marginBottom: 18 }}>Upload your first file to get started.</div>
                      <button
                        onClick={() => setShowUpload(true)}
                        style={{ padding: '10px 22px', borderRadius: 999, background: '#7B6FA0', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                      >
                        Upload Resource
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resources.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#FAFAF8', borderRadius: 12, border: '1.5px solid #E8E5F0' }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{fileIcon(r.file_type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.file_name}</div>
                            <div style={{ fontSize: 11, color: '#9E9BB0', textTransform: 'capitalize' }}>{r.file_type}</div>
                          </div>
                          {r.storage_url && (
                            <a href={r.storage_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: '#7B6FA0', textDecoration: 'none' }}>Open</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STUDY GUIDE */}
              {tab === 'guide' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Study guide not generated</div>
                  <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>
                    Upload resources first — Ascend builds a full study guide from your material.
                  </div>
                  <button
                    onClick={() => router.push('/matthew/study')}
                    style={{ padding: '10px 22px', borderRadius: 999, background: resources.length > 0 ? '#7B6FA0' : '#F3F1EC', border: 'none', color: resources.length > 0 ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                  >
                    {resources.length > 0 ? 'Generate Study Guide' : 'Upload Resources First'}
                  </button>
                </div>
              )}

              {/* FLASHCARDS */}
              {tab === 'cards' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🃏</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No flashcard deck yet</div>
                  <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>
                    Generate a deck from this folder's resources.
                  </div>
                  <button
                    onClick={() => router.push('/matthew/flashcards')}
                    style={{ padding: '10px 22px', borderRadius: 999, background: resources.length > 0 ? '#7B6FA0' : '#F3F1EC', border: 'none', color: resources.length > 0 ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                  >
                    {resources.length > 0 ? 'Generate Flashcards' : 'Upload Resources First'}
                  </button>
                </div>
              )}

              {/* PRACTICE EXAM */}
              {tab === 'exam' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No practice exam yet</div>
                  <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>
                    Generate a practice exam from this folder's material.
                  </div>
                  <button
                    onClick={() => router.push('/matthew/practice-exam')}
                    style={{ padding: '10px 22px', borderRadius: 999, background: resources.length > 0 ? '#7B6FA0' : '#F3F1EC', border: 'none', color: resources.length > 0 ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                  >
                    {resources.length > 0 ? 'Generate Practice Exam' : 'Upload Resources First'}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); setUpType(''); setUpName(''); setUpLink(''); }}}
          style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.12)' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Add Resource</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>What type of resource is this?</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
              {FILE_TYPES.map(ft => (
                <div
                  key={ft.key}
                  onClick={() => setUpType(ft.key)}
                  style={{ padding: '10px 6px', borderRadius: 12, border: `1.5px solid ${upType === ft.key ? '#7B6FA0' : '#E8E5F0'}`, background: upType === ft.key ? '#EDE9F7' : '#FAFAF8', cursor: 'pointer', textAlign: 'center' }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{ft.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: upType === ft.key ? '#7B6FA0' : '#9E9BB0' }}>{ft.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Name</label>
              <input
                autoFocus
                value={upName}
                onChange={e => setUpName(e.target.value)}
                placeholder='e.g. "Lecture 8 - Cellular Respiration"'
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {upType === 'gdoc' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Google Doc Link</label>
                <input
                  value={upLink}
                  onChange={e => setUpLink(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {upType && upType !== 'gdoc' && (
              <div style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '24px', textAlign: 'center', marginBottom: 14, background: '#FAFAF8' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>☁️</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9E9BB0', marginBottom: 4 }}>File upload coming soon</div>
                <div style={{ fontSize: 11, color: '#C4C1D4' }}>For now, save the resource name and attach files in v1.2</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => { setShowUpload(false); setUpType(''); setUpName(''); setUpLink(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={!upName.trim() || !upType || saving}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !upName.trim() || !upType || saving ? 0.4 : 1 }}
              >
                {saving ? 'Saving...' : 'Add Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar student="matthew" />
    </div>
  );
}