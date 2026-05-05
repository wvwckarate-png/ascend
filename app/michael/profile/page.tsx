'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
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

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C4C1D4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

const stats = [
  { label: 'Study Guides', value: '—' },
  { label: 'Flashcard Decks', value: '—' },
  { label: 'Exams Taken', value: '—' },
  { label: 'Day Streak', value: '—' },
];

export default function MichaelProfile() {
  const [name, setName] = useState('Michael');
  const [grade, setGrade] = useState('Incoming 9th Grade');
  const [focus, setFocus] = useState('WVU School of Medicine');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('students').select('name, grade, focus').eq('id', 'michael').single();
      if (data) {
        if (data.name) setName(data.name);
        if (data.grade) setGrade(data.grade);
        if (data.focus) setFocus(data.focus);
      }
    };
    load();
  }, []);

  const startEdit = (field: string, current: string) => {
    setEditingField(field);
    setDraft(current);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft('');
  };

  const saveField = async (field: string) => {
    if (!draft.trim()) return;
    setSaving(true);
    await supabase.from('students').update({ [field]: draft.trim() }).eq('id', 'michael');
    if (field === 'name') setName(draft.trim());
    if (field === 'grade') setGrade(draft.trim());
    if (field === 'focus') setFocus(draft.trim());
    setSaving(false);
    setEditingField(null);
    setDraft('');
    setSavedField(field);
    setTimeout(() => setSavedField(null), 2000);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #7B6FA0',
    borderRadius: 10,
    fontFamily: 'var(--font-jakarta)',
    fontSize: 14,
    color: '#1D1B26',
    background: '#FAFAF8',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const saveBtn = (field: string) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button
        onClick={() => saveField(field)}
        disabled={saving || !draft.trim()}
        style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: saving || !draft.trim() ? 0.5 : 1 }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={cancelEdit}
        style={{ padding: '8px 18px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/michael" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 100, height: 100, marginBottom: 16 }}>
            <Image src="/lion.png" alt="Michael" width={100} height={100} style={{ objectFit: 'contain', transform: 'scaleX(-1)' }} />
          </div>

          {/* Name */}
          {editingField === 'name' ? (
            <div style={{ width: '100%', maxWidth: 320, textAlign: 'left', marginBottom: 8 }}>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center' }} />
              {saveBtn('name')}
            </div>
          ) : (
            <div onClick={() => startEdit('name', name)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>{name}</div>
              <EditIcon />
            </div>
          )}
          {savedField === 'name' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginBottom: 4 }}>✅ Saved!</div>}

          {/* Grade / School */}
          {editingField === 'grade' ? (
            <div style={{ width: '100%', maxWidth: 320, textAlign: 'left', marginBottom: 8 }}>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} style={inputStyle} />
              {saveBtn('grade')}
            </div>
          ) : (
            <div onClick={() => startEdit('grade', grade)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{grade}</div>
              <EditIcon />
            </div>
          )}
          {savedField === 'grade' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginBottom: 4 }}>✅ Saved!</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '4px 12px', borderRadius: 999, background: '#EDE9F7', fontSize: 11, fontWeight: 700, color: '#7B6FA0' }}>Pre-Med</div>
            <div style={{ padding: '4px 12px', borderRadius: 999, background: '#EDE9F7', fontSize: 11, fontWeight: 700, color: '#7B6FA0' }}>WVU School of Medicine</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Activity</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#7B6FA0', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Goal */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Goal</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          {editingField === 'focus' ? (
            <div>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} style={inputStyle} />
              {saveBtn('focus')}
            </div>
          ) : (
            <div onClick={() => startEdit('focus', focus)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>{focus}</div>
                <div style={{ fontSize: 13, color: '#9E9BB0', lineHeight: 1.6 }}>Pre-Med track. MCAT groundwork starting early.</div>
              </div>
              <div style={{ marginLeft: 12, flexShrink: 0 }}><EditIcon /></div>
            </div>
          )}
          {savedField === 'focus' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginTop: 8 }}>✅ Saved!</div>}
        </div>

        {/* Settings */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Settings</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid #E8E5F0', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>PIN Protection</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Managed by Parent Dashboard</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5FAD8E', background: '#EDF7F2', padding: '4px 10px', borderRadius: 999 }}>Active</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 2 }}>Notifications</div>
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Coming in v2.0</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '4px 10px', borderRadius: 999 }}>Soon</div>
          </div>
        </div>
      </main>
      <TabBar student="michael" />
    </div>
  );
}