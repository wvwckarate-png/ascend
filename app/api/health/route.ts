import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '../../../lib/apiGuard';
import { getSharp, getOfficeParser, getJSZip } from '../../../lib/optionalDeps';

export const dynamic = 'force-dynamic';

// Quick "is everything wired up?" check — booleans only, never values. Open it from the app's own origin.
export async function GET(req: NextRequest) {
  const blocked = requireSameOrigin(req);
  if (blocked) return blocked;

  const [sharp, officeParser, jszip] = await Promise.all([getSharp(), getOfficeParser(), getJSZip()]);
  return NextResponse.json({
    env: {
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      parentPassword: !!process.env.PARENT_PASSWORD,
      cronSecret: !!process.env.CRON_SECRET,
    },
    libs: { sharp: !!sharp, officeParser: !!officeParser, jszip: !!jszip },
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
