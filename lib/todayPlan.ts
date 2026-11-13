// "What do I study today": turns what Ascend already knows (due flashcards, tasks, upcoming exams, weak cards)
// into one short, ordered list. Pure functions — no database calls — so the rules are easy to read and test.

export type PlanTask = { id: string; title: string; due_date: string; completed: boolean; completed_at?: string | null; class_name: string | null; task_type: string; resource_id?: string | null; resource_type?: string | null };
export type PlanDeck = { id: string; title: string; folder_id: string | null; class_name: string | null; created_at: string; cards: number; new_cards: number; due_seen: number; reviewed_today: number; weak: number; retired: number };
export type PlanExam = { folderId: string; classId: string; name: string; className: string; examDate: string; resources: number; hasDeck: boolean; examsTaken: number; lastTakenDay: string | null; takenToday: boolean; madeToday: boolean };

export type PlanItem = {
  key: string;
  kind: 'task' | 'cards' | 'exam-prep';
  title: string;
  detail: string;
  tag: string | null;          // class name
  urgent: boolean;
  progress: number;            // 0..1 — how much of this item is finished today
  href: string | null;         // where tapping it goes
  taskId?: string;             // tasks are ticked off right on the home page
  rank: number;                // lower = earlier in the list
};

const DAY = 86400000;
export const daysBetween = (from: string, to: string) => Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / DAY);
const inDays = (n: number) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Local-time start of today, as the timestamp the database compares against. */
export const dayStartISO = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const isSameLocalDay = (iso: string | null | undefined, todayStr: string) => {
  if (!iso) return false;
  const d = new Date(iso); if (isNaN(d.getTime())) return false;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayStr;
};

/** Is this unfinished task shown in Today's Plan? (Due today or up to two weeks overdue; countdown reminders only on their day.) */
export function isPlanTask(t: { due_date: string; completed: boolean; task_type: string }, todayStr: string): boolean {
  if (t.completed) return false;
  const late = daysBetween(t.due_date, todayStr);
  if (late < 0 || late > 14) return false;
  return !(t.task_type === 'nudge' && late !== 0);
}

export function buildTodayPlan(input: { studentId: string; todayStr: string; tasks: PlanTask[]; decks: PlanDeck[]; exams: PlanExam[] }): PlanItem[] {
  const { studentId, todayStr, tasks, decks, exams } = input;
  const items: PlanItem[] = [];

  // Exams in the next two weeks, soonest first. The soonest exam pulls its class's work to the top.
  const soon = exams.map(e => ({ ...e, days: daysBetween(todayStr, e.examDate) })).filter(e => e.days >= 0 && e.days <= 14).sort((a, b) => a.days - b.days);
  const examByFolder = new Map(soon.map(e => [e.folderId, e]));
  const proximity = (days: number | undefined) => days === undefined ? 0 : Math.max(0, 15 - days);   // 15 (today) … 1 (two weeks out)

  // 1. Flashcards that are due (or were reviewed today, so finished work stays on the ring).
  const deckIds = new Set<string>();
  for (const d of decks) {
    const untouched = d.new_cards === d.cards;                       // never studied at all
    const mastered = d.retired > 0;                                    // "Mark as Mastered" — spaced repetition stopped
    const exam = d.folder_id ? examByFolder.get(d.folder_id) : undefined;
    const fresh = daysBetween(d.created_at.slice(0, 10), todayStr) <= 14;
    // A deck nobody ever opened only counts while it is new or its exam is coming — old abandoned decks stay out of the way.
    const due = mastered ? d.due_seen : d.due_seen + (untouched && !exam && !fresh ? 0 : d.new_cards);
    if (due === 0 && d.reviewed_today === 0) continue;
    deckIds.add(d.id);
    const progress = due === 0 ? 1 : Math.min(0.95, d.reviewed_today / (d.reviewed_today + due));
    const bits = due === 0 ? [`${plural(d.reviewed_today, 'card')} reviewed`] : [untouched ? `${plural(due, 'new card')}` : `${plural(due, 'card')} due`];
    if (due > 0 && d.weak > 0) bits.push(`${d.weak} you keep missing`);
    if (exam && due > 0) bits.push(`exam ${inDays(exam.days)}`);
    items.push({
      key: 'deck-' + d.id, kind: 'cards', title: `${untouched && due > 0 ? 'Start' : 'Review'}: ${d.title}`, detail: bits.join(' · '), tag: d.class_name,
      urgent: !!exam && exam.days <= 3 && due > 0, progress, href: `/${studentId}/flashcards?deckId=${d.id}`,
      rank: 300 - proximity(exam?.days) * 10 - Math.min(d.weak, 9) - Math.min(due, 50) / 100,
    });
  }

  // 2. One next step for each exam that is close.
  for (const e of soon.slice(0, 3)) {
    const base = { tag: e.className, urgent: e.days <= 3, rank: 200 - proximity(e.days) * 10 };
    const folderHref = `/${studentId}/classes/${e.classId}/${e.folderId}`;
    const q = `folderId=${e.folderId}&folderName=${encodeURIComponent(e.name)}`;
    if (e.resources === 0) {
      items.push({ ...base, key: 'prep-' + e.folderId, kind: 'exam-prep', title: `Upload your materials for ${e.name}`, detail: `Exam ${inDays(e.days)} · nothing uploaded yet`, progress: 0, href: folderHref });
    } else if (!e.hasDeck) {
      items.push({ ...base, key: 'prep-' + e.folderId, kind: 'exam-prep', title: `Make flashcards for ${e.name}`, detail: `Exam ${inDays(e.days)} · no deck yet`, progress: 0, href: `/${studentId}/flashcards?${q}` });
    } else {
      const sinceLast = e.lastTakenDay ? daysBetween(e.lastTakenDay, todayStr) : null;
      // In the last week: a practice exam every other day. Earlier than that: just make sure one has been taken.
      const wanted = e.takenToday || e.madeToday || e.examsTaken === 0 || (e.days <= 7 && (sinceLast === null || sinceLast >= 2)) || e.days <= 1;
      if (wanted) items.push({ ...base, key: 'prep-' + e.folderId, kind: 'exam-prep', title: `Take a practice exam: ${e.name}`, detail: e.takenToday ? 'Done today' : `Exam ${inDays(e.days)}${e.examsTaken === 0 ? ' · none taken yet' : ''}`, progress: e.takenToday ? 1 : 0, href: `/${studentId}/practice-exam?${q}` });
    }
  }

  // 3. Tasks due today or recently overdue, plus anything ticked off today.
  for (const t of tasks) {
    const doneToday = t.completed && isSameLocalDay(t.completed_at, todayStr);
    if (t.completed && !doneToday) continue;
    const late = daysBetween(t.due_date, todayStr);                  // 0 = due today, >0 = overdue
    if (!doneToday && (late < 0 || late > 14)) continue;              // not yet due, or so old it belongs in the task list, not today's plan
    if (t.task_type === 'nudge' && late !== 0 && !doneToday) continue; // countdown reminders only matter on their day
    // A "review this deck" reminder is the same job as the deck's due cards — show it once.
    if (t.task_type === 'review' && t.resource_type === 'flashcard_deck' && t.resource_id && deckIds.has(t.resource_id)) continue;
    const href = !t.resource_id ? null
      : t.resource_type === 'flashcard_deck' ? `/${studentId}/flashcards?deckId=${t.resource_id}`
      : t.resource_type === 'study_guide' ? `/${studentId}/study?guideId=${t.resource_id}`
      : t.resource_type === 'practice_exam' ? `/${studentId}/practice-exam?examId=${t.resource_id}` : null;
    const graded = t.task_type === 'exam' || t.task_type === 'quiz' || t.task_type === 'assignment';
    items.push({
      key: 'task-' + t.id, kind: 'task', title: t.title, detail: doneToday ? 'Done today' : late === 0 ? 'Due today' : `Overdue by ${plural(late, 'day')}`, tag: t.class_name,
      urgent: !doneToday && graded, progress: doneToday ? 1 : 0, href, taskId: t.id,
      rank: (graded ? 0 : 400) - Math.min(late, 14),          // graded work with a deadline always comes first
    });
  }

  // Finished items sink to the bottom so the next thing to do is always first.
  return items.sort((a, b) => (a.progress >= 1 ? 1 : 0) - (b.progress >= 1 ? 1 : 0) || a.rank - b.rank);
}

export function planProgress(items: PlanItem[]): { done: number; total: number; fraction: number } {
  const total = items.length;
  const done = items.filter(i => i.progress >= 1).length;
  const fraction = total === 0 ? 0 : items.reduce((s, i) => s + Math.min(1, i.progress), 0) / total;
  return { done, total, fraction };
}

/**
 * Consecutive days with at least one finished plan item, counting back from today (or from yesterday, if nothing is
 * finished yet today — the streak is still alive until the day ends). Days with nothing planned don't break it.
 */
export function streakFrom(days: { day: string; planned: number; done: number }[], todayStr: string): number {
  const byDay = new Map(days.map(d => [d.day, d]));
  let streak = 0;
  const cursor = new Date(todayStr + 'T00:00:00');
  for (let i = 0; i < 400; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const row = byDay.get(key);
    if (row && row.done > 0) streak++;
    else if (row && row.planned === 0) { /* rest day: nothing was asked of them */ }
    else if (i > 0) break;                                           // today not started yet is fine; a missed earlier day ends it
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
