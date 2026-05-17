'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Props = { student: 'matthew' | 'michael' | 'brynne'; };

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="8" cy="14" r="1" fill="currentColor"/>
      <circle cx="12" cy="14" r="1" fill="currentColor"/>
      <circle cx="16" cy="14" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconClasses() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 19V7L12 3L20 7V19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <rect x="9" y="13" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M4 7L12 11L20 7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M4 20C4 17 7.6 15 12 15C16.4 15 20 17 20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

const TASK_TYPES = ['Assignment', 'Quiz', 'Reading', 'Paper', 'Project', 'Task', 'Other'];
const STUDENT_COLOR: Record<string, string> = {
  matthew: '#7B6FA0',
  michael: '#7B6FA0',
  brynne:  '#E8956D',
};

const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 5, display: 'block' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none' };

export default function TabBar({ student }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState<{id: string; name: string}[]>([]);
  const [cls, setCls] = useState('');
  const [type, setType] = useState('Assignment');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showModal) {
      supabase.from('classes').select('id, name').eq('student_id', student).eq('is_active', true).then(({ data }) => {
        if (data) setClasses(data);
      });
    }
  }, [showModal, student]);

  const leftTabs = [
    { label: 'Home', href: `/${student}`, icon: IconHome },
    { label: 'Calendar', href: `/${student}/calendar`, icon: IconCalendar },
  ];

  const rightTabs = [
    { label: 'Classes', href: `/${student}/classes`, icon: IconClasses },
    { label: 'Profile', href: `/${student}/profile`, icon: IconProfile },
  ];

  const isActive = (href: string) => {
    if (href === `/${student}`) return pathname === `/${student}`;
    return pathname.startsWith(href);
  };

  const tabStyle = (href: string) => ({
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    padding: '6px 16px',
    borderRadius: 12,
    color: isActive(href) ? STUDENT_COLOR[student] : '#C4C1D4',
    transition: 'color 0.15s',
    flex: 1,
  });

  const reset = () => {
    setTitle(''); setDate(new Date().toISOString().split('T')[0]);
    setTime(''); setCls(''); setType('Assignment');
    setSaved(false); setSaving(false); setError('');
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('tasks').insert({
      student_id: student,
      title: title.trim(),
      due_date: date,
      due_time: time || null,
      class_name: cls || null,
      task_type: type.toLowerCase(),
      completed: false,
    });
    if (insertError) {
      setError('Could not save task. Please try again.');
      setSaving(false);
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setShowModal(false);
      reset();
      window.location.reload();
    }, 800);
  };

  return (
    <>
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); reset(); }}}
          style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.45)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '20px 18px 36px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.12)' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', marginBottom: 16 }}>Quick Add Task</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Class</label>
                <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Select...</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Task Name</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSave(); }}
                placeholder="What needs to get done?"
                autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Due Time (optional)</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: '#C47878', marginBottom: 12, fontWeight: 600 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => { setShowModal(false); reset(); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={!title.trim() || saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: saved ? '#5FAD8E' : student === 'brynne' ? '#E8956D' : 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !title.trim() ? 0.4 : 1 }}>
                {saved ? '✅ Added!' : saving ? 'Saving...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'rgba(250,250,248,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid #E8E5F0', display: 'flex', alignItems: 'center',
        justifyContent: 'space-around', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {leftTabs.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} style={tabStyle(href)}>
            <Icon />
            <span style={{ fontSize: 9, fontWeight: isActive(href) ? 800 : 600, letterSpacing: 0.3, fontFamily: 'var(--font-jakarta)' }}>{label}</span>
          </Link>
        ))}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: 48, height: 48, borderRadius: '50%', border: 'none',
              background: student === 'brynne' ? '#E8956D' : 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: student === 'brynne' ? '0 4px 16px rgba(232,149,109,0.4)' : '0 4px 16px rgba(123,111,160,0.4)', marginBottom: 12, padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="10" y1="4" x2="10" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {rightTabs.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} style={tabStyle(href)}>
            <Icon />
            <span style={{ fontSize: 9, fontWeight: isActive(href) ? 800 : 600, letterSpacing: 0.3, fontFamily: 'var(--font-jakarta)' }}>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}