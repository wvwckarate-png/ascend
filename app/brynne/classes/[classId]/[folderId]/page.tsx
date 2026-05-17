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

function IconBrain({ c, size = 28 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 6c5 0 8 2 10 4C16 8 19 6 24 6v16c-5 0-8 2-10 4C12 24 9 22 4 22V6z" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="14" y1="10" x2="14" y2="24" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M19 11l-2 3h3l-2 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCards({ c, size = 28 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="5" y="8" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <rect x="8" y="5" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="#FFF3E8" strokeOpacity="0.7"/>
      <line x1="11" y1="11" x2="21" y2="11" stroke={c} strokeWidth="1.2" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconExam({ c, size = 28 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="7" y="3" width="14" height="22" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="10" y1="9"  x2="18" y2="9"  stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="17" x2="15" y2="17" stroke={c} strokeWidth="1.2"/>
      <path d="M16 19l1.5 1.5 3-3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFolder({ c, size = 28 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconFilePDF({ c, size = 18 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="9" y1="15" x2="19" y2="15" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="9" y1="19" x2="15" y2="19" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconSlides({ c, size = 18 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="2" y="5" width="24" height="16" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="14" y1="21" x2="14" y2="25" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="10" y1="25" x2="18" y2="25" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M11 10l5 3-5 3V10z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconMic({ c, size = 18 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="10" y="3" width="8" height="13" rx="4" stroke={c} strokeWidth="1.6" fill="none"/>
      <path d="M6 15a8 8 0 0016 0" stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <line x1="14" y1="23" x2="14" y2="26" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="10" y1="26" x2="18" y2="26" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconPhoto({ c, size = 18 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <circle cx="9" cy="12" r="2" stroke={c} strokeWidth="1.4" fill="none"/>
      <path d="M3 20l6-5 4 4 3-3 6 5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLink({ c, size = 18 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M11 17l6-6" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M8 13l-2 2a4 4 0 005.7 5.7l2-2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M14 10l2-2a4 4 0 015.7 5.7l-2 2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function FileTypeIcon({ type, c, size = 18 }: { type: string; c: string; size?: number }) {
  if (type === 'pdf')   return <IconFilePDF c={c} size={size} />;
  if (type === 'pptx')  return <IconSlides  c={c} size={size} />;
  if (type === 'audio') return <IconMic     c={c} size={size} />;
  if (type === 'image') return <IconPhoto   c={c} size={size} />;
  if (type === 'gdoc')  return <IconLink    c={c} size={size} />;
  return <IconFilePDF c={c} size={size} />;
}

function TabIcon({ tabKey, active }: { tabKey: string; active: boolean }) {
  const c = active ? '#E8956D' : '#C4C1D4';
  if (tabKey === 'resources') return <IconFolder c={c} size={15} />;
  if (tabKey === 'cards')     return <IconCards  c={c} size={15} />;
  if (tabKey === 'exam')      return <IconExam   c={c} size={15} />;
  if (tabKey === 'guide')     return <IconBrain  c={c} size={15} />;
  return null;
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
  { key: 'resources', label: 'Resources' },
  { key: 'cards',     label: 'Flashcards' },
  { key: 'exam',      label: 'Practice Exam' },
  { key: 'guide',     label: 'Study Guide' },
];

const color = '#E8956D';
const light = '#FFF3E8';

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

  const [cls,        setCls]        = useState<ClassRow | null>(null);
  const [folder,     setFolder]     = useState<Folder | null>(null);
  const [resources,  setResources]  = useState<Resource[]>([]);
  const [tab,        setTab]        = useState('resources');
  const [loading,    setLoading]    = useState(true);
  const [folderDeck,  setFolderDeck]  = useState<{id:string;title:string;card_count:number} | null>(null);
  const [folderExam,  setFolderExam]  = useState<{id:string;title:string;status:string;score:number|null;questions:any[]} | null>(null);
  const [folderGuide, setFolderGuide] = useState<{id:string;title:string;created_at:string} | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: classData }, { data: folderData }, { data: resourceData }, { data: deckData }, { data: examData }, { data: guideData }] = await Promise.all([
        supabase.from('classes').select('id, name, semester, professor').eq('id', classId).single(),
        supabase.from('exam_folders').select('id, name, exam_date').eq('id', folderId).single(),
        supabase.from('resources').select('id, file_name, file_type, storage_url, created_at').eq('folder_id', folderId).order('created_at', { ascending: false }),
        supabase.from('flashcard_decks').select('id, title, card_count').eq('folder_id', folderId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('practice_exams').select('id, title, status, score, questions').eq('folder_id', folderId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('study_guides').select('id, title, created_at').eq('folder_id', folderId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (classData)    setCls(classData);
      if (folderData)   setFolder(folderData);
      if (resourceData) setResources(resourceData);
      if (deckData)     setFolderDeck(deckData);
      if (examData)     setFolderExam(examData);
      if (guideData)    setFolderGuide(guideData);
      setLoading(false);
    };
    load();
  }, [classId, folderId]);

  const countdown    = folder ? daysUntil(folder.exam_date) : null;
  const isUrgent     = countdown && countdown !== 'Today!' && parseInt(countdown) <= 7;
  const hasResources = resources.length > 0;

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
                    <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: countdown === 'Today!' ? '#FDF2F2' : light, color: countdown === 'Today!' ? '#C47878' : isUrgent ? '#C8965A' : color }}>
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
                    <TabIcon tabKey={t.key} active={tab === t.key} />
                    {t.label}
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
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>Notes, worksheets, audio — everything for this unit!</div>
                    </div>
                    <button onClick={() => setShowUpload(true)} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>+ Upload</button>
                  </div>
                  {resources.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <IconFolder c={color} size={32} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Nothing here yet!</div>
                      <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>Upload your notes, worksheets, or anything from class to get started. 🌟</div>
                      <button onClick={() => setShowUpload(true)} style={{ padding: '11px 24px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Upload Something</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {resources.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: '#FAFAF8', borderRadius: 12, border: '1.5px solid #E8E5F0' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileTypeIcon type={r.file_type} c={color} size={18} />
                          </div>
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
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>{folderDeck ? `${folderDeck.card_count} cards saved` : 'Make flashcards from your notes!'}</div>
                    </div>
                    <button onClick={() => router.push(`/brynne/flashcards?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`)} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                      {folderDeck ? 'New Deck' : 'Generate'}
                    </button>
                  </div>
                  {folderDeck ? (
                    <div onClick={() => router.push(`/brynne/flashcards`)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', background: '#FAFAF8', borderRadius: 14, border: '1.5px solid #E8E5F0', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 13, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconCards c={color} size={26} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folderDeck.title}</div>
                        <div style={{ fontSize: 11, color: '#9E9BB0' }}>{folderDeck.card_count} cards</div>
                      </div>
                      <div style={{ padding: '8px 16px', borderRadius: 999, background: color, color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Study</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <IconCards c={color} size={32} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No flashcards yet!</div>
                      <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Ascend can make flashcards from your notes — great for studying! ✨' : 'Upload your notes first, then Ascend will make flashcards for you!'}</div>
                      <button onClick={() => hasResources ? router.push(`/brynne/flashcards?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`) : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? color : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                        {hasResources ? 'Generate Flashcards' : 'Upload Notes First'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'exam' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Practice Exam</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>{folderExam ? `${folderExam.questions?.length || 0} questions · ${folderExam.status === 'completed' ? `Score: ${folderExam.score ?? 'n/a'}%` : 'In progress'}` : 'Practice before the real test!'}</div>
                    </div>
                    <button onClick={() => router.push(`/brynne/practice-exam?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`)} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>
                      {folderExam ? 'New Test' : 'Generate'}
                    </button>
                  </div>
                  {folderExam ? (
                    <div onClick={() => router.push('/brynne/practice-exam')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', background: '#FAFAF8', borderRadius: 14, border: '1.5px solid #E8E5F0', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 13, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconExam c={color} size={26} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folderExam.title}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: folderExam.status === 'completed' ? '#5FAD8E' : color, background: folderExam.status === 'completed' ? '#EDF7F2' : light, padding: '2px 8px', borderRadius: 999 }}>{folderExam.status === 'completed' ? 'Done! 🌟' : 'In Progress'}</span>
                          {folderExam.score !== null && <span style={{ fontSize: 11, fontWeight: 700, color: (folderExam.score ?? 0) >= 80 ? '#5FAD8E' : (folderExam.score ?? 0) >= 60 ? '#C8965A' : '#C47878' }}>{folderExam.score}%</span>}
                        </div>
                      </div>
                      <div style={{ padding: '8px 16px', borderRadius: 999, background: color, color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{folderExam.status === 'completed' ? 'Review' : 'Continue'}</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <IconExam c={color} size={32} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No practice test yet!</div>
                      <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Let Ascend make a practice test from your notes! ✨' : 'Upload your notes first, then Ascend will make a practice test!'}</div>
                      <button onClick={() => hasResources ? router.push(`/brynne/practice-exam?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`) : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? color : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                        {hasResources ? 'Generate Practice Test' : 'Upload Notes First'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'guide' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3 }}>Study Guide</div>
                      <div style={{ fontSize: 12, color: '#9E9BB0' }}>{folderGuide ? 'Study guide generated! 🌟' : 'Ascend builds a study guide from your notes!'}</div>
                    </div>
                    <button onClick={() => router.push(`/brynne/study?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`)} style={{ padding: '9px 18px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>
                      {folderGuide ? 'New Guide' : 'Generate'}
                    </button>
                  </div>
                  {folderGuide ? (
                    <div onClick={() => router.push(`/brynne/study?guideId=${folderGuide.id}&folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', background: '#FAFAF8', borderRadius: 14, border: '1.5px solid #E8E5F0', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 13, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconBrain c={color} size={26} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folderGuide.title}</div>
                        <div style={{ fontSize: 11, color: '#9E9BB0' }}>{new Date(folderGuide.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div style={{ padding: '8px 16px', borderRadius: 999, background: color, color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>View</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E8E5F0', borderRadius: 14 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <IconBrain c={color} size={32} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>No study guide yet!</div>
                      <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20, lineHeight: 1.6 }}>{hasResources ? 'Ascend will build you an awesome study guide from everything in this folder! 🌟' : 'Upload your notes first — then Ascend builds your study guide!'}</div>
                      <button onClick={() => hasResources ? router.push(`/brynne/study?folderId=${folderId}&folderName=${encodeURIComponent(folder.name)}`) : setTab('resources')} style={{ padding: '11px 24px', borderRadius: 999, background: hasResources ? color : '#F3F1EC', border: 'none', color: hasResources ? 'white' : '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                        {hasResources ? 'Generate Study Guide' : 'Upload Notes First'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {showUpload && (
        <UploadResourceModalInline
          student="brynne"
          folderId={folderId}
          onClose={() => setShowUpload(false)}
          onSaved={(newResource) => {
            setResources(prev => [newResource, ...prev]);
            setShowUpload(false);
          }}
        />
      )}

      <TabBar student="brynne" />
    </div>
  );
}

function UploadResourceModalInline({ student, folderId, onClose, onSaved }: {
  student: string;
  folderId: string;
  onClose: () => void;
  onSaved: (resource: Resource) => void;
}) {
  const [upType,         setUpType]         = useState('');
  const [upName,         setUpName]         = useState('');
  const [upLink,         setUpLink]         = useState('');
  const [upFile,         setUpFile]         = useState<File | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [upError,        setUpError]        = useState('');
  const [upSaved,        setUpSaved]        = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FILE_TYPES = [
    { key: 'pdf',   label: 'PDF',        accept: '.pdf' },
    { key: 'pptx',  label: 'Slides',     accept: '.pptx,.ppt' },
    { key: 'audio', label: 'Audio',      accept: '.mp3,.m4a,.wav,.ogg' },
    { key: 'image', label: 'Image',      accept: '.png,.jpg,.jpeg,.webp' },
    { key: 'link',  label: 'Link',       accept: '' },
  ];

  const selectedType = FILE_TYPES.find(f => f.key === upType);

  const reset = () => {
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

  const handleSave = async () => {
    if (!upName.trim() || !upType) return;
    setUploading(true); setUpError('');
    try {
      let storageUrl: string | null = null;
      if (upFile && upType !== 'link') {
        const ext      = upFile.name.split('.').pop();
        const safeName = upName.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
        const path     = `${student}/${folderId}/${Date.now()}_${safeName}.${ext}`;
        const progressInterval = setInterval(() => { setUploadProgress(p => Math.min(p + 12, 85)); }, 200);
        const { error: uploadError } = await supabase.storage.from('resources').upload(path, upFile, { upsert: false });
        clearInterval(progressInterval);
        setUploadProgress(100);
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(path);
        storageUrl = urlData.publicUrl;

        // Whisper transcription for audio files
        if (upType === 'audio') {
          try {
            const audioForm = new FormData();
            audioForm.append('file', upFile);
            const transcribeRes = await fetch('/api/transcribe-audio', { method: 'POST', body: audioForm });
            const transcribeData = await transcribeRes.json();
            if (transcribeData.transcript) {
              const { data } = await supabase.from('resources').insert({ folder_id: folderId, file_name: upName.trim(), file_type: 'audio', storage_url: storageUrl, transcript: transcribeData.transcript }).select().single();
              if (data) { setUpSaved(true); setTimeout(() => { onSaved(data); reset(); }, 900); }
              return;
            }
          } catch { /* fall through to normal save */ }
        }
      } else if (upType === 'link' && upLink.trim()) {
        const isYouTube = upLink.includes('youtube.com') || upLink.includes('youtu.be');
        if (isYouTube) {
          const res = await fetch('/api/fetch-youtube-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: upLink.trim() }),
          });
          const data = await res.json();
          if (data.transcript) {
            const { data: saved } = await supabase
              .from('resources')
              .insert({ folder_id: folderId, file_name: upName.trim(), file_type: 'youtube', storage_url: upLink.trim(), transcript: data.transcript })
              .select()
              .single();
            if (saved) { setUpSaved(true); setTimeout(() => { onSaved(saved); reset(); }, 900); }
            return;
          } else {
            setUpError(data.error || 'Could not fetch transcript. The video may not have captions.');
            setUploading(false);
            return;
          }
        } else {
          storageUrl = upLink.trim();
        }
      }
      const { data } = await supabase.from('resources').insert({ folder_id: folderId, file_name: upName.trim(), file_type: upType, storage_url: storageUrl }).select().single();
      if (data) { setUpSaved(true); setTimeout(() => { onSaved(data); reset(); }, 900); }
    } catch (err: any) {
      setUpError(err.message || 'Upload failed.'); setUploadProgress(0);
    } finally { setUploading(false); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) { onClose(); reset(); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 540, boxShadow: '0 8px 40px rgba(29,27,38,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Add Something</div>
        <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>What kind of file is this?</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {FILE_TYPES.map(ft => (
            <div key={ft.key} onClick={() => { setUpType(ft.key); setUpFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '12px 6px', borderRadius: 12, border: `1.5px solid ${upType === ft.key ? color : '#E8E5F0'}`, background: upType === ft.key ? light : '#FAFAF8', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
                <FileTypeIcon type={ft.key} c={upType === ft.key ? color : '#C4C1D4'} size={22} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: upType === ft.key ? color : '#9E9BB0' }}>{ft.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Name it</label>
          <input autoFocus value={upName} onChange={e => setUpName(e.target.value)} placeholder='e.g. "Chapter 7 Notes"' style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
        </div>

        {upType === 'link' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Link <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(YouTube, Google Doc, article, lecture recording)</span></label>
            <input value={upLink} onChange={e => setUpLink(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
            {(upLink.includes('youtube.com') || upLink.includes('youtu.be')) && (
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color, background: light, padding: '6px 10px', borderRadius: 8 }}>
                YouTube detected — Ascend will fetch the transcript automatically 🌟
              </div>
            )}
          </div>
        )}

        {upType && upType !== 'gdoc' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>File</label>
            <input ref={fileInputRef} type="file" accept={selectedType?.accept || '*'} onChange={handleFileChange} style={{ display: 'none' }} />
            {upFile ? (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${color}`, background: light, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileTypeIcon type={upType} c={color} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upFile.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>{(upFile.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <button onClick={() => { setUpFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = color} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E5F0'}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
                    <path d="M20 19a5 5 0 10-1-9.9A7 7 0 104 17" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M14 15v8" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M11 18l3-3 3 3" stroke="#C4C1D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
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
          <div style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 14 }}>{upError}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { onClose(); reset(); }} disabled={uploading} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!upName.trim() || !upType || uploading || upSaved || (upType === 'link' ? !upLink.trim() : false)} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: upSaved ? '#5FAD8E' : !upName.trim() || !upType ? '#F3F1EC' : color, color: !upName.trim() || !upType ? '#C4C1D4' : 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: uploading ? 0.7 : 1 }}>
            {upSaved ? 'Saved!' : uploading ? 'Uploading...' : upFile ? 'Upload & Save' : 'Save Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}