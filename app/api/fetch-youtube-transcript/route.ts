import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { guardAI } from '../../../lib/apiGuard';

export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'youtube', 30);
  if (blocked) return blocked;

  try {
    const { url } = await req.json();

    const videoId = typeof url === 'string' ? extractVideoId(url.trim()) : null;
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json({ error: 'No captions available for this video' }, { status: 404 });
    }

    // Cap very long videos so the transcript can't blow up a later prompt (~200k chars ≈ 50k tokens).
    const transcript = transcriptItems.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim().slice(0, 200000);

    return NextResponse.json({ transcript, videoId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('No transcript') || msg.includes('disabled')) {
      return NextResponse.json({ error: 'No captions available for this video' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Could not fetch transcript. The video may not have captions.' }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}