import { NextRequest, NextResponse } from 'next/server';
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

/** For server routes: refuses anyone who isn't a signed-in, invited person. With `student`, also refuses a student acting for someone else. */
export async function requireSignedIn(req: NextRequest, student?: unknown): Promise<NextResponse | null> {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  if (student !== undefined && caller.role !== 'parent' && caller.studentId !== student) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  return null;
}

/** True when the request comes from a signed-in parent. */
export async function isParent(req: NextRequest): Promise<boolean> {
  return (await getCaller(req))?.role === 'parent';
}
