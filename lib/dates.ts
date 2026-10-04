// Date helpers. `Date.toISOString()` is UTC, so in the evening (US time zones) it returns *tomorrow's*
// date. Everything the app stores or compares as a YYYY-MM-DD string must use local time instead.

export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
