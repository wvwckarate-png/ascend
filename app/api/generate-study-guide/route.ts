import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // JSON body — flashcards and exam generation
    if (contentType.includes('application/json')) {
      const { prompt, student } = await req.json();

      const toneMap: Record<string, string> = {
        matthew: 'You are Ascend, an AI study assistant for a pre-dental high school junior. Be precise and technically accurate.',
        michael: 'You are Ascend, an AI study assistant for a 9th grade pre-med student. Be clear and engaging.',
        brynne: 'You are Ascend, an AI study assistant for a 5th grade student. Be warm, encouraging, and simple.',
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: `${toneMap[student] || toneMap['matthew']}\n\n${prompt}` }],
        }),
      });

      const data = await response.json();
      return NextResponse.json({ studyGuide: data.content[0].text });
    }

    // FormData — study guide generation from files + prompt
    const formData = await req.formData();
    const filesRaw = formData.getAll('files');
    const singleFile = formData.get('file');
    const student = formData.get('student') as string;
    const customPrompt = formData.get('prompt') as string | null;

    // Support both 'files' (multi) and 'file' (legacy single)
    const allFiles = filesRaw.length > 0
      ? filesRaw as File[]
      : singleFile ? [singleFile as File] : [];

    if (allFiles.length === 0 && !customPrompt) {
      return NextResponse.json({ error: 'No files or prompt provided' }, { status: 400 });
    }

    // Build message content
    const messageContent: any[] = [];

    // Add all PDF files
    for (const file of allFiles) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      messageContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      });
    }

    // Add the prompt
    const toneMap: Record<string, string> = {
      matthew: 'You are Ascend, an AI study assistant for Matthew, a pre-dental high school junior. Be precise and technically accurate.',
      michael: 'You are Ascend, an AI study assistant for Michael, a 9th grade pre-med student. Be clear and engaging.',
      brynne: 'You are Ascend, an AI study assistant for Brynne, a 5th grade student. Be warm, encouraging, and simple.',
    };

    const promptText = customPrompt || `${toneMap[student] || toneMap['matthew']}

Generate a comprehensive study guide from this document with these sections:

# Key Concepts
List and explain the most important concepts.

# Summary
A clear, well-organized summary.

# Review Questions
5 thoughtful review questions numbered 1-5.

Format with clear markdown headers.`;

    messageContent.push({ type: 'text', text: promptText });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: 'Anthropic API error', details: errData }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ studyGuide: data.content[0].text });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}