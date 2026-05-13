'use client';
import Link from 'next/link';
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

function IconCalendarEvent({ c, size = 20 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="20" rx="3" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="3" y1="11" x2="25" y2="11" stroke={c} strokeWidth="1.4"/>
      <line x1="9" y1="3" x2="9" y2="8" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="19" y1="3" x2="19" y2="8" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="8" y="15" width="4" height="4" rx="1" fill={c} opacity="0.7"/>
    </svg>
  );
}

function IconEmptyDay({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="10" width="36" height="32" rx="4" stroke="#C4C1D4" strokeWidth="1.8" fill="none"/>
      <line x1="6" y1="18" x2="42" y2="18" stroke="#C4C1D4" strokeWidth="1.4"/>
      <line x1="15" y1="6" x2="15" y2="14" stroke="#C4C1D4" strokeWidth="2" strokeLinecap="round"/>
      <line x1="33" y1="6" x2="33" y2="14" stroke="#C4C1D4" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="27" x2="34" y2="27" stroke="#E8E5F0" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="33" x2="26" y2="33" stroke="#E8E5F0" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

type Task = { id: string; title: string; due_date: string; due_time: string | null; completed: boolean; class_name: string | null; task_type: string; };
type ExamEvent = { id: string; name: string; exam_date: string; class_name: string; };

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDay(year: number, month: number)    { return new Date(year, month, 1).getDay(); }
function formatTime(t: string | null) { if (!t) return null; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }

function taskColor(type: string) {
  if (type === 'exam')       return '#C47878';
  if (type === 'quiz')       return '#C8965A';
  if (type === 'assignment') return '#5FAD8E';
  if (type === 'review')     return '#E8956D';
  if (type === 'nudge')      return '#E8956D';
  return '#9E9BB0';
}

function taskBg(type: string) {
  if (type === 'exam')       return '#FDF2F2';
  if (type === 'quiz')       return '#FFF3E8';
  if (type === 'assignment') return '#EDF7F2';
  if (type === 'review')     return '#FFF3E8';
  if (type === 'nudge')      return '#FFF3E8';
  return '#F3F1EC';
}

const color = '#E8956D';
const light = '#FFF3E8';

export default function BrynneCalendar() {
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [view,     setView]     = useState<'month' | 'week' | 'day'>('month');
  const [curYear,  setCurYear]  = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [curDay,   setCurDay]   = useState(today.getDate());
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [exams,    setExams]    = useState<ExamEvent[]>([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate,  setNewDate]  = useState(todayStr);
  const [newTime,  setNewTime]  = useState('');
  const [newType,  setNewType]  = useState('assignment');
  const [newClass, setNewClass] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [classes,  setClasses]  = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ data: taskData }, { data: folderData }, { data: classData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('student_id', 'brynne').order('due_date', { ascending: true }),
        supabase.from('exam_folders').select('id, name, exam_date, class_id').not('exam_date', 'is', null),
        supabase.from('classes').select('id, name').eq('student_id', 'brynne').eq('is_active', true),
      ]);
      if (taskData)  setTasks(taskData);
      if (classData) setClasses(classData);
      if (folderData && classData) {
        const classMap: Record<string, string> = {};
        classData.forEach(c => { classMap[c.id] = c.name; });
        setExams(folderData.filter(f => f.exam_date).map(f => ({ id: f.id, name: f.name, exam_date: f.exam_date, class_name: classMap[f.class_id] || '' })));
      }
    };
    load();
  }, []);

  const toggleTask   = async (task: Task) => { await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id); setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)); };
  const tasksForDate = (d: string) => tasks.filter(t => t.due_date === d);
  const examsForDate = (d: string) => exams.filter(e => e.exam_date === d);
  const daysInMonth  = getDaysInMonth(curYear, curMonth);
  const firstDay     = getFirstDay(curYear, curMonth);
  const selectedDate = new Date(curYear, curMonth, curDay);
  const selStr       = selectedDate.toISOString().split('T')[0];

  const prevMonth = () => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); };
  const nextMonth = () => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); };
  const prevWeek  = () => { const d = new Date(curYear, curMonth, curDay - 7); setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setCurDay(d.getDate()); };
  const nextWeek  = () => { const d = new Date(curYear, curMonth, curDay + 7); setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setCurDay(d.getDate()); };
  const prevDay   = () => { const d = new Date(curYear, curMonth, curDay - 1); setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setCurDay(d.getDate()); };
  const nextDay   = () => { const d = new Date(curYear, curMonth, curDay + 1); setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setCurDay(d.getDate()); };

  const viewWeekStart = new Date(curYear, curMonth, curDay);
  viewWeekStart.setDate(viewWeekStart.getDate() - viewWeekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(viewWeekStart); d.setDate(viewWeekStart.getDate() + i); return d; });

  const handleAddTask = async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    const { data } = await supabase.from('tasks').insert({ student_id: 'brynne', title: newTitle.trim(), due_date: newDate, due_time: newTime || null, task_type: newType, class_name: newClass || null, completed: false }).select().single();
    if (data) setTasks(prev => [...prev, data].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setNewTitle(''); setNewDate(todayStr); setNewTime(''); setNewType('assignment'); setNewClass('');
    setShowAdd(false); setSaving(false);
  };

  const EventChip = ({ title, type, completed, onClick }: { title: string; type: string; completed: boolean; onClick: () => void }) => (
    <div onClick={e => { e.stopPropagation(); onClick(); }} style={{ padding: '3px 7px', borderRadius: 6, background: completed ? '#F3F1EC' : taskBg(type), fontSize: 10, fontWeight: 600, color: completed ? '#C4C1D4' : taskColor(type), cursor: 'pointer', textDecoration: completed ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{title}</div>
  );

  const ExamChip = ({ name }: { name: string }) => (
    <div style={{ padding: '3px 7px', borderRadius: 6, background: '#FDF2F2', fontSize: 10, fontWeight: 700, color: '#C47878', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      <IconCalendarEvent c="#C47878" size={10} />
      {name}
    </div>
  );

  const TaskRow = ({ task }: { task: Task }) => (
    <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: task.completed ? 0.5 : 1, transition: 'opacity 0.2s', marginBottom: 8 }}>
      <button onClick={() => toggleTask(task)} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: task.completed ? '#9E9BB0' : '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.class_name && <span style={{ fontSize: 11, color, fontWeight: 600 }}>{task.class_name}</span>}
          {task.due_time   && <span style={{ fontSize: 11, color: '#9E9BB0' }}>{formatTime(task.due_time)}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: taskColor(task.task_type), background: taskColor(task.task_type) + '18', padding: '2px 8px', borderRadius: 999 }}>{task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}</span>
        </div>
      </div>
    </div>
  );

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.6px' }}>Calendar</div>
          <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Add Task</button>
        </div>

        <div style={{ display: 'flex', background: '#F3F1EC', borderRadius: 10, padding: 3, gap: 2, marginBottom: 16 }}>
          {(['month', 'week', 'day'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: view === v ? '#FFFFFF' : 'transparent', color: view === v ? color : '#9E9BB0', boxShadow: view === v ? '0 1px 4px rgba(29,27,38,0.08)' : 'none', textTransform: 'capitalize' }}>{v}</button>
          ))}
        </div>

        {view === 'month' && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E8E5F0' }}>
              <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>{MONTHS[curMonth]} {curYear}</span>
              <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E8E5F0' }}>
              {DAYS_LETTER.map((d, i) => <div key={i} style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, fontWeight: 700, color: '#C4C1D4', letterSpacing: 0.5 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ minHeight: 90, borderRight: '1px solid #F3F1EC', borderBottom: '1px solid #F3F1EC', background: '#FAFAF8' }} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const dayTasks = tasksForDate(dateStr);
                const dayExams = examsForDate(dateStr);
                const col = (firstDay + i) % 7;
                return (
                  <div key={day} onClick={() => { setCurDay(day); setView('day'); }} style={{ minHeight: 90, borderRight: col < 6 ? '1px solid #F3F1EC' : 'none', borderBottom: '1px solid #F3F1EC', padding: '6px 5px', cursor: 'pointer', background: isToday ? '#FAFAF8' : '#FFFFFF' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = light} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = isToday ? '#FAFAF8' : '#FFFFFF'}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: isToday ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : '#1D1B26' }}>{day}</span>
                    </div>
                    {dayExams.map(e => <ExamChip key={e.id} name={e.name} />)}
                    {dayTasks.slice(0, 2).map(t => <EventChip key={t.id} title={t.title} type={t.task_type} completed={t.completed} onClick={() => toggleTask(t)} />)}
                    {dayTasks.length > 2 && <div style={{ fontSize: 9, color: '#9E9BB0', fontWeight: 600 }}>+{dayTasks.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E8E5F0' }}>
              <button onClick={prevWeek} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26' }}>{weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <button onClick={nextWeek} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FAFAF8', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekDays.map((d, i) => {
                const dateStr  = d.toISOString().split('T')[0];
                const isToday  = dateStr === todayStr;
                const dayTasks = tasksForDate(dateStr);
                const dayExams = examsForDate(dateStr);
                return (
                  <div key={i} onClick={() => { setCurYear(d.getFullYear()); setCurMonth(d.getMonth()); setCurDay(d.getDate()); setView('day'); }} style={{ borderRight: i < 6 ? '1px solid #F3F1EC' : 'none', padding: '10px 6px', minHeight: 120, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = light} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 0.5, marginBottom: 3 }}>{DAYS_SHORT[i].toUpperCase()}</div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? 'white' : '#1D1B26' }}>{d.getDate()}</span>
                      </div>
                    </div>
                    {dayExams.map(e => <ExamChip key={e.id} name={e.name} />)}
                    {dayTasks.slice(0, 3).map(t => <EventChip key={t.id} title={t.title} type={t.task_type} completed={t.completed} onClick={() => toggleTask(t)} />)}
                    {dayTasks.length > 3 && <div style={{ fontSize: 9, color: '#9E9BB0', fontWeight: 600, textAlign: 'center' }}>+{dayTasks.length - 3}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'day' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={prevDay} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 18, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26' }}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                {selStr === todayStr && <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>Today! 🌟</div>}
              </div>
              <button onClick={nextDay} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 18, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            {examsForDate(selStr).map(e => (
              <div key={e.id} style={{ background: '#FDF2F2', border: '1.5px solid rgba(196,120,120,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(196,120,120,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconCalendarEvent c="#C47878" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#C47878', marginBottom: 2 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9BB0' }}>{e.class_name} · Test Day!</div>
                </div>
              </div>
            ))}
            {tasksForDate(selStr).length === 0 && examsForDate(selStr).length === 0 ? (
              <div style={{ background: '#FFFFFF', border: '1.5px dashed #E8E5F0', borderRadius: 18, padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌟</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Nothing today!</div>
                <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 20 }}>Free day! You can add something if you want.</div>
                <button onClick={() => { setNewDate(selStr); setShowAdd(true); }} style={{ padding: '10px 22px', borderRadius: 999, background: color, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Add Task</button>
              </div>
            ) : (
              <div>{tasksForDate(selStr).map(task => <TaskRow key={task.id} task={task} />)}</div>
            )}
          </div>
        )}

        {view !== 'day' && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Upcoming</div>
            {tasks.filter(t => !t.completed && t.due_date >= todayStr).slice(0, 5).length === 0
              ? <div style={{ fontSize: 13, color: '#9E9BB0', textAlign: 'center', padding: '20px 0' }}>No upcoming tasks 🌟</div>
              : tasks.filter(t => !t.completed && t.due_date >= todayStr).slice(0, 5).map(task => <TaskRow key={task.id} task={task} />)
            }
          </div>
        )}
      </main>

      {showAdd && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '24px 20px 44px', width: '100%', maxWidth: 580, boxShadow: '0 -8px 40px rgba(29,27,38,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 34, height: 4, background: '#E8E5F0', borderRadius: 99, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1D1B26', marginBottom: 20 }}>Add Task</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>What is it?</label>
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAddTask(); }} placeholder='e.g. "Math worksheet"' style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${color}`, borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>When?</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Time (optional)</label>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 8, display: 'block' }}>What kind?</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {['assignment', 'quiz', 'reading', 'project', 'other'].map(t => (
                  <button key={t} onClick={() => setNewType(t)} style={{ padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${newType === t ? color : '#E8E5F0'}`, background: newType === t ? color : '#FAFAF8', color: newType === t ? 'white' : '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textTransform: 'capitalize' as const }}>{t}</button>
                ))}
              </div>
            </div>
            {classes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Which class? (optional)</label>
                <select value={newClass} onChange={e => setNewClass(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box' as const }}>
                  <option value="">No class</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddTask} disabled={!newTitle.trim() || !newDate || saving} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: !newTitle.trim() ? '#F3F1EC' : color, color: !newTitle.trim() ? '#C4C1D4' : 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{saving ? 'Saving...' : 'Add Task 🌟'}</button>
            </div>
          </div>
        </div>
      )}
      <TabBar student="brynne" />
    </div>
  );
}