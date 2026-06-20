import { NextRequest, NextResponse } from 'next/server';
import officeParser from 'officeparser';
import JSZip from 'jszip';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function extractPptxImages(file: File): Promise<{ name: string; base64: string; mediaType: string }[]> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const zip = await JSZip.loadAsync(buffer);
  const images: { name: string; base64: string; mediaType: string }[] = [];

  const mediaFolder = zip.folder('ppt/media');
  if (!mediaFolder) return images;

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (!filename.startsWith('ppt/media/')) continue;
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!imageExtensions.includes(ext)) continue;

    const imageBuffer = await zipEntry.async('nodebuffer');
    // Skip tiny files — likely icons or decorative elements
    if (imageBuffer.length < 10000) continue;

    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.png' ? 'image/png'
      : ext === '.gif' ? 'image/gif'
      : ext === '.webp' ? 'image/webp'
      : 'image/png';

    images.push({
      name: filename.split('/').pop() || filename,
      base64: imageBuffer.toString('base64'),
      mediaType,
    });
  }

  return images;
}

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
          const cleanText = extracted.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          const wordCount = cleanText.split(/\s+/).filter(w => w.length > 3).length;

          // Extract embedded images if it's a PPTX
          let slideImages: { name: string; base64: string; mediaType: string }[] = [];
          if (isPptx) {
            try {
              slideImages = await extractPptxImages(file);
            } catch (imgErr) {
              console.error(`Failed to extract images from ${file.name}:`, imgErr);
            }
          }

          if (cleanText.length > 500 && wordCount > 30) {
            messageContent.push({
              type: 'text',
              text: `--- Lecture Slides: ${file.name} ---\nIMPORTANT: Generate content ONLY from the text and images provided. Do not use outside knowledge.\n${cleanText}\n--- End of slide text ---`,
            });
            // Add extracted images as vision inputs
            if (slideImages.length > 0) {
              messageContent.push({
                type: 'text',
                text: `The following ${slideImages.length} image(s) were embedded in the lecture slides. These are the professor's actual figures and diagrams. Use them directly in the study guide where relevant — place each image near the section it illustrates. These images may appear on exams, so preserve them exactly.`,
              });
              for (const img of slideImages) {
                messageContent.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: img.base64,
                  },
                });
              }
            }
          } else {
            messageContent.push({
              type: 'text',
              text: `--- Lecture Slides: ${file.name} ---\nThis file could not be read. Inform the student that this file format could not be extracted and no content was generated from it.\n--- End of slides ---`,
            });
          }
        } catch (err) {
          console.error(`Failed to extract ${file.name}:`, err);
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
    let output = data.content[0].text || '';
    // Strip any preamble before the first HTML tag
    const htmlStart = output.indexOf('<');
    if (htmlStart > 0) output = output.slice(htmlStart);
    // Strip markdown code fences if Claude wrapped the HTML
    output = output.replace(/^```html?\s*/i, '').replace(/\s*```$/, '').trim();
    return NextResponse.json({ studyGuide: output });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}