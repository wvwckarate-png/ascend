import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    // Extract video ID from various YouTube URL formats
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Fetch the video page to get caption track info
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0' }
    });
    const pageHtml = await pageRes.text();

    // Extract caption track URL from page HTML
    const captionUrl = extractCaptionUrl(pageHtml);
    if (!captionUrl) {
      return NextResponse.json({ error: 'No captions available for this video' }, { status: 404 });
    }

    // Fetch the caption XML
    const captionRes = await fetch(captionUrl);
    const captionXml = await captionRes.text();

    // Parse XML into plain text transcript
    const transcript = parseCaption(captionXml);
    if (!transcript) {
      return NextResponse.json({ error: 'Could not parse captions' }, { status: 500 });
    }

    // Get video title from page
    const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video';

    return NextResponse.json({ transcript, title, videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch transcript' }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // raw video ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractCaptionUrl(html: string): string | null {
  // Look for caption track in the page's JSON data
  const match = html.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
  if (!match) return null;
  // Unescape unicode
  return match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
}

function parseCaption(xml: string): string {
  // Remove XML tags and decode HTML entities
  const text = xml
    .replace(/<text[^>]*>/g, '')
    .replace(/<\/text>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}