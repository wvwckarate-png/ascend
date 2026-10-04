import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const expected = process.env.PARENT_PASSWORD;
  // Fail closed: with no configured password, nothing may match (undefined === undefined would).
  if (!expected) {
    return NextResponse.json({ success: false, error: 'Parent password not configured' }, { status: 500 });
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (typeof password === 'string' && password === expected) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
