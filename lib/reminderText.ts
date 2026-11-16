// What the daily reminder says. Pure and testable. Built on the same spaced-repetition facts as Today's Plan:
// cards that are due, the Day +1 / +3 / +7 reviews that land today, graded work, and the nearest exam.
export type ReminderFacts = { dueCards: number; weakCards: number; reviewsToday: string[]; gradedToday: string[]; overdue: number; exam: { name: string; days: number } | null };

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** Returns null when there is honestly nothing to say — no reminder is better than a nagging one. */
export function buildReminder(f: ReminderFacts): { title: string; body: string } | null {
  const parts: string[] = [];
  if (f.gradedToday.length === 1) parts.push(`${f.gradedToday[0]} is due today`);
  else if (f.gradedToday.length > 1) parts.push(`${f.gradedToday.length} assignments due today`);
  if (f.dueCards > 0) parts.push(`${plural(f.dueCards, 'card')} due${f.weakCards > 0 ? ` (${f.weakCards} you keep missing)` : ''}`);
  if (f.reviewsToday.length === 1) parts.push(f.reviewsToday[0]);
  else if (f.reviewsToday.length > 1) parts.push(`${f.reviewsToday.length} reviews scheduled`);
  if (f.overdue > 0) parts.push(`${f.overdue} overdue`);
  const examSoon = f.exam && f.exam.days <= 14 ? f.exam : null;
  if (parts.length === 0 && !(examSoon && examSoon.days <= 3)) return null;
  const count = f.gradedToday.length + (f.dueCards > 0 ? 1 : 0) + f.reviewsToday.length + (f.overdue > 0 ? 1 : 0);
  const title = examSoon ? `${examSoon.name} is ${inDays(examSoon.days)}` : count === 1 ? '1 thing to do today' : `${count} things to do today`;
  const body = parts.length ? parts.join(' · ') : 'Nothing is due, so today is a good day for a practice exam.';
  return { title, body: body.length > 170 ? body.slice(0, 167) + '…' : body };
}
