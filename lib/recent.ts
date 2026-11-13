// "Recently opened" files and saved resources, remembered on this device (a convenience, not study data).
export type RecentItem = { key: string; made: boolean; kind: string; title: string; sub: string; href: string };
const KEY = (studentId: string) => `ascend:recent:${studentId}`;

export function readRecent(studentId: string): RecentItem[] {
  try { const v = JSON.parse(localStorage.getItem(KEY(studentId)) || '[]'); return Array.isArray(v) ? v.filter(x => x && typeof x.key === 'string' && typeof x.href === 'string').slice(0, 8) : []; } catch { return []; }
}
export function noteRecent(studentId: string, item: RecentItem) {
  try { localStorage.setItem(KEY(studentId), JSON.stringify([item, ...readRecent(studentId).filter(x => x.key !== item.key)].slice(0, 8))); } catch { /* private window: nothing to remember */ }
}
export function forgetRecent(studentId: string, key: string) {
  try { localStorage.setItem(KEY(studentId), JSON.stringify(readRecent(studentId).filter(x => x.key !== key))); } catch {}
}
