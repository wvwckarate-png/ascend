// The run-up to an exam, planned backwards around Ascend's spacing: a first pass (Day 0), then reviews on
// Day +1, +3 and +7. For all four to land before the exam, the first pass has to happen at least 7 days out.
// Pure functions — no database calls.
import { daysBetween } from './todayPlan';

export const SPACING = [0, 1, 3, 7] as const;
export type PassStatus = 'done' | 'today' | 'missed' | 'upcoming' | 'wont-fit';
export type Pass = { offset: number; label: string; day: string | null; status: PassStatus };
export type Runway = {
  passes: Pass[];
  started: boolean;            // has the first pass happened?
  startBy: string;             // last day a first pass still fits all four
  fits: number;                // how many of the four passes can still land on or before the exam
  daysToExam: number;
  headline: string;
  tone: 'good' | 'warn' | 'late' | 'calm';
};

const add = (day: string, n: number) => { const d = new Date(day + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nice = (day: string) => new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const LABELS: Record<number, string> = { 0: 'First pass', 1: 'Day +1', 3: 'Day +3', 7: 'Day +7' };

/**
 * firstPassDay: the day the first study guide or deck for this exam was made (null if none yet).
 * reviewsDone: which review offsets (1, 3, 7) have been ticked off.
 */
export function examRunway({ todayStr, examDate, firstPassDay, reviewsDone }: { todayStr: string; examDate: string; firstPassDay: string | null; reviewsDone: number[] }): Runway {
  const daysToExam = daysBetween(todayStr, examDate);
  const startBy = add(examDate, -7);
  const started = !!firstPassDay;
  const day0 = firstPassDay || (daysToExam >= 0 ? todayStr : null);            // if not started, show what starting today would give
  const passes: Pass[] = SPACING.map(offset => {
    const day = day0 ? add(day0, offset) : null;
    let status: PassStatus;
    if (offset === 0) status = started ? 'done' : daysToExam < 0 ? 'missed' : 'today';
    else if (!day) status = 'wont-fit';
    else if (started && reviewsDone.includes(offset)) status = 'done';
    else if (day > examDate) status = 'wont-fit';
    else if (!started) status = 'upcoming';
    else if (day === todayStr) status = 'today';
    else status = day < todayStr ? 'missed' : 'upcoming';
    return { offset, label: LABELS[offset], day, status };
  });
  const fits = passes.filter(p => p.status !== 'wont-fit' && p.status !== 'missed').length;
  const done = passes.filter(p => p.status === 'done').length;
  const dueNow = passes.find(p => p.status === 'today' && p.offset > 0);
  const missed = passes.filter(p => p.status === 'missed' && p.offset > 0);

  let headline: string; let tone: Runway['tone'];
  if (daysToExam < 0) { headline = 'This exam has passed.'; tone = 'calm'; }
  else if (!started) {
    const slack = daysBetween(todayStr, startBy);
    if (slack > 0) { headline = `Start by ${nice(startBy)} and all four spaced passes fit before the exam.`; tone = slack <= 3 ? 'warn' : 'calm'; }
    else if (slack === 0) { headline = 'Today is the last day to start and still fit all four spaced passes.'; tone = 'warn'; }
    else { headline = fits <= 1 ? 'Only a first pass fits now. Do it today, then take a practice exam.' : `Only ${fits} of the 4 spaced passes still fit. Do the first pass today.`; tone = 'late'; }
  } else if (dueNow) { headline = `${dueNow.label} review is due today.`; tone = 'warn'; }
  else if (missed.length) { headline = `${missed[0].label} review was missed (${nice(missed[0].day!)}). Do it today to stay on the spacing.`; tone = 'late'; }
  else if (done === passes.filter(p => p.status !== 'wont-fit').length) { headline = 'Every spaced pass that fits is done. Use practice exams from here.'; tone = 'good'; }
  else { const next = passes.find(p => p.status === 'upcoming'); headline = next ? `On track. Next: ${next.label} review on ${nice(next.day!)}.` : 'On track.'; tone = 'good'; }
  return { passes, started, startBy, fits, daysToExam, headline, tone };
}
