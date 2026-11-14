import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

// Server-side "who is calling?" for the sign-in system. Import from API routes only.
export type Caller = { userId: string; email: string; role: 'parent' | 'student'; studentId: string | null; needsPassword: boolean };

/** The invited person behind this request's sign-in token, or null. Also links their account row to their login the first time. */
export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.email) return null;
  const email = user.email.toLowerCase();
  const { data: row } = await supabaseAdmin.from('accounts').select('email, user_id, role, student_id, password_set_at').eq('email', email).maybeSingle();
  if (!row) return null;                                   // signed in, but not (or no longer) invited
  if (row.user_id !== user.id) await supabaseAdmin.from('accounts').update({ user_id: user.id }).eq('email', email);
  // needsPassword: they got in through the invitation link but never chose a password of their own.
  return { userId: user.id, email, role: row.role, studentId: row.student_id, needsPassword: !row.password_set_at };
}

/** Does this text match the parent dashboard password? (The older way in; still accepted while logins roll out.) */
export function isParentPassword(given: unknown): boolean {
  const expected = process.env.PARENT_PASSWORD;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the request comes from a parent: a signed-in parent account, or the parent dashboard password. */
export async function isParent(req: NextRequest, password: unknown): Promise<boolean> {
  if (isParentPassword(password)) return true;
  const caller = await getCaller(req);
  return caller?.role === 'parent';
}
