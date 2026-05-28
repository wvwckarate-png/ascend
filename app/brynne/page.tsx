'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../components/TabBar';
import UploadResourceModal from '../components/UploadResourceModal';
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

function IconBrain({ c }: { c: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <path d="M4 6c5 0 8 2 10 4C16 8 19 6 24 6v16c-5 0-8 2-10 4C12 24 9 22 4 22V6z" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="14" y1="10" x2="14" y2="24" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M19 11l-2 3h3l-2 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCards({ c }: { c: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="8" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <rect x="8" y="5" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="#FFF3E8" strokeOpacity="0.7"/>
      <line x1="11" y1="11" x2="21" y2="11" stroke={c} strokeWidth="1.2" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconExam({ c }: { c: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <rect x="7" y="3" width="14" height="22" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="10" y1="9"  x2="18" y2="9"  stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="13" x2="18" y2="13" stroke={c} strokeWidth="1.2"/>
      <line x1="10" y1="17" x2="15" y2="17" stroke={c} strokeWidth="1.2"/>
      <path d="M16 19l1.5 1.5 3-3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUpload({ c }: { c: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <path d="M14 5v14" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 10l5-5 5 5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 20h18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

type Task      = { id: string; title: string; due_date: string; due_time: string | null; completed: boolean; class_name: string | null; task_type: string; resource_id?: string | null; resource_type?: string | null; };
type ClassRow  = { id: string; name: string; semester: string; professor: string | null; };
type ExamEvent = { id: string; name: string; exam_date: string; class_name: string; };

const color = '#E8956D';
const light = '#FFF3E8';

const QUOTES = [
  { text: "Everything you learn is one more thing you know.", author: "Michael D. Peters, DVM" },
  { text: "No one cares. Work harder.", author: "Cameron Hanes" },
  { text: "You were worth building this.", author: "Dad" },
  { text: "You were not born to be average. Work like you matter.", author: null },
  { text: "If you did absolutely everything you were capable of, you can be proud of your performance. Accept nothing less.", author: null },
  { text: "Stay hard.", author: "David Goggins" },
  { text: "You have to be willing to go to war with yourself and create a whole new identity.", author: "David Goggins" },
  { text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.", author: "David Goggins" },
  { text: "The only way to get to the other side of this journey is by suffering. You have to suffer in order to grow.", author: "David Goggins" },
  { text: "Self discipline is what separates the good from the truly great.", author: "David Goggins" },
  { text: "The pain of discipline is far less than the pain of regret.", author: "David Goggins" },
  { text: "Don't stop when you're tired. Stop when you're finished.", author: "David Goggins" },
  { text: "The A you earn today is the application you submit in four years.", author: "Ascend" },
  { text: "Nobody remembers how tired you were. They remember what you built.", author: "Ascend" },
  { text: "Every card you flip is a question you won't miss on the real exam.", author: "Ascend" },
  { text: "Hard is temporary. Regret is permanent.", author: "Ascend" },
  { text: "You don't rise to the occasion. You fall to your preparation.", author: "Ascend" },
  { text: "The gap between who you are and who you want to be is called work.", author: "Ascend" },
  { text: "Your future patients deserve the doctor who studied.", author: "Ascend" },
  { text: "Discipline is choosing your future self over your present comfort.", author: "Ascend" },
  { text: "Forged in focus. Finished in excellence.", author: "Ascend" },
];
const CLASS_COLORS = ['#E8956D', '#C4A882', '#D4845A', '#C8965A', '#E0A882', '#D49E6D'];

function classLabel(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('physics'))   return 'PHY';
  if (n.includes('biology'))   return 'BIO';
  if (n.includes('chemistry')) return 'CHM';
  if (n.includes('algebra') || n.includes('math')) return 'MTH';
  if (n.includes('english'))   return 'ENG';
  if (n.includes('science'))   return 'SCI';
  if (n.includes('history'))   return 'HIS';
  return name.slice(0, 3).toUpperCase();
}

function taskColor(type: string) {
  if (type === 'exam')       return '#C47878';
  if (type === 'quiz')       return '#C8965A';
  if (type === 'assignment') return '#5FAD8E';
  if (type === 'review')     return '#E8956D';
  if (type === 'nudge')      return '#E8956D';
  if (type === 'reading')    return '#6B7FA0';
  return '#9E9BB0';
}

function taskBg(type: string) {
  if (type === 'exam')       return '#FDF2F2';
  if (type === 'quiz')       return '#FFF3E8';
  if (type === 'assignment') return '#EDF7F2';
  if (type === 'review')     return '#FFF3E8';
  if (type === 'nudge')      return '#FFF3E8';
  if (type === 'reading')    return '#EEF1F7';
  return '#F3F1EC';
}

function formatDue(dateStr: string): string {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const due      = new Date(dateStr + 'T00:00:00');
  if (due.getTime() === today.getTime())    return 'Today!';
  if (due.getTime() === tomorrow.getTime()) return 'Tomorrow';
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return 'Overdue';
  if (diff <= 7) return `${diff}d`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BrynneDashboard() {
  const router   = useRouter();
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [student,    setStudent]    = useState<{ name: string; grade: string; focus: string } | null>(null);
  const [classes,    setClasses]    = useState<ClassRow[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [exams,      setExams]      = useState<ExamEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [calView,    setCalView]    = useState<'week' | 'month'>('week');
  const [showDone,   setShowDone]   = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [quoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));


  useEffect(() => {
    const load = async () => {
      const { data: studentData } = await supabase.from('students').select('name, grade, focus').eq('id', 'brynne').single();
      const { data: classData }   = await supabase.from('classes').select('id, name, semester, professor').eq('student_id', 'brynne').eq('is_active', true).order('created_at', { ascending: false });
      const { data: taskData }    = await supabase.from('tasks').select('*').eq('student_id', 'brynne').order('due_date', { ascending: true });
      const { data: folderData }  = await supabase.from('exam_folders').select('id, name, exam_date, class_id').not('exam_date', 'is', null);

      if (studentData) setStudent(studentData);
      if (classData)   setClasses(classData);
      if (taskData)    setTasks(taskData);

      if (folderData && classData) {
        const classMap: Record<string, string> = {};
        (classData || []).forEach(c => { classMap[c.id] = c.name; });
        setExams(
          folderData
            .filter(f => f.exam_date)
            .map(f => ({ id: f.id, name: f.name, exam_date: f.exam_date, class_name: classMap[f.class_id] || '' }))
        );
      }
setLoading(false);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);
  const toggleTask = async (task: Task) => {
    const updated = !task.completed;
    await supabase.from('tasks').update({ completed: updated }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const upcomingTasks  = tasks.filter(t => t.due_date >= todayStr).slice(0, 8);
  const overdueTasks   = tasks.filter(t => !t.completed && t.due_date < todayStr);
  const completedTasks = tasks.filter(t => t.completed).slice(0, 5);
  const todayExams     = exams.filter(e => e.exam_date === todayStr);
  const reviewTasks    = tasks.filter(t => t.task_type === 'review' && !t.completed && t.due_date >= todayStr).slice(0, 3);
  const nudgeTasks     = tasks.filter(t => t.task_type === 'nudge'  && !t.completed && t.due_date >= todayStr).slice(0, 3);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const year      = today.getFullYear();
  const month     = today.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();

  const examsForDate = (d: string) => exams.filter(e => e.exam_date === d);
  const hasActivity  = (d: string) =>
    tasks.some(t => t.due_date === d && !t.completed) || exams.some(e => e.exam_date === d);

  const navigateToResource = (task: Task) => {
    if (!task.resource_id || !task.resource_type) return;
    if (task.resource_type === 'flashcard_deck') router.push(`/brynne/flashcards?deckId=${task.resource_id}`);
    if (task.resource_type === 'study_guide')    router.push(`/brynne/study?guideId=${task.resource_id}`);
    if (task.resource_type === 'practice_exam')  router.push(`/brynne/practice-exam?examId=${task.resource_id}`);
  };

  const TaskRow = ({ task }: { task: Task }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F3F1EC', opacity: task.completed ? 0.45 : 1, transition: 'opacity 0.2s' }}>
      <button
        onClick={() => toggleTask(task)}
        style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: task.completed ? '#9E9BB0' : '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.class_name && <span style={{ fontSize: 10, color, fontWeight: 600 }}>{task.class_name}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: taskColor(task.task_type), background: taskBg(task.task_type), padding: '1px 7px', borderRadius: 999 }}>
            {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: task.due_date < todayStr ? '#C47878' : task.due_date === todayStr ? color : '#9E9BB0' }}>
          {formatDue(task.due_date)}
        </div>
        {task.due_time && <div style={{ fontSize: 10, color: '#C4C1D4' }}>{formatTime(task.due_time)}</div>}
      </div>
      {task.resource_id && task.resource_type && (
        <button onClick={() => navigateToResource(task)} style={{ background: light, border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <button onClick={() => { if (confirm('Delete this task?')) deleteTask(task.id); }} style={{ fontSize: 11, fontWeight: 700, color: '#C47878', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>✕</button>
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
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 3 }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.6px' }}>
              {student ? `Hey, ${student.name.split(' ')[0]}! 🌟` : 'Dashboard'}
            </div>
            {student?.focus && <div style={{ fontSize: 12, color: '#9E9BB0', marginTop: 2 }}>{student.focus}</div>}
          </div>
          <Link href="/brynne/profile" style={{ textDecoration: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: light, overflow: 'hidden', border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/dragon.png" alt="Dragon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </Link>
        </div>

        {/* Exam alert */}
        {todayExams.map(e => (
          <div key={e.id} style={{ background: `linear-gradient(135deg, ${color}, #C4A882)`, borderRadius: 14, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
<div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
  <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="5" width="22" height="20" rx="3" stroke="white" strokeWidth="1.6" fill="none"/>
    <line x1="3" y1="11" x2="25" y2="11" stroke="white" strokeWidth="1.4"/>
    <line x1="9" y1="3" x2="9" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="19" y1="3" x2="19" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="8" y="15" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
  </svg>
</div>            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{e.name} — Today! 🌟</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{e.class_name} · You've got this!</div>
            </div>
          </div>
        ))}

        {/* ── 1. CALENDAR ── */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>My Calendar</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['week', 'month'] as const).map(v => (
                <button key={v} onClick={() => setCalView(v)} style={{ padding: '4px 10px', borderRadius: 999, border: 'none', background: calView === v ? color : 'transparent', color: calView === v ? 'white' : '#9E9BB0', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textTransform: 'capitalize' }}>{v}</button>
              ))}
              <Link href="/brynne/calendar" style={{ padding: '4px 10px', borderRadius: 999, background: light, color, fontSize: 10, fontWeight: 700, textDecoration: 'none', marginLeft: 4 }}>Open</Link>
            </div>
          </div>

          {calView === 'week' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {weekDays.map((d, i) => {
                const ds      = d.toISOString().split('T')[0];
                const isToday = ds === todayStr;
                const active  = hasActivity(ds);
                return (
                  <div key={i} onClick={() => setSelectedDay(ds)} style={{ textAlign: 'center', cursor: 'pointer', padding: '6px 2px', borderRadius: 10, background: isToday ? color : 'transparent' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: isToday ? 'rgba(255,255,255,0.7)' : '#C4C1D4', marginBottom: 4 }}>{DAYS[i].slice(0, 1)}</div>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : '#1D1B26', marginBottom: 4 }}>{d.getDate()}</div>
                    {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.7)' : color, margin: '0 auto' }} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#1D1B26', marginBottom: 10 }}>{MONTHS[month]} {year}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#C4C1D4' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMon }).map((_, i) => {
                  const day     = i + 1;
                  const ds      = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = ds === todayStr;
                  const active  = hasActivity(ds);
                  const hasExam = examsForDate(ds).length > 0;
                  return (
                    <div key={day} onClick={() => setSelectedDay(ds)} style={{ textAlign: 'center', padding: '4px 2px', borderRadius: 8, cursor: 'pointer', background: isToday ? color : 'transparent' }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 400, color: isToday ? 'white' : '#1D1B26' }}>{day}</div>
                      {(active || hasExam) && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                          {active  && <div style={{ width: 3, height: 3, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.7)' : color }} />}
                          {hasExam && <div style={{ width: 3, height: 3, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.7)' : '#C47878' }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── QUOTE ── */}
        <div style={{ textAlign: 'center', padding: '4px 8px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6B6880', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 4 }}>
            "{QUOTES[quoteIndex].text}"
          </div>
          {QUOTES[quoteIndex].author && (
            <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>
              — {QUOTES[quoteIndex].author}
            </div>
          )}
        </div>

        {/* ── 2. TASKS ── */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>My Tasks</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowDone(s => !s)} style={{ fontSize: 10, fontWeight: 700, color: showDone ? color : '#9E9BB0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                {showDone ? 'Hide done' : 'Show done'}
              </button>
              <Link href="/brynne/calendar" style={{ fontSize: 10, fontWeight: 700, color, textDecoration: 'none' }}>+ Add</Link>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
          ) : (
            <>
              {overdueTasks.length > 0 && (
                <div style={{ background: '#FDF2F2', borderRadius: 10, padding: '8px 12px', marginBottom: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C47878', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Needs attention!</div>
                  {overdueTasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              )}
              {upcomingTasks.length === 0 && overdueTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>All done! 🌟</div>
                  <div style={{ fontSize: 12, color: '#9E9BB0' }}>Nothing left! You're amazing!</div>
                </div>
              ) : (
                upcomingTasks.map(task => <TaskRow key={task.id} task={task} />)
              )}
              {showDone && completedTasks.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Finished 🌟</div>
                  {completedTasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── SPACED REPETITION BAND ── */}
        {(reviewTasks.length > 0 || nudgeTasks.length > 0) && (
          <div style={{ background: `linear-gradient(135deg, ${color}, #C4A882)`, borderRadius: 18, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
              {reviewTasks.length > 0 ? 'Review Time! 📚' : 'Coming Up!'}
            </div>
            {[...nudgeTasks, ...reviewTasks].map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <button
                  onClick={() => toggleTask(task)}
                  style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'white', textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }}>{task.title}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{formatDue(task.due_date)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 3. CLASSES ── */}
        {classes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>My Classes</div>
              <Link href="/brynne/classes" style={{ fontSize: 11, fontWeight: 700, color, textDecoration: 'none' }}>See all</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {classes.slice(0, 4).map((cls, i) => {
                const c = CLASS_COLORS[i % CLASS_COLORS.length];
                return (
                  <div
                    key={cls.id}
                    onClick={() => router.push(`/brynne/classes/${cls.id}`)}
                    style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(29,27,38,0.06)', transition: 'transform 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: c + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: c, marginBottom: 8 }}>{classLabel(cls.name)}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', lineHeight: 1.3, marginBottom: 2 }}>{cls.name}</div>
                    <div style={{ fontSize: 10, color: '#9E9BB0' }}>{cls.semester || ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ADD TO HOME SCREEN HINT ── */}
        <div style={{ background: '#E8956D', borderRadius: 16, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
              <path d="M4 52L22 10L40 52" stroke="white" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M31 52L42 28L53 52" stroke="white" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
              <line x1="2" y1="52" x2="56" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 2 }}>Add Ascend to your home screen!</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Tap Share → "Add to Home Screen" in Chrome 🌟</div>
          </div>
        </div>

        {/* ── 4. STUDY TOOLS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div onClick={() => router.push('/brynne/study')} style={{ background: '#FFFFFF', border: `1.5px solid ${color}20`, borderRadius: 14, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(29,27,38,0.06)', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconBrain c={color} /></div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D1B26', lineHeight: 1.3 }}>Study Guide</div>
          </div>
          <div onClick={() => router.push('/brynne/flashcards')} style={{ background: '#FFFFFF', border: `1.5px solid ${color}20`, borderRadius: 14, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(29,27,38,0.06)', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconCards c={color} /></div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D1B26', lineHeight: 1.3 }}>Flashcards</div>
          </div>
          <div onClick={() => router.push('/brynne/practice-exam')} style={{ background: '#FFFFFF', border: `1.5px solid ${color}20`, borderRadius: 14, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(29,27,38,0.06)', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconExam c={color} /></div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D1B26', lineHeight: 1.3 }}>Practice Test</div>
          </div>
          <div onClick={() => setShowUpload(true)} style={{ background: '#FFFFFF', border: `1.5px solid ${color}20`, borderRadius: 14, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(29,27,38,0.06)', transition: 'transform 0.15s' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconUpload c={color} /></div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D1B26', lineHeight: 1.3 }}>Upload Resources</div>
          </div>
        </div>

      </main>

{showUpload && <UploadResourceModal student="brynne" onClose={() => setShowUpload(false)} />}

      {selectedDay && (() => {
        const dayTasks  = tasks.filter(t => t.due_date === selectedDay);
        const dayExams  = exams.filter(e => e.exam_date === selectedDay);
        const dateLabel = new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const isEmpty   = dayTasks.length === 0 && dayExams.length === 0;
        return (
          <div onClick={e => { if (e.target === e.currentTarget) setSelectedDay(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '24px 20px 20px', width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(29,27,38,0.18)', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{dateLabel}</div>
                <button onClick={() => setSelectedDay(null)} style={{ background: '#F3F1EC', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 28 28" fill="none"><path d="M6 6l16 16M22 6L6 22" stroke="#9E9BB0" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>

              {dayExams.map(exam => (
                <div key={exam.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.2)', marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C47878', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26' }}>{exam.name}</div>
                    {exam.class_name && <div style={{ fontSize: 11, color: '#C47878', fontWeight: 600 }}>{exam.class_name}</div>}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#C47878', background: '#FDF2F2', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(196,120,120,0.3)' }}>Test</div>
                </div>
              ))}

              {dayTasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dayTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FAFAF8', border: '1.5px solid #E8E5F0', opacity: task.completed ? 0.5 : 1 }}>
                      <button onClick={() => toggleTask(task)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          {task.class_name && <span style={{ fontSize: 10, color, fontWeight: 600 }}>{task.class_name}</span>}
                          <span style={{ fontSize: 10, fontWeight: 700, color: taskColor(task.task_type), background: taskBg(task.task_type), padding: '1px 7px', borderRadius: 999 }}>{task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}</span>
                        </div>
                      </div>
                      {task.due_time && <div style={{ fontSize: 10, color: '#C4C1D4', flexShrink: 0 }}>{formatTime(task.due_time)}</div>}
                    </div>
                  ))}
                </div>
              )}

              {isEmpty && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1B26', marginBottom: 4 }}>Free day!</div>
                  <div style={{ fontSize: 12, color: '#9E9BB0' }}>Nothing scheduled — enjoy it! 🌟</div>
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F1EC', textAlign: 'center' }}>
                <Link href="/brynne/calendar" onClick={() => setSelectedDay(null)} style={{ fontSize: 12, fontWeight: 700, color, textDecoration: 'none' }}>Open in Calendar →</Link>
              </div>
            </div>
          </div>
        );
      })()}
      <TabBar student="brynne" />
    </div>
  );
}