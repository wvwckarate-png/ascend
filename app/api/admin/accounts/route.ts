import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isStudentId } from '../../../../lib/supabaseAdmin';
import { clientKey, rateLimit, requireSameOrigin, resetLimit } from '../../../../lib/apiGuard';
import { isParent } from '../../../../lib/authServer';

export const dynamic = 'force-dynamic';

// Parent-only: who is invited to Ascend. body: { password?, action: 'list' | 'invite' | 'resend' | 'remove', email?, role?, student? }
// A parent proves who they are with their sign-in (Authorization header) or the parent dashboard password.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function list() {
  const [{ data: rows, error }, users] = await Promise.all([
    supabaseAdmin.from('accounts').select('email, user_id, role, student_id, invited_at, last_invite_at, password_set_at').order('invited_at', { ascending: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  if (error) return null;
  const byEmail = new Map((users.data?.users || []).map(u => [(u.email || '').toLowerCase(), u]));
  return (rows || []).map(r => ({
    email: r.email, role: r.role, studentId: r.student_id, invitedAt: r.invited_at, lastInviteAt: r.last_invite_at,
    signedIn: !!r.password_set_at,                           // has chosen their own password
    opened: !!byEmail.get(r.email)?.last_sign_in_at,          // has at least opened the invitation link
  }));
}

export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req) || rateLimit(`accounts:${clientKey(req)}`, 40, 10 * 60 * 1000);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  // Password guesses share the parent-password limit: 8 wrong tries per 10 minutes per device.
  const guessKey = `parent:${clientKey(req)}`;
  if (typeof body.password === 'string' && body.password) { const tooMany = rateLimit(guessKey, 8, 10 * 60 * 1000); if (tooMany) return tooMany; }
  if (!(await isParent(req, body.password))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  resetLimit(guessKey);

  const action = body.action;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
  const redirectTo = `${origin}/welcome`;

  if (action === 'invite' || action === 'resend') {
    if (!EMAIL.test(email) || email.length > 254) return NextResponse.json({ error: 'That doesn’t look like an email address.' }, { status: 400 });
    const { data: existing } = await supabaseAdmin.from('accounts').select('email, role, student_id').eq('email', email).maybeSingle();

    if (action === 'invite') {
      const role = body.role;
      if (role !== 'parent' && role !== 'student') return NextResponse.json({ error: 'Choose parent or student.' }, { status: 400 });
      if (role === 'student' && !isStudentId(body.student)) return NextResponse.json({ error: 'Choose which student this is.' }, { status: 400 });
      if (existing) return NextResponse.json({ error: 'That email is already invited. Use Resend to send the link again.' }, { status: 409 });
      if (role === 'student') {
        const { data: taken } = await supabaseAdmin.from('accounts').select('email').eq('student_id', body.student).maybeSingle();
        if (taken) return NextResponse.json({ error: `That student already has a sign-in (${taken.email}). Remove it first to change the email.` }, { status: 409 });
      }
      const { error: rowError } = await supabaseAdmin.from('accounts').insert({ email, role, student_id: role === 'student' ? body.student : null });
      if (rowError) { console.error('accounts insert failed:', rowError.message); return NextResponse.json({ error: 'Could not save the invitation.' }, { status: 500 }); }
    } else if (!existing) {
      return NextResponse.json({ error: 'That email has not been invited yet.' }, { status: 404 });
    }

    // New person: an invitation email. Someone who already has a login: a "set a new password" email instead.
    let { data: sent, error: sendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (sendError && /already|registered|exists/i.test(sendError.message)) {
      const again = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
      sendError = again.error; sent = { user: null } as unknown as typeof sent;
    }
    if (sendError) {
      console.error('invite email failed:', sendError.message);
      const slow = /rate|limit|seconds/i.test(sendError.message);
      // The invitation itself is saved, so Resend will work once the email can go out.
      return NextResponse.json({ error: slow ? 'Saved, but the email could not be sent yet: only a few emails can go out per hour. Use Resend in a little while.' : 'Saved, but the email could not be sent. Use Resend to try again.', accounts: await list() }, { status: 502 });
    }
    await supabaseAdmin.from('accounts').update({ last_invite_at: new Date().toISOString(), ...(sent?.user?.id ? { user_id: sent.user.id } : {}) }).eq('email', email);
  } else if (action === 'remove') {
    const { data: row } = await supabaseAdmin.from('accounts').select('email, user_id, role').eq('email', email).maybeSingle();
    if (!row) return NextResponse.json({ error: 'No such invitation.' }, { status: 404 });
    if (row.role === 'parent') {
      const { count } = await supabaseAdmin.from('accounts').select('email', { count: 'exact', head: true }).eq('role', 'parent');
      if ((count || 0) <= 1) return NextResponse.json({ error: 'This is the only parent account, so it can’t be removed.' }, { status: 400 });
    }
    // Removing the sign-in never touches the student's classes, files or study history.
    if (row.user_id) { const { error } = await supabaseAdmin.auth.admin.deleteUser(row.user_id); if (error && !/not found/i.test(error.message)) { console.error('deleteUser failed:', error.message); return NextResponse.json({ error: 'Could not remove that sign-in.' }, { status: 500 }); } }
    await supabaseAdmin.from('accounts').delete().eq('email', email);
  } else if (action !== 'list') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const accounts = await list();
  if (!accounts) return NextResponse.json({ error: 'Could not load invitations.' }, { status: 500 });
  return NextResponse.json({ accounts }, { headers: { 'Cache-Control': 'no-store' } });
}
