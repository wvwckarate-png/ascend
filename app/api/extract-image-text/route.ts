import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { CLAUDE_MODEL } from '../../../lib/models';
import { guardAI } from '../../../lib/apiGuard';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'ocr', 30);
  if (blocked) return blocked;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Phone photos are often HEIC or several MB: normalise to a reasonably sized JPEG Claude accepts.
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = await sharp(bytes).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
          { type: 'text', text: 'Extract all text from this image exactly as written. If it contains handwritten notes, diagrams, or printed text, transcribe everything you can read. Output only the extracted text, no commentary.' }
        ]}]
      }),
    });

    const data = await response.json().catch(() => null);
    const extractedText = data?.content?.[0]?.text;

    if (!response.ok || !extractedText) {
      return NextResponse.json({ error: data?.error?.message || 'Could not extract text from image' }, { status: 500 });
    }

    return NextResponse.json({ transcript: extractedText });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error && err.message ? err.message : 'Extraction failed' }, { status: 500 });
  }
}
