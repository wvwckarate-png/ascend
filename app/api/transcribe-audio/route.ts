import { NextRequest, NextResponse } from 'next/server';
import { guardAI } from '../../../lib/apiGuard';
import { fetchOwnStorageFile } from '../../../lib/storageFetch';

export const maxDuration = 60;

// Whisper's hard limit
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Accepts either { url, name } (a file already in our storage — preferred, no size cap from the host) or a small multipart "file".
export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'audio', 20);
  if (blocked) return blocked;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Audio transcription is not set up yet (missing OPENAI_API_KEY).' }, { status: 503 });
  }

  try {
    let file: File;
    if ((req.headers.get('content-type') || '').includes('application/json')) {
      const { url, name } = await req.json();
      file = await fetchOwnStorageFile(url, typeof name === 'string' && name ? name : 'audio.mp3', MAX_AUDIO_BYTES);
    } else {
      const formData = await req.formData();
      const f = formData.get('file') as File | null;
      if (!f) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      file = f;
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB.' }, { status: 400 });
    }

    const whisperForm = new FormData();
    whisperForm.append('file', file, file.name);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      return NextResponse.json({ error: err?.error?.message || 'Transcription failed' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ transcript: data.text });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error && err.message ? err.message : 'Transcription failed' }, { status: 500 });
  }
}
