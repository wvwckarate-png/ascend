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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

export default function MichaelCalendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskClass, setNewTaskClass] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTasks(); }, [currentMonth, currentYear]);

  const fetchTasks = async () => {
    const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const end = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${getDaysInMonth(currentYear, currentMonth)}`;
    const { data } = await supabase.from('tasks').select('*').eq('student_id', 'michael').gte('due_date', start).lte('due_date', end).order('due_time', { ascending: true });
    if (data) setTasks(data);
  };

  const tasksForDate = (dateStr: string) => tasks.filter(t => t.due_date === dateStr);
  const selectedTasks = tasksForDate(selectedDate);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    setSaving(true);
    await supabase.from('tasks').insert({ student_id: 'michael', title: newTaskTitle.trim(), due_date: selectedDate, due_time: newTaskTime || null, class_name: newTaskClass || null, task_type: 'task' });
    setNewTaskTitle(''); setNewTaskTime(''); setNewTaskClass(''); setShowAddTask(false); setSaving(false);
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

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  const formatSelectedDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const typeColor = (type: string) => {
    if (type === 'review') return '#7B6FA0';
    if (type === 'exam') return '#C8965A';
    return '#5FAD8E';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/michael" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26' }}>{MONTHS[currentMonth]} {currentYear}</div>
          <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>

        <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '16px', marginBottom: 16, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#C4C1D4', letterSpacing: 0.5, padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              const hasTasks = tasksForDate(dateStr).length > 0;
              const hasCompleted = tasksForDate(dateStr).some(t => t.completed);
              const hasIncomplete = tasksForDate(dateStr).some(t => !t.completed);
              return (
                <div key={day} onClick={() => setSelectedDate(dateStr)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 2px', borderRadius: 10, cursor: 'pointer', background: isSelected ? '#7B6FA0' : isToday ? '#EDE9F7' : 'transparent' }}>
                  <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 800 : 400, color: isSelected ? 'white' : isToday ? '#7B6FA0' : '#1D1B26', marginBottom: 3 }}>{day}</span>
                  {hasTasks && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {hasIncomplete && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : '#7B6FA0' }} />}
                      {hasCompleted && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.5)' : '#5FAD8E' }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1D1B26' }}>{formatSelectedDate()}</div>
          <button onClick={() => setShowAddTask(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Add Task</button>
        </div>

        {showAddTask && (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); }} placeholder="Task name..." autoFocus style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none' }} />
              <input value={newTaskClass} onChange={e => setNewTaskClass(e.target.value)} placeholder="Class (optional)" style={{ flex: 2, padding: '8px 10px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addTask} disabled={!newTaskTitle.trim() || saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#7B6FA0', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !newTaskTitle.trim() ? 0.4 : 1 }}>{saving ? 'Saving...' : 'Add Task'}</button>
              <button onClick={() => setShowAddTask(false)} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #E8E5F0', background: '#FAFAF8', color: '#9E9BB0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Cancel</button>
            </div>
          </div>
        )}

        {selectedTasks.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '24px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Nothing scheduled. Add a task or study session.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedTasks.map(task => (
              <div key={task.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', alignItems: 'center', gap: 12, opacity: task.completed ? 0.6 : 1 }}>
                <button onClick={() => toggleComplete(task)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.completed ? '#5FAD8E' : '#C4C1D4'}`, background: task.completed ? '#5FAD8E' : 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: task.completed ? '#9E9BB0' : '#1D1B26', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 2 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {task.due_time && <span style={{ fontSize: 11, color: '#9E9BB0' }}>🕐 {task.due_time}</span>}
                    {task.class_name && <span style={{ fontSize: 11, color: '#7B6FA0', fontWeight: 600 }}>{task.class_name}</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeColor(task.task_type), background: '#F3F1EC', padding: '2px 8px', borderRadius: 999 }}>{task.task_type}</span>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} style={{ fontSize: 13, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </main>
      <TabBar student="michael" />
    </div>
  );
}