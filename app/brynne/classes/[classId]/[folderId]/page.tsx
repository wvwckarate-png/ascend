'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
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

type ClassRow = { id: string; name: string; semester: string; professor: string; };
type Folder   = { id: string; name: string; exam_date: string | null; };
type Resource = { id: string; file_name: string; file_type: string; storage_url: string | null; created_at: string; };

const TABS = [
  { key: 'resources', label: 'Resources',     icon: '📂' },
  { key: 'cards',     label: 'Flashcards',    icon: '🃏' },
  { key: 'exam',      label: 'Practice Exam', icon: '📝' },
  { key: 'guide',     label: 'Study Guide',   icon: '📖' },
];

const FILE_TYPES = [
  { key: 'pdf',   label: 'PDF',        icon: '📄', accept: '.pdf' },
  { key: 'pptx',  label: 'Slides',     icon: '📊', accept: '.pptx,.ppt' },
  { key: 'audio', label: 'Audio',      icon: '🎙️', accept: '.mp3,.m4a,.wav,.ogg' },
  { key: 'image', label: 'Image',      icon: '🖼️', accept: '.png,.jpg,.jpeg,.webp' },
  { key: 'gdoc',  label: 'Google Doc', icon: '🔗', accept: '' },
];

const color = '#E8956D';
const light = '#FFF3E8';

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
  if (diff < 0)   return null;
  if (diff === 0) return 'Today!';
  if (diff === 1) return '1 day away';
  return `${diff} days away`;
}

export default function BrynneBinder() {
  const router   = useRouter();
  const params   = useParams();
  const classId  = params.classId as string;
  const folderId = params.folderId as string;

  const [cls,            setCls]            = useState<ClassRow | null>(null);
  const [folder,         setFolder]         = useState<Folder | null>(null);
  const [resources,      setResources]      = useState<Resource[]>([]);
  const [tab,            setTab]            = useState('resources');
  const [loading,        setLoading]        = useState(true);
  const [showUpload,     setShowUpload]     = useState(false);
  const [upType,         setUpType]         = useState('');
  const [upName,         setUpName]         = useState('');
  const [upLink,         setUpLink]         = useState('');
  const [upFile,         setUpFile]         = useState<File | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [upError,        setUpError]        = useState('');
  const [upSaved,        setUpSaved]        = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: classData }, { data: folderData }, { data: resourceData }] = await Promise.all([
        supabase.from('classes').select('id, name, semester, professor').eq('id', classId).single(),
        supabase.from('exam_folders').select('id, name, exam_date').eq('id', folderId).single(),
        supabase.from('resources').select('id, file_name, file_type, storage_url, created_at').eq('folder_id', folderId).order('created_at', { ascending: false }),
      ]);
      if (classData)    setCls(classData);
      if (folderData)   setFolder(folderData);
      if (resourceData) setResources(resourceData);
      setLoading(false);
    };
    load();
  }, [classId, folderId]);

  const resetUpload = () => {
    setUpType(''); setUpName(''); setUpLink(''); setUpFile(null);
    setUploading(false); setUploadProgress(0); setUpError(''); setUpSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUpFile(f);
    if (!upName.trim()) setUpName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleAddResource = async () => {
    if (!upName.trim() || !upType) return;
    setUploading(true);
    setUpError('');

    try {
      let storageUrl: string | null = null;

      if (upFile && upType !== 'gdoc') {
        const ext      = upFile.name.split('.').pop();
        const safeName = upName.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
        const path     = `brynne/${folderId}/${Date.now()}_${safeName}.${ext}`;

        const progressInterval = setInterval(() => {
          setUploadProgress(p => Math.min(p + 12, 85));
        }, 200);

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(path, upFile, { upsert: false });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(path);

        storageUrl = urlData.publicUrl;

      } else if (upType === 'gdoc' && upLink.trim()) {
        storageUrl = upLink.trim();
      }

      const { data } = await supabase
        .from('resources')
        .insert({ folder_id: folderId, file_name: upName.trim(), file_type: upType, storage_url: storageUrl })
        .select()
        .single();

      if (data) setResources(prev => [data, ...prev]);
      setUpSaved(true);
      setTimeout(() => { setShowUpload(false); resetUpload(); }, 900);

    } catch (err: any) {
      setUpError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const countdown    = folder ? daysUntil(folder.exam_date) : null;
  const isUrgent     = countdown && countdown !== 'Today!' && parseInt(countdown) <= 7;
  const hasResources = resources.length > 0;
  const selectedType = FILE_TYPES.find(f => f.key === upType);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 80px' }}>
        <button onClick={() => router.push(`/brynne/classes/${classId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← {cls?.name || 'Back'}
        </button>

        {!loading && cls && folder && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(29,27,38,0.07)' }}>
            <div style={{ padding: '22px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
                    {classLabel(cls.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9BB0', marginBottom: 3 }}>{cls.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1D1B26', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{folder.name}</div>
                    {cls.semester && <div style={{ fontSize: 11, color: '#C4C1D4', marginTop: 3 }}>{cls.semester}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, paddingTop: 4 }}>
                  {folder.exam_date && <div style={{ fontSize: 13, fontWeight: 700, color: '#6B6880' }}>{formatDate(folder.exam_date)}</div>}
                  {countdown && (
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: countdown === 'Today!' ? '#FDF2F2' : isUrgent ? light : light, color: countdown === 'Today!' ? '#C47878' : isUrgent ? '#C8965A' : color }}>
                      {countdown}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: '#9E9BB0' }}>
                  <span style={{ fontWeight: 700, color: hasResources ? color : '#C4C1D4' }}>{resources.length}</span> resource{resources.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', borderBottom: '1.5px solid #E8E5F0', marginLeft: -24, marginRight: -24, paddingLeft: 24 }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: `2.5px solid ${tab === t.key ? color : 'transparent'}`, marginBottom: -1.5, color: tab === t.key ? color : '#9E9BB0', whiteSpace: 'nowrap', fontFamily: 'var(--font-jakarta)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px' }}>

              {tab === 'resources' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Resources</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>Notes, worksheets, audio — everything for this unit! 📚</div>
                    </div>
                    <button onClick={() => setShowUpload(true)} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>+ Upload</button>
                  </div>
                  {resources.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Nothing here yet!</div>
                      <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>Upload your notes, worksheets, or anything from class to get started. 🌟</div>
                      <button onClick={() => setShowUpload(true)} style={{ padding: '11px 24px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Upload Something</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resources.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: '#FAFAF8', borderRadius: 12, border: '1.5px solid #E8E5F0' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{fileIcon(r.file_type)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.file_name}</div>
                            <div style={{ fontSize: 11, color: '#9E9BB0', textTransform: 'capitalize', marginTop: 2 }}>{r.file_type}</div>
                          </div>
                          {r.storage_url && <a href={r.storage_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color, textDecoration: 'none', flexShrink: 0, padding: '5px 12px', background: light, borderRadius: 999 }}>Open</a>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'cards' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Flashcards</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>Make flashcards from your notes! 🃏</div>
                    </div>
                    {hasResources && <button onClick={() => router.push('/brynne/flashcards')} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate</button>}
                  </div>
                  <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No flashcards yet!</div>
                    <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Ascend can make flashcards from your notes — great for studying! ✨' : 'Upload your notes first, then Ascend will make flashcards for you!'}</div>
                    <button onClick={() => hasResources ? router.push('/brynne/flashcards') : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? color : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                      {hasResources ? 'Generate Flashcards 🃏' : 'Upload Notes First'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'exam' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Practice Exam</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>Practice before the real test! 📝</div>
                    </div>
                    {hasResources && <button onClick={() => router.push('/brynne/practice-exam')} style={{ padding: '9px 18px', borderRadius: 999, background: '#C8965A', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate</button>}
                  </div>
                  <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No practice test yet!</div>
                    <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Let Ascend make a practice test from your notes! ✨' : 'Upload your notes first, then Ascend will make a practice test!'}</div>
                    <button onClick={() => hasResources ? router.push('/brynne/practice-exam') : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? '#C8965A' : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                      {hasResources ? 'Generate Practice Test 📝' : 'Upload Notes First'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'guide' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Study Guide</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>Ascend builds a study guide from your notes! 📖</div>
                    </div>
                    {hasResources && <button onClick={() => router.push('/brynne/study')} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate</button>}
                  </div>
                  <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No study guide yet!</div>
                    <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Ascend will build you an awesome study guide from everything in this folder! 🌟' : 'Upload your notes first — then Ascend builds your study guide!'}</div>
                    <button onClick={() => hasResources ? router.push('/brynne/study') : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? color : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                      {hasResources ? 'Generate Study Guide ✨' : 'Upload Notes First'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {showUpload && (
        <div onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); resetUpload(); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '24px 20px 44px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Add Something 📎</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>What kind of file is this?</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
              {FILE_TYPES.map(ft => (
                <div key={ft.key} onClick={() => { setUpType(ft.key); setUpFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '12px 6px', borderRadius: 12, border: `1.5px solid ${upType === ft.key ? color : '#E8E5F0'}`, background: upType === ft.key ? light : '#FAFAF8', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{ft.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: upType === ft.key ? color : '#9E9BB0' }}>{ft.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Name it</label>
              <input autoFocus value={upName} onChange={e => setUpName(e.target.value)} placeholder='e.g. "Chapter 7 Notes"' style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            {upType === 'gdoc' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Link</label>
                <input value={upLink} onChange={e => setUpLink(e.target.value)} placeholder="https://docs.google.com/..." style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            )}

            {upType && upType !== 'gdoc' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>File</label>
                <input ref={fileInputRef} type="file" accept={selectedType?.accept || '*'} onChange={handleFileChange} style={{ display: 'none' }} />
                {upFile ? (
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${color}`, background: light, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{selectedType?.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upFile.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>{(upFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button onClick={() => { setUpFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = color} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E5F0'}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>Tap to choose file</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0' }}>{selectedType?.accept?.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}</div>
                  </div>
                )}
              </div>
            )}

            {uploading && uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>Uploading...</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{uploadProgress}%</span>
                </div>
                <div style={{ height: 6, background: '#F3F1EC', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, borderRadius: 99, width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            {upError && (
              <div style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 14 }}>
                {upError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowUpload(false); resetUpload(); }} disabled={uploading} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddResource} disabled={!upName.trim() || !upType || uploading || upSaved || (upType === 'gdoc' ? !upLink.trim() : false)} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: upSaved ? '#5FAD8E' : !upName.trim() || !upType ? '#F3F1EC' : color, color: !upName.trim() || !upType ? '#C4C1D4' : 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: uploading ? 0.7 : 1 }}>
                {upSaved ? '✅ Saved!' : uploading ? 'Uploading...' : upFile ? 'Upload & Save' : 'Save Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar student="brynne" />
    </div>
  );
}