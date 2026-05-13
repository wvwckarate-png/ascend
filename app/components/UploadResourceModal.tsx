'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

type Props = {
  student: 'matthew' | 'michael' | 'brynne';
  onClose: () => void;
  onSaved?: () => void;
};

type ClassRow  = { id: string; name: string; };
type FolderRow = { id: string; name: string; exam_date: string | null; };

// ── SVG Icons ──────────────────────────────────────────────
function IconFilePDF({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="9" y1="15" x2="19" y2="15" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="9" y1="19" x2="15" y2="19" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconSlides({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="2" y="5" width="24" height="16" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="14" y1="21" x2="14" y2="25" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="10" y1="25" x2="18" y2="25" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M11 10l5 3-5 3V10z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconMic({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="10" y="3" width="8" height="13" rx="4" stroke={c} strokeWidth="1.6" fill="none"/>
      <path d="M6 15a8 8 0 0016 0" stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <line x1="14" y1="23" x2="14" y2="26" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="10" y1="26" x2="18" y2="26" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconPhoto({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <circle cx="9" cy="12" r="2" stroke={c} strokeWidth="1.4" fill="none"/>
      <path d="M3 20l6-5 4 4 3-3 6 5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLink({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M11 17l6-6" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M8 13l-2 2a4 4 0 005.7 5.7l2-2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M14 10l2-2a4 4 0 015.7 5.7l-2 2" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconExamPaper({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="7" y="3" width="14" height="22" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="10" y1="9"  x2="18" y2="9"  stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10" y1="17" x2="15" y2="17" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M16 19l1.5 1.5 3-3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconNotes({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="5" y="3" width="18" height="22" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="9" y1="9"  x2="19" y2="9"  stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="9" y1="13" x2="19" y2="13" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="9" y1="17" x2="15" y2="17" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4 20l3-1 8-8-2-2-8 8-1 3z" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconBook({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 5a2 2 0 012-2h10v22H6a2 2 0 01-2-2V5z" stroke={c} strokeWidth="1.6" fill="none"/>
      <path d="M16 3h6a2 2 0 012 2v18a2 2 0 01-2 2h-6V3z" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="16" y1="3" x2="16" y2="25" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}

function IconFolder({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <line x1="3" y1="14" x2="25" y2="14" stroke={c} strokeWidth="1.2" strokeOpacity="0.4"/>
    </svg>
  );
}

function IconPaperclip({ c, size = 22 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M21 13l-9 9a6 6 0 01-8.5-8.5l9.5-9.5a4 4 0 015.7 5.7l-9.5 9.5a2 2 0 01-2.8-2.8l8.5-8.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconCloudUpload({ c, size = 36 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M20 19a5 5 0 10-1-9.9A7 7 0 104 17" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M14 15v8" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M11 18l3-3 3 3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TypeIcon({ typeKey, c, size = 22 }: { typeKey: string; c: string; size?: number }) {
  if (typeKey === 'pdf')      return <IconFilePDF c={c} size={size} />;
  if (typeKey === 'pptx')     return <IconSlides  c={c} size={size} />;
  if (typeKey === 'audio')    return <IconMic     c={c} size={size} />;
  if (typeKey === 'image')    return <IconPhoto   c={c} size={size} />;
  if (typeKey === 'gdoc')     return <IconLink    c={c} size={size} />;
  if (typeKey === 'old_exam') return <IconExamPaper c={c} size={size} />;
  if (typeKey === 'notes')    return <IconNotes   c={c} size={size} />;
  if (typeKey === 'textbook') return <IconBook    c={c} size={size} />;
  if (typeKey === 'syllabus') return <IconFolder  c={c} size={size} />;
  return <IconPaperclip c={c} size={size} />;
}

// ── Data ───────────────────────────────────────────────────
const RESOURCE_TYPES = [
  { key: 'pdf',      label: 'PDF',        accept: '.pdf' },
  { key: 'pptx',     label: 'Slides',     accept: '.pptx,.ppt' },
  { key: 'audio',    label: 'Audio',      accept: '.mp3,.m4a,.wav,.ogg' },
  { key: 'image',    label: 'Image',      accept: '.png,.jpg,.jpeg,.webp' },
  { key: 'gdoc',     label: 'Google Doc', accept: '' },
  { key: 'old_exam', label: 'Old Exam',   accept: '.pdf,.png,.jpg,.jpeg' },
  { key: 'notes',    label: 'Notes',      accept: '.pdf,.png,.jpg,.jpeg' },
  { key: 'textbook', label: 'Textbook',   accept: '.pdf' },
  { key: 'syllabus', label: 'Syllabus',   accept: '.pdf' },
  { key: 'other',    label: 'Other',      accept: '*' },
];

function fileTypeFromKey(key: string): string {
  if (['pdf', 'old_exam', 'notes', 'textbook', 'syllabus'].includes(key)) return 'pdf';
  if (key === 'pptx')  return 'pptx';
  if (key === 'audio') return 'audio';
  if (key === 'image') return 'image';
  if (key === 'gdoc')  return 'gdoc';
  return 'pdf';
}

const accent      = (s: string) => s === 'brynne' ? '#E8956D' : '#7B6FA0';
const accentLight = (s: string) => s === 'brynne' ? '#FFF3E8' : '#EDE9F7';

// ── Component ──────────────────────────────────────────────
export default function UploadResourceModal({ student, onClose, onSaved }: Props) {
  const [step,      setStep]      = useState(1);
  const [resType,   setResType]   = useState('');
  const [classes,   setClasses]   = useState<ClassRow[]>([]);
  const [classId,   setClassId]   = useState('');
  const [folders,   setFolders]   = useState<FolderRow[]>([]);
  const [folderId,  setFolderId]  = useState('');
  const [fileName,  setFileName]  = useState('');
  const [fileLink,  setFileLink]  = useState('');
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const color = accent(student);
  const light = accentLight(student);

  const selectedType   = RESOURCE_TYPES.find(r => r.key === resType);
  const selectedClass  = classes.find(c => c.id === classId);
  const selectedFolder = folders.find(f => f.id === folderId);
  const isGdoc         = resType === 'gdoc';
  const acceptStr      = selectedType?.accept || '*';

  useEffect(() => {
    supabase.from('classes').select('id, name').eq('student_id', student).eq('is_active', true).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setClasses(data); });
  }, [student]);

  useEffect(() => {
    if (!classId) { setFolders([]); return; }
    supabase.from('exam_folders').select('id, name, exam_date').eq('class_id', classId).order('exam_date', { ascending: true })
      .then(({ data }) => { if (data) setFolders(data); });
  }, [classId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!fileName.trim()) setFileName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSave = async () => {
    if (!fileName.trim() || !folderId || !resType) return;
    setUploading(true); setError('');
    try {
      let storageUrl: string | null = null;
      if (file && !isGdoc) {
        const ext      = file.name.split('.').pop();
        const safeName = fileName.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
        const path     = `${student}/${folderId}/${Date.now()}_${safeName}.${ext}`;
        const progressInterval = setInterval(() => { setUploadProgress(p => Math.min(p + 15, 85)); }, 200);
        const { error: uploadError } = await supabase.storage.from('resources').upload(path, file, { upsert: false });
        clearInterval(progressInterval);
        setUploadProgress(100);
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(path);
        storageUrl = urlData.publicUrl;
      } else if (isGdoc && fileLink.trim()) {
        storageUrl = fileLink.trim();
      }
      await supabase.from('resources').insert({ folder_id: folderId, file_name: fileName.trim(), file_type: fileTypeFromKey(resType), storage_url: storageUrl });
      setSaved(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 900);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0',
    borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14,
    color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
  };

  const stepLabels = ['Type', 'Class', 'Folder', 'Upload'];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 540, boxShadow: '0 8px 40px rgba(29,27,38,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          {stepLabels.map((label, i) => {
            const n = i + 1; const done = step > n; const active = step === n;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: done || active ? color : '#F3F1EC', color: done || active ? 'white' : '#C4C1D4', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? color : '#C4C1D4', letterSpacing: 0.5 }}>{label}</span>
                </div>
                {n < 4 && <div style={{ width: 24, height: 2, background: done ? color : '#E8E5F0', borderRadius: 99, marginBottom: 14 }} />}
              </div>
            );
          })}
        </div>

        {/* STEP 1 — Type */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>What are you uploading?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>Pick the type that best describes this file.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {RESOURCE_TYPES.map(rt => (
                <div
                  key={rt.key}
                  onClick={() => setResType(rt.key)}
                  style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${resType === rt.key ? color : '#E8E5F0'}`, background: resType === rt.key ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                >
                  <TypeIcon typeKey={rt.key} c={resType === rt.key ? color : '#C4C1D4'} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: resType === rt.key ? color : '#1D1B26' }}>{rt.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { if (resType) setStep(2); }} disabled={!resType} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: resType ? color : '#F3F1EC', color: resType ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: resType ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>
              Continue
            </button>
          </div>
        )}

        {/* STEP 2 — Class */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Which class?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>Select the course this belongs to.</div>
            {classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>No classes found. Add a class first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {classes.map(cls => (
                  <div key={cls.id} onClick={() => { setClassId(cls.id); setFolderId(''); }} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${classId === cls.id ? color : '#E8E5F0'}`, background: classId === cls.id ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: classId === cls.id ? color : '#1D1B26' }}>{cls.name}</span>
                    {classId === cls.id && <span style={{ fontSize: 14, color }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button onClick={() => { if (classId) setStep(3); }} disabled={!classId} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: classId ? color : '#F3F1EC', color: classId ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: classId ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Folder */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Which exam folder?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>{selectedClass?.name} — pick where this belongs.</div>
            {folders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>No exam folders in this class yet. Add folders from the Class Binder first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {folders.map(f => (
                  <div key={f.id} onClick={() => setFolderId(f.id)} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${folderId === f.id ? color : '#E8E5F0'}`, background: folderId === f.id ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: folderId === f.id ? color : '#1D1B26', marginBottom: 2 }}>{f.name}</div>
                      {f.exam_date && <div style={{ fontSize: 11, color: '#9E9BB0' }}>{new Date(f.exam_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                    </div>
                    {folderId === f.id && <span style={{ fontSize: 14, color }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button onClick={() => { if (folderId) setStep(4); }} disabled={!folderId} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: folderId ? color : '#F3F1EC', color: folderId ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: folderId ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Upload */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>
              {isGdoc ? 'Add Google Doc Link' : 'Upload File'}
            </div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 4 }}>{selectedClass?.name} → {selectedFolder?.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: light, borderRadius: 999, padding: '4px 12px', marginBottom: 18 }}>
              <TypeIcon typeKey={resType} c={color} size={14} />
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{selectedType?.label}</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Name</label>
              <input autoFocus value={fileName} onChange={e => setFileName(e.target.value)} placeholder='e.g. "Lecture 8 - Krebs Cycle"' style={inputStyle} />
            </div>

            {isGdoc && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Google Doc URL</label>
                <input value={fileLink} onChange={e => setFileLink(e.target.value)} placeholder="https://docs.google.com/..." style={inputStyle} />
              </div>
            )}

            {!isGdoc && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>File</label>
                <input ref={fileInputRef} type="file" accept={acceptStr} onChange={handleFileChange} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${color}`, background: light, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TypeIcon typeKey={resType} c={color} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: '#9E9BB0' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = color}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E5F0'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                      <IconCloudUpload c="#C4C1D4" size={40} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>Tap to choose file</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0' }}>
                      {acceptStr === '*' ? 'Any file type' : acceptStr.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
                    </div>
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

            {error && (
              <div style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#C47878', fontWeight: 600, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} disabled={uploading} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button
                onClick={handleSave}
                disabled={!fileName.trim() || uploading || saved || (isGdoc ? !fileLink.trim() : false)}
                style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: saved ? '#5FAD8E' : !fileName.trim() || (isGdoc && !fileLink.trim()) ? '#F3F1EC' : color, color: !fileName.trim() || (isGdoc && !fileLink.trim()) ? '#C4C1D4' : 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: uploading ? 0.7 : 1 }}
              >
                {saved ? 'Saved!' : uploading ? 'Uploading...' : file ? 'Upload & Save' : 'Save Resource'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}