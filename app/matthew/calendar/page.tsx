'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import TabBar from '../../components/TabBar';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

type Task = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  completed: boolean;
  class_name: string | null;
  task_type: string;
};

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_MINI   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function typeColor(type: string) {
  if (type === 'review')     return '#7B6FA0';
  if (type === 'exam')       return '#C47878';
  if (type === 'quiz')       return '#C8965A';
  if (type === 'assignment') return '#5FAD8E';
  if (type === 'reading')    return '#6B7FA0';
  if (type === 'paper')      return '#9B8EC4';
  if (type === 'project')    return '#C8965A';
  return '#9E9BB0';
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getDayRecommendation(tasks: Task[], dateStr: string): string | null {
  const dayTasks = tasks.filter(t => t.due_date === dateStr && !t.completed);
  const reviews  = dayTasks.filter(t => t.task_type === 'review');
  const exams    = dayTasks.filter(t => t.task_type === 'exam' || t.task_type === 'quiz');
  if (exams.length > 0) return `${exams[0].title} today — review your notes and run a quick practice set before you go in.`;
  if (reviews.length > 0) return `${reviews.length} spaced review${reviews.length > 1 ? 's' : ''} due — knock these out tonight to stay on track with your 0-1-3-7 schedule.`;
  if (dayTasks.length > 0) return `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''} on the schedule. Stay ahead — finish early and leave time to review.`;
  return null;
}

export default function MatthewCalendar() {
  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [view,         setView]         = useState<'month' | 'week' | 'day'>('month');
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [showAdd,      setShowAdd]      = useState(false);
  const [newTitle,     setNewTitle]     = useState('');
  const [newTime,      setNewTime]      = useState('');
  const [newClass,     setNewClass]     = useState('');
  const [saving,       setSaving]       = useState(false);

  // Week: compute the Sunday of the week containing selectedDate
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const weekStart = new Date(selectedDateObj);
  weekStart.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    fetchTasks();
  }, [currentMonth, currentYear]);

  // Also fetch when selectedDate moves to a different month
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [selectedDate]);

  const fetchTasks = async () => {
    // Fetch a wide range to cover week/day views near month boundaries
    const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = getDaysInMonth(currentYear, currentMonth);
    const end   = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', 'matthew')
      .gte('due_date', start)
      .lte('due_date', end)
      .order('due_time', { ascending: true, nullsFirst: true });
    if (data) setTasks(data);
  };

  const tasksForDate = (dateStr: string) => tasks.filter(t => t.due_date === dateStr);
  const selectedTasks = tasksForDate(selectedDate);
  const recommendation = getDayRecommendation(tasks, selectedDate);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    await supabase.from('tasks').insert({
      student_id: 'matthew',
      title:      newTitle.trim(),
      due_date:   selectedDate,
      due_time:   newTime || null,
      class_name: newClass || null,
      task_type:  'task',
      completed:  false,
    });
    setNewTitle(''); setNewTime(''); setNewClass('');
    setShowAdd(false); setSaving(false);
    fetchTasks();
  };

  const toggleComplete = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  const prevPeriod = () => {
    if (view === 'month') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
    } else if (view === 'week') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
    } else if (view === 'week') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const headerLabel = () => {
    if (view === 'month') return `${MONTHS[currentMonth]} ${currentYear}`;
    if (view === 'week') {
      const end = weekDays[6];
      return `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
    }
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 13px', border: '1.5px solid #E8E5F0',
    borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13,
    color: '#1D1B26', background: '#FAFAF8', outline: 'none', boxSizing: 'border-box',
  };

  // Shared task list UI
  const TaskList = ({ dateStr }: { dateStr: string }) => {
    const dayTasks = tasksForDate(dateStr);
    if (dayTasks.length === 0) return (
      <div style={{ textAlign: 'center', padding: '28px 0', color: '#9E9BB0', fontSize: 13 }}>
        Nothing scheduled. Tap + Add Task to get started.
      </div>
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayTasks.map(task => (
          <div key={task.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', alignItems: 'center', gap: 12, opacity: task.completed ? 0.6 : 1 }}>
            <button
              onClick={() => toggleComplete(task)}
              style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: task.completed ? '#9E9BB0' : '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 3 }}>{task.title}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {task.due_time && <span style={{ fontSize: 11, color: '#9E9BB0' }}>{formatTime(task.due_time)}</span>}
                {task.class_name && <span style={{ fontSize: 11, color: '#7B6FA0', fontWeight: 600 }}>{task.class_name}</span>}
                <span style={{ fontSize: 10, fontWeight: 700, color: typeColor(task.task_type), background: typeColor(task.task_type) + '18', padding: '2px 8px', borderRadius: 999 }}>{typeLabel(task.task_type)}</span>
              </div>
            </div>
            <button onClick={() => deleteTask(task.id)} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4 }}>✕</button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 80px' }}>

        {/* View toggle */}
        <div style={{ display: 'flex', background: '#F3F1EC', borderRadius: 12, padding: 3, gap: 2, marginBottom: 16 }}>
          {(['month', 'week', 'day'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: '8px', borderRadius: 9, border: 'none', background: view === v ? '#FFFFFF' : 'transparent', color: view === v ? '#7B6FA0' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', boxShadow: view === v ? '0 1px 4px rgba(29,27,38,0.08)' : 'none', textTransform: 'capitalize' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Nav header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevPeriod} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 18, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.4px' }}>{headerLabel()}</div>
          <button onClick={nextPeriod} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 18, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 0.5, padding: '4px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, i) => {
                  const day     = i + 1;
                  const dateStr = toDateStr(currentYear, currentMonth, day);
                  const isToday    = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayTasks   = tasksForDate(dateStr);
                  const hasIncomplete = dayTasks.some(t => !t.completed);
                  const hasCompleted  = dayTasks.some(t => t.completed);
                  const hasReview     = dayTasks.some(t => t.task_type === 'review');
                  const hasExam       = dayTasks.some(t => t.task_type === 'exam' || t.task_type === 'quiz');

                  return (
                    <div
                      key={day}
                      onClick={() => { setSelectedDate(dateStr); setView('day'); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 2px', borderRadius: 10, cursor: 'pointer', background: isSelected ? '#7B6FA0' : isToday ? '#EDE9F7' : 'transparent' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: isToday || isSelected ? 800 : 400, color: isSelected ? 'white' : isToday ? '#7B6FA0' : '#1D1B26', marginBottom: 3 }}>{day}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {hasExam       && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : '#C47878' }} />}
                        {hasReview     && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : '#7B6FA0' }} />}
                        {hasIncomplete && !hasExam && !hasReview && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : '#5FAD8E' }} />}
                        {hasCompleted  && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.5)' : '#C4C1D4' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dot legend */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
              {[['#C47878', 'Exam / Quiz'], ['#7B6FA0', 'Review (0-1-3-7)'], ['#5FAD8E', 'Task'], ['#C4C1D4', 'Completed']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9E9BB0' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Upcoming tasks this month */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 12 }}>Upcoming This Month</div>
            {tasks.filter(t => !t.completed).length === 0 ? (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '20px', textAlign: 'center', color: '#9E9BB0', fontSize: 13, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                No upcoming tasks this month.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.filter(t => !t.completed).slice(0, 8).map(task => (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedDate(task.due_date); setView('day'); }}
                    style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '12px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(task.task_type), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                      {task.class_name && <div style={{ fontSize: 11, color: '#7B6FA0', fontWeight: 600 }}>{task.class_name}</div>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9BB0', flexShrink: 0 }}>
                      {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── WEEK VIEW ── */}
        {view === 'week' && (
          <>
            <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {weekDays.map((d, i) => {
                  const dateStr    = d.toISOString().split('T')[0];
                  const isToday    = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayTasks   = tasksForDate(dateStr);
                  const hasItems   = dayTasks.length > 0;
                  const hasExam    = dayTasks.some(t => t.task_type === 'exam' || t.task_type === 'quiz');
                  const hasReview  = dayTasks.some(t => t.task_type === 'review');

                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedDate(dateStr); setView('day'); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: isToday ? '#7B6FA0' : '#C4C1D4', textTransform: 'uppercase' }}>{DAYS_SHORT[d.getDay()]}</div>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#7B6FA0' : isToday ? '#EDE9F7' : 'transparent' }}>
                        <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 800 : 500, color: isSelected ? 'white' : isToday ? '#7B6FA0' : '#1D1B26' }}>{d.getDate()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, minHeight: 6 }}>
                        {hasExam   && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C47878' }} />}
                        {hasReview && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#7B6FA0' }} />}
                        {hasItems && !hasExam && !hasReview && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5FAD8E' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week task list — show all tasks grouped by day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {weekDays.map((d, i) => {
                const dateStr  = d.toISOString().split('T')[0];
                const dayTasks = tasksForDate(dateStr);
                if (dayTasks.length === 0) return null;
                const isToday = dateStr === todayStr;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isToday ? '#7B6FA0' : '#1D1B26' }}>
                        {d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      {isToday && <span style={{ fontSize: 9, fontWeight: 700, background: '#EDE9F7', color: '#7B6FA0', padding: '2px 8px', borderRadius: 999 }}>TODAY</span>}
                    </div>
                    <TaskList dateStr={dateStr} />
                  </div>
                );
              })}
              {weekDays.every(d => tasksForDate(d.toISOString().split('T')[0]).length === 0) && (
                <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '28px', textAlign: 'center', color: '#9E9BB0', fontSize: 13, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                  Nothing scheduled this week.
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DAY VIEW ── */}
        {view === 'day' && (
          <>
            {/* Ascend recommendation */}
            {recommendation && (
              <div style={{ background: '#EDE9F7', border: '1.5px solid rgba(123,111,160,0.2)', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#7B6FA0', marginBottom: 6 }}>Ascend Recommends</div>
                <div style={{ fontSize: 13, color: '#5A5078', lineHeight: 1.6 }}>{recommendation}</div>
              </div>
            )}

            {/* Add task */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4' }}>
                {selectedTasks.length === 0 ? 'No tasks' : `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`}
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
              >
                + Add Task
              </button>
            </div>

            {/* Add task form */}
            {showAdd && (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', marginBottom: 14, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', marginBottom: 12 }}>New Task</div>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
                  placeholder="Task name..."
                  autoFocus
                  style={{ ...inputStyle, marginBottom: 8 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={inputStyle} />
                  <input value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="Class (optional)" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addTask} disabled={!newTitle.trim() || saving} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !newTitle.trim() ? 0.4 : 1 }}>
                    {saving ? 'Saving...' : 'Add Task'}
                  </button>
                </div>
              </div>
            )}

            <TaskList dateStr={selectedDate} />
          </>
        )}

      </main>
      <TabBar student="matthew" />
    </div>
  );
}