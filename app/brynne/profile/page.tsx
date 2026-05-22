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

const color = '#E8956D';
const light = '#FFF3E8';

export default function BrynneProfile() {
  const [name,              setName]              = useState('Brynne');
  const [grade,             setGrade]             = useState('5th Grade');
  const [focus,             setFocus]             = useState('Future WVU Physician');
  const [track,             setTrack]             = useState('Pre-Med');
  const [bio,               setBio]               = useState('Already crushing high school Algebra in 5th grade. The Dragon is just getting started! 🐉');
  const [targetSchool,      setTargetSchool]      = useState('WVU');
  const [targetProgram,     setTargetProgram]     = useState('WVU School of Medicine');
  const [gradYear,          setGradYear]          = useState('2033');
  const [generationProfile, setGenerationProfile] = useState('');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft,        setDraft]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [savedField,   setSavedField]   = useState<string | null>(null);

  const [statGuides, setStatGuides] = useState<number | null>(null);
  const [statDecks,  setStatDecks]  = useState<number | null>(null);
  const [statExams,  setStatExams]  = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('students').select('name, grade, focus, track, bio, target_school, target_program, grad_year, generation_profile').eq('id', 'brynne').single();
      if (data) {
        if (data.name)               setName(data.name);
        if (data.grade)              setGrade(data.grade);
        if (data.focus)              setFocus(data.focus);
        if (data.track)              setTrack(data.track);
        if (data.bio)                setBio(data.bio);
        if (data.target_school)      setTargetSchool(data.target_school);
        if (data.target_program)     setTargetProgram(data.target_program);
        if (data.grad_year)          setGradYear(String(data.grad_year));
        if (data.generation_profile) setGenerationProfile(data.generation_profile);
      }
      const [{ count: guides }, { count: decks }, { count: exams }] = await Promise.all([
        supabase.from('study_guides').select('id', { count: 'exact', head: true }).eq('student_id', 'brynne'),
        supabase.from('flashcard_decks').select('id', { count: 'exact', head: true }).eq('student_id', 'brynne'),
        supabase.from('practice_exams').select('id', { count: 'exact', head: true }).eq('student_id', 'brynne'),
      ]);
      setStatGuides(guides ?? 0);
      setStatDecks(decks ?? 0);
      setStatExams(exams ?? 0);
    };
    load();
  }, []);

  const startEdit  = (field: string, current: string) => { setEditingField(field); setDraft(current); };
  const cancelEdit = () => { setEditingField(null); setDraft(''); };

  const saveField = async (field: string) => {
    if (!draft.trim()) return;
    setSaving(true);
    const value = field === 'grad_year' ? parseInt(draft.trim()) : draft.trim();
    await supabase.from('students').update({ [field]: value }).eq('id', 'brynne');
    if (field === 'name')               setName(draft.trim());
    if (field === 'grade')              setGrade(draft.trim());
    if (field === 'focus')              setFocus(draft.trim());
    if (field === 'track')              setTrack(draft.trim());
    if (field === 'bio')                setBio(draft.trim());
    if (field === 'target_school')      setTargetSchool(draft.trim());
    if (field === 'target_program')     setTargetProgram(draft.trim());
    if (field === 'grad_year')          setGradYear(draft.trim());
    if (field === 'generation_profile') setGenerationProfile(draft.trim());
    setSaving(false);
    setEditingField(null);
    setDraft('');
    setSavedField(field);
    setTimeout(() => setSavedField(null), 2000);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${color}`,
    borderRadius: 10,
    fontFamily: 'var(--font-jakarta)',
    fontSize: 14,
    color: '#1D1B26',
    background: '#FAFAF8',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const SaveButtons = ({ field }: { field: string }) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button onClick={() => saveField(field)} disabled={saving || !draft.trim()} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: color, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: saving || !draft.trim() ? 0.5 : 1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={cancelEdit} style={{ padding: '8px 18px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
        Cancel
      </button>
    </div>
  );

  const stats = [
    { label: 'Study Guides',    value: statGuides },
    { label: 'Flashcard Decks', value: statDecks  },
    { label: 'Exams Taken',     value: statExams  },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/brynne" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 100, height: 100, marginBottom: 16 }}>
            <Image src="/dragon.png" alt="Brynne" width={100} height={100} style={{ objectFit: 'contain' }} />
          </div>

          {/* Name */}
          {editingField === 'name' ? (
            <div style={{ width: '100%', maxWidth: 320, textAlign: 'left', marginBottom: 8 }}>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('name'); if (e.key === 'Escape') cancelEdit(); }} style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center' }} />
              <SaveButtons field="name" />
            </div>
          ) : (
            <div onClick={() => startEdit('name', name)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>{name}</div>
              <EditIcon />
            </div>
          )}
          {savedField === 'name' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginBottom: 4 }}>✅ Saved!</div>}

          {/* Grade */}
          {editingField === 'grade' ? (
            <div style={{ width: '100%', maxWidth: 320, textAlign: 'left', marginBottom: 8 }}>
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('grade'); if (e.key === 'Escape') cancelEdit(); }} style={inputStyle} />
              <SaveButtons field="grade" />
            </div>
          ) : (
            <div onClick={() => startEdit('grade', grade)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{grade}</div>
              <EditIcon />
            </div>
          )}
          {savedField === 'grade' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginBottom: 4 }}>✅ Saved!</div>}

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Track */}
            {editingField === 'track' ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('track'); if (e.key === 'Escape') cancelEdit(); }} placeholder="e.g. Pre-Med" style={inputStyle} />
                <SaveButtons field="track" />
              </div>
            ) : (
              <div onClick={() => startEdit('track', track)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: light, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{track}</div>
                <EditIcon />
              </div>
            )}

            {/* Target School */}
            {editingField === 'target_school' ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('target_school'); if (e.key === 'Escape') cancelEdit(); }} placeholder="e.g. WVU" style={inputStyle} />
                <SaveButtons field="target_school" />
              </div>
            ) : (
              <div onClick={() => startEdit('target_school', targetSchool)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: light, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{targetSchool}</div>
                <EditIcon />
              </div>
            )}

            {/* Target Program */}
            {editingField === 'target_program' ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('target_program'); if (e.key === 'Escape') cancelEdit(); }} placeholder="e.g. WVU School of Medicine" style={inputStyle} />
                <SaveButtons field="target_program" />
              </div>
            ) : (
              <div onClick={() => startEdit('target_program', targetProgram)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: light, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{targetProgram}</div>
                <EditIcon />
              </div>
            )}

            {/* Grad Year */}
            {editingField === 'grad_year' ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveField('grad_year'); if (e.key === 'Escape') cancelEdit(); }} placeholder="e.g. 2033" style={inputStyle} />
                <SaveButtons field="grad_year" />
              </div>
            ) : (
              <div onClick={() => startEdit('grad_year', gradYear)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: '#F3F1EC', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9BB0' }}>Class of {gradYear}</div>
                <EditIcon />
              </div>
            )}
          </div>
          {(savedField === 'track' || savedField === 'target_school' || savedField === 'target_program' || savedField === 'grad_year' || savedField === 'focus') && (
            <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginTop: 6 }}>✅ Saved!</div>
          )}
        </div>

        {/* Stats */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Activity</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '18px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>
                {s.value === null ? <span style={{ fontSize: 16, color: '#C4C1D4' }}>…</span> : s.value}
              </div>
              <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Generation Profile */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 6 }}>Generation Profile</div>
        <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 12, lineHeight: 1.5 }}>
          This helps Ascend make study guides, flashcards, and practice exams just for you! Tell it how you learn best. 🌟
        </div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          {editingField === 'generation_profile' ? (
            <div>
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={5}
                placeholder='e.g. "I learn best with examples and pictures. I like when things are explained step by step. Math is my favorite subject!"'
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
              <SaveButtons field="generation_profile" />
            </div>
          ) : (
            <div onClick={() => startEdit('generation_profile', generationProfile)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, color: generationProfile ? '#9E9BB0' : '#C4C1D4', lineHeight: 1.6, flex: 1, fontStyle: generationProfile ? 'normal' : 'italic' }}>
                {generationProfile || 'Tap to tell Ascend how you learn best! 🌟'}
              </div>
              <div style={{ marginLeft: 12, flexShrink: 0, marginTop: 2 }}><EditIcon /></div>
            </div>
          )}
          {savedField === 'generation_profile' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginTop: 8 }}>✅ Saved!</div>}
        </div>

        {/* About */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>About</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          {editingField === 'bio' ? (
            <div>
              <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              <SaveButtons field="bio" />
            </div>
          ) : (
            <div onClick={() => startEdit('bio', bio)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, color: '#9E9BB0', lineHeight: 1.6, flex: 1 }}>{bio}</div>
              <div style={{ marginLeft: 12, flexShrink: 0, marginTop: 2 }}><EditIcon /></div>
            </div>
          )}
          {savedField === 'bio' && <div style={{ fontSize: 11, color: '#5FAD8E', fontWeight: 700, marginTop: 8 }}>✅ Saved!</div>}
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
              <div style={{ fontSize: 11, color: '#9E9BB0' }}>Coming soon</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C4C1D4', background: '#F3F1EC', padding: '4px 10px', borderRadius: 999 }}>Soon</div>
          </div>
        </div>
      </main>
      <TabBar student="brynne" />
    </div>
  );
}