'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

const students = [
  { id: 'matthew', name: 'Matthew', grade: 'Junior · 11th Grade', goal: 'WVU School of Dentistry', avatar: '/eagle.png', flip: false },
  { id: 'michael', name: 'Michael', grade: 'Incoming 9th Grade', goal: 'WVU School of Medicine', avatar: '/lion.png', flip: true },
  { id: 'brynne',  name: 'Brynne',  grade: '5th Grade',          goal: 'Future WVU Physician',  avatar: '/dragon.png', flip: false },
];

export default function ParentDashboard() {
  const [pins, setPins] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPins = async () => {
      const { data } = await supabase.from('students').select('id, pin');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(s => { map[s.id] = s.pin || ''; });
        setPins(map);
      }
    };
    fetchPins();
  }, []);

  const handleSavePin = async (studentId: string) => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('students')
      .update({ pin: newPin })
      .eq('id', studentId);
    if (updateError) {
      setError('Could not save PIN. Please try again.');
    } else {
      setPins(p => ({ ...p, [studentId]: newPin }));
      setSaved(studentId);
      setEditing(null);
      setNewPin('');
      setTimeout(() => setSaved(null), 2000);
    }
    setSaving(false);
  };

  const handleRemovePin = async (studentId: string) => {
    setSaving(true);
    await supabase.from('students').update({ pin: null }).eq('id', studentId);
    setPins(p => ({ ...p, [studentId]: '' }));
    setSaving(false);
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
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: '#FFFFFF' }}>← Back</span>
        </Link>
      </nav>

      {/* Header band */}
      <div style={{ background: 'linear-gradient(135deg, #1D1B26, #3A3545)', padding: '28px 20px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Parent View</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.8px', marginBottom: 4 }}>Welcome, Gregory.</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Manage your students and their access.</div>
        </div>
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Student cards */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>Students</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {students.map((s) => (
            <div key={s.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: editing === s.id ? 16 : 0 }}>
                <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Image src={s.avatar} alt={s.name} width={52} height={52} style={{ objectFit: 'contain', transform: s.flip ? 'scaleX(-1)' : 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 2 }}>{s.grade}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pins[s.id] ? '#5FAD8E' : '#C4C1D4' }}>
                    {pins[s.id] ? '🔒 PIN set' : '🔓 No PIN'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditing(editing === s.id ? null : s.id); setNewPin(''); setError(''); }}
                    style={{ padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: editing === s.id ? '#EDE9F7' : '#FAFAF8', color: editing === s.id ? '#7B6FA0' : '#6B6880', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                  >
                    {pins[s.id] ? 'Change PIN' : 'Set PIN'}
                  </button>
                  {pins[s.id] && (
                    <button
                      onClick={() => handleRemovePin(s.id)}
                      style={{ padding: '6px 14px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#C47878', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {editing === s.id && (
                <div style={{ borderTop: '1px solid #E8E5F0', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0', marginBottom: 10 }}>
                    Enter a 4-digit PIN for {s.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="number"
                      maxLength={4}
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.slice(0, 4))}
                      placeholder="••••"
                      style={{ width: 100, padding: '10px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 18, color: '#1D1B26', background: '#FAFAF8', outline: 'none', letterSpacing: 6, textAlign: 'center' }}
                    />
                    <button
                      onClick={() => handleSavePin(s.id)}
                      disabled={saving || newPin.length !== 4}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: newPin.length !== 4 || saving ? 0.4 : 1 }}
                    >
                      {saving ? 'Saving...' : 'Save PIN'}
                    </button>
                    {saved === s.id && <span style={{ fontSize: 13, color: '#5FAD8E', fontWeight: 700 }}>✅ Saved!</span>}
                  </div>
                  {error && <p style={{ fontSize: 12, color: '#C47878', marginTop: 8 }}>{error}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Activity placeholder */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 14 }}>Recent Activity</div>
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <p style={{ fontSize: 13, color: '#9E9BB0' }}>Study activity across all three students will appear here as they use Ascend.</p>
        </div>
      </main>
    </div>
  );
}