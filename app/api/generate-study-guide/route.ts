import { NextRequest, NextResponse } from 'next/server';
import officeParser from 'officeparser';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function extractPptxText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const tmpPath = join(tmpdir(), `ascend-${Date.now()}-${file.name}`);
  await writeFile(tmpPath, buffer);
  try {
    const text = await new Promise<string>((resolve, reject) => {
      officeParser.parseOffice(tmpPath, (ast: any, err?: any) => {
        if (err) reject(err);
        else resolve(typeof ast === 'string' ? ast : ast?.text || JSON.stringify(ast));
      });
    });
    return text;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // JSON body — flashcards and exam generation
    if (contentType.includes('application/json')) {
      const { prompt, student, transcripts } = await req.json();

      const toneMap: Record<string, string> = {
        matthew: 'You are Ascend, an AI study assistant for a pre-dental high school junior. Be precise and technically accurate.',
        michael: 'You are Ascend, an AI study assistant for a 9th grade pre-med student. Be clear and engaging.',
        brynne:  'You are Ascend, an AI study assistant for a 5th grade student. Be warm, encouraging, and simple.',
      };

      const messageContent: any[] = [];

      if (transcripts && transcripts.length > 0) {
        for (const t of transcripts) {
          messageContent.push({
            type: 'text',
            text: `--- Resource: ${t.name} ---\n${t.text}\n--- End of resource ---`,
          });
        }
      }

      messageContent.push({
        type: 'text',
        text: `${toneMap[student] || toneMap['matthew']}\n\n${prompt}`,
      });

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
          messages: [{ role: 'user', content: messageContent }],
        }),
      });

      const data = await response.json();
      return NextResponse.json({ studyGuide: data.content[0].text });
    }

    // FormData — study guide generation from files + prompt
    const formData = await req.formData();
    const filesRaw    = formData.getAll('files');
    const singleFile  = formData.get('file');
    const student     = formData.get('student') as string;
    const customPrompt = formData.get('prompt') as string | null;
    const transcriptsRaw = formData.get('transcripts') as string | null;

    const allFiles = filesRaw.length > 0
      ? filesRaw as File[]
      : singleFile ? [singleFile as File] : [];

    const transcripts: { name: string; text: string }[] = transcriptsRaw
      ? JSON.parse(transcriptsRaw)
      : [];

    if (allFiles.length === 0 && !customPrompt && transcripts.length === 0) {
      return NextResponse.json({ error: 'No files, transcripts, or prompt provided' }, { status: 400 });
    }

    const messageContent: any[] = [];

    // Add transcript text resources
    for (const t of transcripts) {
      messageContent.push({
        type: 'text',
        text: `--- Resource: ${t.name} ---\n${t.text}\n--- End of resource ---`,
      });
    }

    // Process each file — PDF as document, PPTX/DOCX as extracted text
    for (const file of allFiles) {
      const name = file.name.toLowerCase();
      const isPptx = name.endsWith('.pptx') || name.endsWith('.ppt');
      const isDocx = name.endsWith('.docx') || name.endsWith('.doc');

      if (isPptx || isDocx) {
        try {
          const extracted = await extractPptxText(file);
          if (extracted.trim()) {
            messageContent.push({
              type: 'text',
              text: `--- Lecture Slides: ${file.name} ---\n${extracted}\n--- End of slides ---`,
            });
          }
        } catch (err) {
          console.error(`Failed to extract ${file.name}:`, err);
          // Skip silently — don't fail the whole request
        }
      } else {
        // Default: treat as PDF
        const bytes  = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        messageContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        });
      }
    }

    const toneMap: Record<string, string> = {
      matthew: 'You are Ascend, an AI study assistant for Matthew, a pre-dental high school junior. Be precise and technically accurate.',
      michael: 'You are Ascend, an AI study assistant for Michael, a 9th grade pre-med student. Be clear and engaging.',
      brynne:  'You are Ascend, an AI study assistant for Brynne, a 5th grade student. Be warm, encouraging, and simple.',
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