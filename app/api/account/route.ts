import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '../../../lib/authServer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireSameOrigin } from '../../../lib/apiGuard';

export const dynamic = 'force-dynamic';

// Has the database been given its per-student rules yet (supabase/v2.19.0-lockdown-step1.sql)? Once it has, the pages
// make every data request as the signed-in person. Checked by looking for the helper that step creates; remembered once true.
let secured = false;
async function databaseIsSecured(): Promise<boolean> {
  if (secured) return true;
  const { error } = await supabaseAdmin.rpc('my_student_ids');
  if (!error) secured = true;
  return secured;
}

// "Who am I?" for the signed-in person: their role and (for a student) which student they are.
export async function GET(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ account: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ account: { email: caller.email, role: caller.role, studentId: caller.studentId, needsPassword: caller.needsPassword, secured: await databaseIsSecured() } }, { headers: { 'Cache-Control': 'no-store' } });
}

// Called right after the person saves a password on the "Choose your password" page.
export async function POST(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseAdmin.from('accounts').update({ password_set_at: new Date().toISOString() }).eq('email', caller.email);
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
