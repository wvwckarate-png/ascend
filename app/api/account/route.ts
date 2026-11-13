import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '../../../lib/authServer';
import { requireSameOrigin } from '../../../lib/apiGuard';

export const dynamic = 'force-dynamic';

// "Who am I?" for the signed-in person: their role and (for a student) which student they are.
export async function GET(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ account: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ account: { email: caller.email, role: caller.role, studentId: caller.studentId } }, { headers: { 'Cache-Control': 'no-store' } });
}
