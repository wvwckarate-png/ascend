import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireSameOrigin } from '../../../lib/apiGuard';

export const dynamic = 'force-dynamic';

// Which students have a PIN? Booleans only — the PIN itself never leaves the server.
export async function GET(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  const { data, error } = await supabaseAdmin.from('students').select('id, pin');
  if (error || !data) return NextResponse.json({ error: 'Could not check PINs' }, { status: 500 });

  const status: Record<string, boolean> = {};
  data.forEach(s => { status[s.id] = !!s.pin; });
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
