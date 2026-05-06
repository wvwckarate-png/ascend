'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import TabBar from '../components/TabBar';
import UploadResourceModal from '../components/UploadResourceModal';

type Class = { id: string; name: string; semester: string; professor: string | null; class_time: string | null; class_format: string | null; };
type StudyGuide = { id: string; title: string; source_filename: string; created_at: string; };
type Task = { id: string; title: string; due_date: string; due_time: string | null; completed: boolean; class_name: string | null; task_type: string; };

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconStudyGuide() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="3" width="14" height="19" rx="2" stroke="#E8956D" strokeWidth="1.6" fill="none"/>
      <line x1="8" y1="8"  x2="16" y2="8"  stroke="#E8956D" strokeWidth="1.2"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="#E8956D" strokeWidth="1.2"/>
      <line x1="8" y1="16" x2="13" y2="16" stroke="#E8956D" strokeWidth="1.2"/>
      <circle cx="20" cy="20" r="5" stroke="#E8956D" strokeWidth="1.4" fill="none"/>
      <path d="M18.5 20c0-1 .7-1.8 1.5-1.8s1.5.8 1.5 1.8c0 .7-.4 1.2-1.5 1.8v.7" stroke="#E8956D" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="20" cy="23.5" r=".6" fill="#E8956D"/>
    </svg>
  );
}

function IconCards() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="8" width="16" height="12" rx="2" stroke="#E8956D" strokeWidth="1.6" fill="none"/>
      <rect x="8" y="5" width="16" height="12" rx="2" stroke="#E8956D" strokeWidth="1.6" fill="#FFF3E8" strokeOpacity="0.7"/>
      <line x1="11" y1="11" x2="21" y2="11" stroke="#E8956D" strokeWidth="1.2" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconExam() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="7" y="3" width="14" height="22" rx="2" stroke="#C8965A" strokeWidth="1.6" fill="none"/>
      <line x1="10" y1="9"  x2="18" y2="9"  stroke="#C8965A" strokeWidth="1.2"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke="#C8965A" strokeWidth="1.2"/>
      <line x1="10" y1="17" x2="15" y2="17" stroke="#C8965A" strokeWidth="1.2"/>
      <path d="M16 19l1.5 1.5 3-3" stroke="#C8965A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 5v14" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 10l5-5 5 5" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 20h18" stroke="#E8956D" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

const CLASS_COLORS = ['#E8956D', '#C4A882', '#D4845A', '#C8965A', '#E0A882', '#D49E6D'];

function classLabel(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('physics'))   return 'PHY';
  if (n.includes('biology'))   return 'BIO';
  if (n.includes('chemistry')) return 'CHM';
  if (n.includes('algebra') || n.includes('math')) return 'MTH';
  if (n.includes('english'))   return 'ENG';
  if (n.includes('science'))   return 'SCI';
  if (n.includes('sat') || n.includes('act')) return 'SAT';
  if (n.includes('history'))   return 'HIS';
  if (n.includes('spanish') || n.includes('french') || n.includes('latin')) return 'LNG';
  return name.slice(0, 3).toUpperCase();
}

function typeColor(type: string) {
  if (type === 'review')     return '#E8956D';
  if (type === 'exam')       return '#C47878';
  if (type === 'quiz')       return '#C8965A';
  if (type === 'assignment') return '#5FAD8E';
  if (type === 'reading')    return '#6B7FA0';
  if (type === 'paper')      return '#9B8EC4';
  if (type === 'project')    return '#C8965A';
  return '#9E9BB0';
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DAYS_SHORT = ['S','M','T','W','T','F','S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function BrynneDashboard() {
  const router   = useRouter();
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [classes,    setClasses]    = useState<Class[]>([]);
  const [guides,     setGuides]     = useState<StudyGuide[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [calView,    setCalView]    = useState<'week' | 'month'>('week');
  const [calMonth,   setCalMonth]   = useState(today.getMonth());
  const [calYear,    setCalYear]    = useState(today.getFullYear());
  const [showUpload, setShowUpload] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return d;
  });

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: classData }, { data: guideData }, { data: taskData }] = await Promise.all([
        supabase.from('classes').select('*').eq('student_id', 'brynne').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('study_guides').select('*').eq('student_id', 'brynne').order('created_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('*').eq('student_id', 'brynne').order('due_date', { ascending: true }),
      ]);
      if (classData) setClasses(classData);
      if (guideData) setGuides(guideData);
      if (taskData)  setTasks(taskData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study guide?')) return;
    setDeletingId(id);
    await supabase.from('study_guides').delete().eq('id', id);
    setGuides(guides.filter(g => g.id !== id));
    setDeletingId(null);
  };

  const tasksForDate  = (dateStr: string) => tasks.filter(t => t.due_date === dateStr);
  const daysInMonth   = getDaysInMonth(calYear, calMonth);
  const firstDay      = getFirstDayOfMonth(calYear, calMonth);
  const prevMonth     = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth     = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const reviewsToday  = tasks.filter(t => t.task_type === 'review' && t.due_date === todayStr && !t.completed);
  const upcomingTasks = tasks.filter(t => t.task_type !== 'review' && !t.completed).slice(0, 6);
  const recentlyDone  = tasks.filter(t => t.completed).slice(0, 3);

  const DayCell = ({ dateStr, label, isToday }: { dateStr: string; label: string | number; isToday: boolean; }) => {
    const dayTasks      = tasksForDate(dateStr);
    const hasIncomplete = dayTasks.some(t => !t.completed);
    const hasCompleted  = dayTasks.some(t => t.completed);
    return (
      <div onClick={() => router.push('/brynne/calendar')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#E8956D' : 'transparent' }}>
          <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 400, color: isToday ? 'white' : '#1D1B26' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, minHeight: 6 }}>
          {hasIncomplete && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E8956D' }} />}
          {hasCompleted  && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#5FAD8E' }} />}
        </div>
      </div>
    );
  };

  const TaskRow = ({ task }: { task: Task }) => (
    <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '13px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', alignItems: 'center', gap: 12, opacity: task.completed ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      <button
        onClick={() => toggleTask(task)}
        style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: task.completed ? '#9E9BB0' : '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.class_name && <span style={{ fontSize: 11, color: '#E8956D', fontWeight: 600 }}>{task.class_name}</span>}
          {task.due_time   && <span style={{ fontSize: 11, color: '#9E9BB0' }}>{formatTime(task.due_time)}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: typeColor(task.task_type), background: typeColor(task.task_type) + '18', padding: '2px 8px', borderRadius: 999 }}>
            {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#C8965A', flexShrink: 0 }}>
        {formatDate(task.due_date)}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', borderRadius: 999, background: '#FFF3E8' }}>
          <Image src="/dragon.png" alt="Brynne" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#C4A882' }}>Brynne</span>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D1B26', letterSpacing: '-1px', marginBottom: 4 }}>Hey, Brynne! 🌟</div>
          <div style={{ fontSize: 13, color: '#9E9BB0' }}>Future WVU Physician · Keep going!</div>
        </div>

        {/* Mini Calendar */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {calView === 'month' && (
                <>
                  <button onClick={prevMonth} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 12, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26' }}>{MONTHS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 12, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                </>
              )}
              {calView === 'week' && <span style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26' }}>This Week</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: '#F3F1EC', borderRadius: 8, padding: 2, gap: 2 }}>
                {(['week', 'month'] as const).map(v => (
                  <button key={v} onClick={() => setCalView(v)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: calView === v ? '#FFFFFF' : 'transparent', color: calView === v ? '#E8956D' : '#9E9BB0', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', boxShadow: calView === v ? '0 1px 3px rgba(29,27,38,0.08)' : 'none', textTransform: 'capitalize' }}>{v}</button>
                ))}
              </div>
              <Link href="/brynne/calendar" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 700, color: '#E8956D' }}>Open →</Link>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {DAYS_SHORT.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 0.5 }}>{d}</div>)}
          </div>
          {calView === 'week' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {weekDays.map((d, i) => <DayCell key={i} dateStr={d.toISOString().split('T')[0]} label={d.getDate()} isToday={d.toISOString().split('T')[0] === todayStr} />)}
            </div>
          )}
          {calView === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                return <DayCell key={day} dateStr={dateStr} label={day} isToday={dateStr === todayStr} />;
              })}
            </div>
          )}
        </div>

        {/* Spaced Repetition Band */}
        {reviewsToday.length > 0 && (
          <div style={{ borderRadius: 18, padding: '20px 22px', marginBottom: 16, color: 'white', background: 'linear-gradient(135deg, #E8956D, #C4A882)', boxShadow: '0 6px 28px rgba(232,149,109,0.28)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>Review Time — Due Today</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 13 }}>
              {reviewsToday.length} review{reviewsToday.length !== 1 ? 's' : ''} ready for you! 🌟
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {reviewsToday.map(r => (
                <div key={r.id} onClick={() => toggleTask(r)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '6px 13px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: r.completed ? 'line-through' : 'none', opacity: r.completed ? 0.5 : 1 }}>
                  {r.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Classes — tiled */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>My Classes</div>
          <Link href="/brynne/add-class" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#E8956D', background: '#FFF3E8', padding: '4px 12px', borderRadius: 999 }}>+ Add Class</span>
          </Link>
        </div>
        {loading ? (
          <p style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 16 }}>Loading...</p>
        ) : classes.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 16 }}>No classes yet! Ask Dad to help you add your first one. 😊</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, marginBottom: 20 }}>
            {classes.map((cls, i) => {
              const color = CLASS_COLORS[i % CLASS_COLORS.length];
              return (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/brynne/classes/${cls.id}`)}
                  style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(232,149,109,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(29,27,38,0.06)'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color, marginBottom: 10 }}>
                    {classLabel(cls.name)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 3, lineHeight: 1.3 }}>{cls.name}</div>
                  <div style={{ fontSize: 10, color: '#9E9BB0' }}>{cls.semester || cls.professor || ''}</div>
                  <div style={{ height: 2, borderRadius: 99, background: '#FFF3E8', marginTop: 10 }} />
                </div>
              );
            })}
            <div
              onClick={() => router.push('/brynne/add-class')}
              style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 16, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', opacity: 0.5, minHeight: 100 }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.5'}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FFF3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#E8956D', marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>Add a Class</div>
            </div>
          </div>
        )}

        {/* Tasks */}
        {(upcomingTasks.length > 0 || recentlyDone.length > 0) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>Upcoming Tasks</div>
              <Link href="/brynne/calendar" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 700, color: '#E8956D' }}>View All →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTasks.map(task => <TaskRow key={task.id} task={task} />)}
              {recentlyDone.map(task  => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        )}

        {/* Study Tools — 4 across */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Study Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          <Link href="/brynne/study" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 12px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconStudyGuide /></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Study Guide</div>
              <div style={{ fontSize: 10, color: '#9E9BB0' }}>Generate ✨</div>
            </div>
          </Link>
          <Link href="/brynne/flashcards" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 12px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconCards /></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Flashcards</div>
              <div style={{ fontSize: 10, color: '#9E9BB0' }}>Study a deck</div>
            </div>
          </Link>
          <Link href="/brynne/practice-exam" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 12px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconExam /></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Practice Quiz</div>
              <div style={{ fontSize: 10, color: '#9E9BB0' }}>Test yourself 📝</div>
            </div>
          </Link>
          <div onClick={() => setShowUpload(true)} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px 12px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><IconUpload /></div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Upload</div>
            <div style={{ fontSize: 10, color: '#9E9BB0' }}>Resources 📎</div>
          </div>
        </div>

        {/* Recent Study Guides */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 16, marginTop: 0 }}>My Study Guides 📖</h2>
          {loading ? (
            <p style={{ fontSize: 13, color: '#9E9BB0', margin: 0 }}>Loading...</p>
          ) : guides.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9E9BB0', margin: 0 }}>Your study guides will show up here! 📖</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guides.map((guide) => (
                <div key={guide.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: '#FAFAF8', border: '1px solid #E8E5F0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guide.title}</div>
                    <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 2 }}>{new Date(guide.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => handleDelete(guide.id)} disabled={deletingId === guide.id} style={{ marginLeft: 12, fontSize: 11, fontWeight: 700, color: '#9E9BB0', background: '#E8E5F0', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', opacity: deletingId === guide.id ? 0.3 : 1 }}>
                    {deletingId === guide.id ? '...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showUpload && (
        <UploadResourceModal student="brynne" onClose={() => setShowUpload(false)} />
      )}

      <TabBar student="brynne" />
    </div>
  );
}