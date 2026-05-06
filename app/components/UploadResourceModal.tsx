'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Props = {
  student: 'matthew' | 'michael' | 'brynne';
  onClose: () => void;
  onSaved?: () => void;
};

type ClassRow   = { id: string; name: string; };
type FolderRow  = { id: string; name: string; exam_date: string | null; };

const RESOURCE_TYPES = [
  { key: 'lecture_notes', label: 'Lecture Notes',     icon: '📝' },
  { key: 'textbook',      label: 'Textbook Chapter',  icon: '📚' },
  { key: 'old_exam',      label: 'Old Exam / Quiz',   icon: '📋' },
  { key: 'syllabus',      label: 'Syllabus',          icon: '🗂️' },
  { key: 'handout',       label: 'Handout',           icon: '📄' },
  { key: 'audio',         label: 'Audio Recording',   icon: '🎙️' },
  { key: 'slides',        label: 'Slides / PPTX',     icon: '📊' },
  { key: 'image',         label: 'Image / Photo',     icon: '🖼️' },
  { key: 'gdoc',          label: 'Google Doc Link',   icon: '🔗' },
  { key: 'other',         label: 'Something Else',    icon: '📎' },
];

const accent = (student: string) => student === 'brynne' ? '#E8956D' : '#7B6FA0';
const accentLight = (student: string) => student === 'brynne' ? '#FFF3E8' : '#EDE9F7';

export default function UploadResourceModal({ student, onClose, onSaved }: Props) {
  const [step,       setStep]       = useState(1);
  const [resType,    setResType]    = useState('');
  const [otherDesc,  setOtherDesc]  = useState('');
  const [classes,    setClasses]    = useState<ClassRow[]>([]);
  const [classId,    setClassId]    = useState('');
  const [folders,    setFolders]    = useState<FolderRow[]>([]);
  const [folderId,   setFolderId]   = useState('');
  const [fileName,   setFileName]   = useState('');
  const [fileLink,   setFileLink]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const color = accent(student);
  const light = accentLight(student);

  // Load classes on mount
  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .eq('student_id', student)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setClasses(data); });
  }, [student]);

  // Load folders when class selected
  useEffect(() => {
    if (!classId) { setFolders([]); return; }
    supabase
      .from('exam_folders')
      .select('id, name, exam_date')
      .eq('class_id', classId)
      .order('exam_date', { ascending: true })
      .then(({ data }) => { if (data) setFolders(data); });
  }, [classId]);

  const selectedClass  = classes.find(c => c.id === classId);
  const selectedFolder = folders.find(f => f.id === folderId);
  const selectedType   = RESOURCE_TYPES.find(r => r.key === resType);

  const fileType = resType === 'lecture_notes' || resType === 'handout' || resType === 'syllabus' ? 'pdf'
    : resType === 'slides'   ? 'pptx'
    : resType === 'audio'    ? 'audio'
    : resType === 'image'    ? 'image'
    : resType === 'gdoc'     ? 'gdoc'
    : resType === 'old_exam' || resType === 'textbook' ? 'pdf'
    : 'pdf';

  const handleSave = async () => {
    if (!fileName.trim() || !folderId || !resType) return;
    setSaving(true);
    await supabase.from('resources').insert({
      folder_id:   folderId,
      file_name:   fileName.trim(),
      file_type:   fileType,
      storage_url: fileLink.trim() || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onSaved?.();
      onClose();
    }, 900);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #E8E5F0',
    borderRadius: 10,
    fontFamily: 'var(--font-jakarta)',
    fontSize: 14,
    color: '#1D1B26',
    background: '#FAFAF8',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const stepLabels = ['Type', 'Class', 'Folder', 'Details'];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Handle */}
        <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
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

        {/* STEP 1 — Resource Type */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>What are you uploading?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>Pick the type that best describes this file.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {RESOURCE_TYPES.map(rt => (
                <div
                  key={rt.key}
                  onClick={() => setResType(rt.key)}
                  style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${resType === rt.key ? color : '#E8E5F0'}`, background: resType === rt.key ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 18 }}>{rt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: resType === rt.key ? color : '#1D1B26' }}>{rt.label}</span>
                </div>
              ))}
            </div>
            {resType === 'other' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Describe it briefly</label>
<input value={otherDesc} onChange={e => setOtherDesc(e.target.value)} placeholder="e.g. a professor's annotated diagram" style={inputStyle} />              </div>
            )}
            <button
              onClick={() => { if (resType) setStep(2); }}
              disabled={!resType}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: resType ? `linear-gradient(135deg, ${color}, #5A5078)` : '#F3F1EC', color: resType ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: resType ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2 — Which Class */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Which class?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>Select the course this belongs to.</div>
            {classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>No classes found. Add a class first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {classes.map(cls => (
                  <div
                    key={cls.id}
                    onClick={() => { setClassId(cls.id); setFolderId(''); }}
                    style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${classId === cls.id ? color : '#E8E5F0'}`, background: classId === cls.id ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: classId === cls.id ? color : '#1D1B26' }}>{cls.name}</span>
                    {classId === cls.id && <span style={{ fontSize: 14, color }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button onClick={() => { if (classId) setStep(3); }} disabled={!classId} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: classId ? `linear-gradient(135deg, ${color}, #5A5078)` : '#F3F1EC', color: classId ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: classId ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Which Folder */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Which exam folder?</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 18 }}>{selectedClass?.name} — pick where this belongs.</div>
            {folders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>
                No exam folders yet in this class. Add folders from the Class Binder first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {folders.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${folderId === f.id ? color : '#E8E5F0'}`, background: folderId === f.id ? light : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
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
              <button onClick={() => { if (folderId) setStep(4); }} disabled={!folderId} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: folderId ? `linear-gradient(135deg, ${color}, #5A5078)` : '#F3F1EC', color: folderId ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: folderId ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}>Continue</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Name + Save */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 4 }}>Name this file</div>
            <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 4 }}>
              {selectedClass?.name} → {selectedFolder?.name}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: light, borderRadius: 999, padding: '3px 10px', marginBottom: 18 }}>
              <span style={{ fontSize: 14 }}>{selectedType?.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{selectedType?.label}</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>File Name</label>
              <input
                autoFocus
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && fileName.trim()) handleSave(); }}
                placeholder='e.g. "Lecture 8 - Krebs Cycle" or "Old Exam Spring 2024"'
                style={inputStyle}
              />
            </div>

            {(resType === 'gdoc') && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Google Doc Link</label>
                <input value={fileLink} onChange={e => setFileLink(e.target.value)} placeholder="https://docs.google.com/..." style={inputStyle} />
              </div>
            )}

            {resType !== 'gdoc' && (
              <div style={{ border: '2px dashed #E8E5F0', borderRadius: 12, padding: '22px', textAlign: 'center', marginBottom: 14, background: '#FAFAF8' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>☁️</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9E9BB0', marginBottom: 4 }}>File upload coming in v1.2</div>
                <div style={{ fontSize: 11, color: '#C4C1D4' }}>Save the name now — attach the file later</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button
                onClick={handleSave}
                disabled={!fileName.trim() || saving || saved}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: saved ? '#5FAD8E' : fileName.trim() ? `linear-gradient(135deg, ${color}, #5A5078)` : '#F3F1EC', color: fileName.trim() || saved ? 'white' : '#C4C1D4', fontSize: 13, fontWeight: 800, cursor: fileName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-jakarta)' }}
              >
                {saved ? '✅ Saved!' : saving ? 'Saving...' : 'Save Resource'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}