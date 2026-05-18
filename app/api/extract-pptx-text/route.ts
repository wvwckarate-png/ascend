import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      return NextResponse.json({ error: 'No text could be extracted from this file' }, { status: 400 });
    }

    return NextResponse.json({ transcript: text });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 });
  }
}