import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

import { getSharp, getOfficeParser, getJSZip } from '../../../lib/optionalDeps';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { CLAUDE_MODEL } from '../../../lib/models';
import { guardAI } from '../../../lib/apiGuard';
import { fetchOwnStorageFile } from '../../../lib/storageFetch';


type ContentBlock = Record<string, unknown>;

// Returns Claude-supported media type, 'heic' for HEIC/HEIF (needs conversion), or null for non-image
function getImageMediaType(filename: string, mimeType?: string): string | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  if (ext === '.heic' || ext === '.heif') return 'heic';
  if (ext === '.jpg' || ext === '.jpeg' || mimeType === 'image/jpeg') return 'image/jpeg';
  if (ext === '.png' || mimeType === 'image/png') return 'image/png';
  if (ext === '.gif' || mimeType === 'image/gif') return 'image/gif';
  if (ext === '.webp' || mimeType === 'image/webp') return 'image/webp';
  return null;
}

async function convertImageToJpeg(buffer: Buffer): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) throw new Error('Image conversion is unavailable right now');
  return sharp(buffer).jpeg({ quality: 85 }).toBuffer();
}

async function compressAndUploadImage(
  imageBuffer: Buffer,
  filename: string,
  guideId: string
): Promise<string | null> {
  try {
    const sharp = await getSharp();
    if (!sharp) return null; // slide images are a bonus; the guide is still generated from the slide text
    const compressed = await sharp(imageBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const storagePath = `${guideId}/${filename.replace(/\.[^.]+$/, '')}.jpg`;

    const { error } = await supabaseAdmin.storage
      .from('slide-images')
      .upload(storagePath, compressed, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data } = supabaseAdmin.storage
      .from('slide-images')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Image compression/upload error:', err);
    return null;
  }
}

async function extractPptxImages(file: File): Promise<{ name: string; base64: string; mediaType: string }[]> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const JSZip = await getJSZip();
  if (!JSZip) return [];
  const zip = await JSZip.loadAsync(buffer);
  const images: { name: string; base64: string; mediaType: string }[] = [];

  const mediaFolder = zip.folder('ppt/media');
  if (!mediaFolder) return images;

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  const candidateImages: { name: string; buffer: Buffer; mediaType: string }[] = [];

  for (const [filename, zipEntry] of Object.entries(zip.files) as [string, { async: (t: "nodebuffer") => Promise<Buffer> }][]) {
    if (!filename.startsWith('ppt/media/')) continue;
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!imageExtensions.includes(ext)) continue;

    const imageBuffer = await zipEntry.async('nodebuffer');
    if (imageBuffer.length < 50000) continue;

    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.png' ? 'image/png'
      : ext === '.gif' ? 'image/gif'
      : ext === '.webp' ? 'image/webp'
      : 'image/png';

    candidateImages.push({
      name: filename.split('/').pop() || filename,
      buffer: imageBuffer,
      mediaType,
    });
  }

  candidateImages.sort((a, b) => b.buffer.length - a.buffer.length);

  const kept: typeof candidateImages = [];
  for (const candidate of candidateImages) {
    const isDuplicate = kept.some(k => {
      const ratio = Math.min(k.buffer.length, candidate.buffer.length) / Math.max(k.buffer.length, candidate.buffer.length);
      return ratio > 0.8;
    });
    if (!isDuplicate) kept.push(candidate);
  }

  for (const img of kept) {
    images.push({
      name: img.name,
      base64: img.buffer.toString('base64'),
      mediaType: img.mediaType,
    });
  }

  return images;
}

async function extractPptxText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tmpPath = join(tmpdir(), `ascend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
  await writeFile(tmpPath, buffer);
  try {
    const officeParser = await getOfficeParser();
    if (!officeParser) throw new Error('Slide/Word text extraction is unavailable right now');
    const text = await new Promise<string>((resolve, reject) => {
      officeParser.parseOffice(tmpPath, (ast: unknown, err?: unknown) => {
        if (err) reject(err);
        else resolve(typeof ast === 'string' ? ast : (ast as { text?: string })?.text || JSON.stringify(ast));
      });
    });
    return text;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

// Stored library files are fetched here, server-side, so their size isn't limited by the ~4.5 MB request-body cap.
const MAX_RESOURCE_BYTES = 40 * 1024 * 1024;

async function fetchStoredResources(list: { name: string; url: string }[]): Promise<{ files: File[]; failed: string[] }> {
  const slots: (File | null)[] = list.map(() => null);
  const failed: string[] = [];
  await Promise.all(list.map(async (r, i) => {
    try {
      if (!r || typeof r.name !== 'string') throw new Error('bad resource');
      // Library names have no extension ("Lecture 1"), but the stored path does — use it so slides/images/PDFs are handled correctly.
      const ext = (new URL(r.url).pathname.match(/\.[a-z0-9]{2,5}$/i)?.[0] || '').toLowerCase();
      const fname = ext && !r.name.toLowerCase().endsWith(ext) ? r.name + ext : r.name;
      slots[i] = await fetchOwnStorageFile(r.url, fname, MAX_RESOURCE_BYTES);
    } catch (err) {
      console.error(`Could not fetch stored resource ${r?.name}:`, err);
      failed.push(r?.name || 'file');
    }
  }));
  return { files: slots.filter((f): f is File => f !== null), failed }; // keeps the order the student picked them in
}

// Non-streaming Claude call. Returns the text, or throws with the API's own error message.
async function callClaude(messageContent: ContentBlock[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });
  const data = await response.json().catch(() => null);
  const text = data?.content?.[0]?.text;
  if (!response.ok || typeof text !== 'string') {
    throw new Error(data?.error?.message || `Anthropic API error (${response.status})`);
  }
  return text;
}

export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'generate', 40);
  if (blocked) return blocked;

  try {
    const contentType = req.headers.get('content-type') || '';

    // JSON body — flashcards and exam generation (no streaming)
    if (contentType.includes('application/json')) {
      const { prompt, student, transcripts } = await req.json();

      const toneMap: Record<string, string> = {
        matthew: 'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
        michael: 'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
        brynne:  'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
      };

      const messageContent: ContentBlock[] = [];

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

      return NextResponse.json({ studyGuide: await callClaude(messageContent) });
    }

    // FormData — study guide generation (streaming)
    const formData = await req.formData();
    const filesRaw     = formData.getAll('files');
    const singleFile   = formData.get('file');
    const student      = formData.get('student') as string;
    const customPrompt = formData.get('prompt') as string | null;
    const transcriptsRaw = formData.get('transcripts') as string | null;

    const uploadedFiles = filesRaw.length > 0
      ? filesRaw as File[]
      : singleFile ? [singleFile as File] : [];

    // Library files arrive as storage URLs (see fetchStoredResources) instead of re-uploaded bytes.
    let storedList: { name: string; url: string }[] = [];
    try { storedList = JSON.parse((formData.get('resources') as string | null) || '[]'); } catch { storedList = []; }
    const stored = await fetchStoredResources(Array.isArray(storedList) ? storedList.slice(0, 20) : []);
    const allFiles = [...stored.files, ...uploadedFiles];

    const transcripts: { name: string; text: string }[] = transcriptsRaw
      ? JSON.parse(transcriptsRaw)
      : [];

    const requestType = formData.get('type') as string | null;

    if (allFiles.length === 0 && !customPrompt && transcripts.length === 0) {
      return NextResponse.json({ error: 'No files, transcripts, or prompt provided' }, { status: 400 });
    }
    if (stored.failed.length > 0 && allFiles.length === 0 && transcripts.length === 0) {
      return NextResponse.json({ error: `Could not read ${stored.failed.join(', ')}. Try re-uploading the file.` }, { status: 422 });
    }

    const messageContent: ContentBlock[] = [];

    for (const t of transcripts) {
      messageContent.push({
        type: 'text',
        text: `--- Resource: ${t.name} ---\n${t.text}\n--- End of resource ---`,
      });
    }

    const allSlideImagePaths: string[] = [];
    let imageContextAdded = false;

    for (const file of allFiles) {
      const name = file.name.toLowerCase();
      const isPptx = name.endsWith('.pptx') || name.endsWith('.ppt');
      const isDocx = name.endsWith('.docx') || name.endsWith('.doc');
      const imageMediaType = getImageMediaType(file.name, file.type);

      if (isPptx || isDocx) {
        try {
          const extracted = await extractPptxText(file);
          const cleanText = extracted.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
          const wordCount = cleanText.split(/\s+/).filter(w => w.length > 3).length;

          const slideImageUrls: { name: string; url: string }[] = [];
          if (isPptx) {
            try {
              const rawImages = await extractPptxImages(file);
              const tempGuideId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              // Compress + upload in small parallel batches (sequential uploads can blow the function time limit on big decks).
              for (let i = 0; i < rawImages.length; i += 6) {
                const batch = rawImages.slice(i, i + 6);
                const urls = await Promise.all(batch.map(img =>
                  compressAndUploadImage(Buffer.from(img.base64, 'base64'), img.name, tempGuideId)));
                batch.forEach((img, j) => { if (urls[j]) slideImageUrls.push({ name: img.name, url: urls[j] as string }); });
              }
              allSlideImagePaths.push(...slideImageUrls.map(img => img.url));
            } catch (imgErr) {
              console.error(`Failed to extract/upload images from ${file.name}:`, imgErr);
            }
          }

          if (cleanText.length > 500 && wordCount > 30) {
            messageContent.push({
              type: 'text',
              text: `--- Lecture Slides: ${file.name} ---\nIMPORTANT: Generate content ONLY from the text and images provided. Do not use outside knowledge.\n${cleanText}\n--- End of slide text ---`,
            });
            if (slideImageUrls.length > 0) {
              const imageList = slideImageUrls.map((img, i) =>
                `Image ${i + 1}: ${img.name} → <div class="sg-figure"><img src="${img.url}" style="max-width:100%;border-radius:8px;" alt="${img.name}" /><span class="sg-figure-caption">Figure ${i + 1} — [write a descriptive caption based on what this image shows]</span></div>`
              ).join('\n');
              messageContent.push({
                type: 'text',
                text: `PROFESSOR SLIDE IMAGES — The following ${slideImageUrls.length} image(s) were extracted from the lecture slides. These are the professor's actual figures and may appear on exams. Embed each one directly in the study guide near the section it illustrates using the exact HTML provided. Do not skip any image.\n\n${imageList}`,
              });
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
      } else if (imageMediaType) {
        // Image file — send directly to Claude as vision input
        try {
          const bytes = await file.arrayBuffer();
          const rawBuffer = Buffer.from(bytes);
          let finalBuffer: Buffer;
          let finalMediaType = imageMediaType;

          // Convert HEIC/HEIF or any unsupported format to JPEG
          if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(imageMediaType)) {
            finalBuffer = await convertImageToJpeg(rawBuffer);
            finalMediaType = 'image/jpeg';
          } else {
            finalBuffer = rawBuffer;
          }

          // Resize large images before sending to Claude (max 4MB base64 safe)
          if (finalBuffer.length > 3 * 1024 * 1024) {
            const sharp = await getSharp();
            if (!sharp) throw new Error('Image resizing is unavailable right now');
            finalBuffer = await sharp(finalBuffer)
              .resize({ width: 1600, withoutEnlargement: true })
              .jpeg({ quality: 82 })
              .toBuffer();
            finalMediaType = 'image/jpeg';
          }

          // Add context note once before the first image block
          if (!imageContextAdded) {
            messageContent.push({
              type: 'text',
              text: 'The following images are pages from the student\'s study materials — textbook pages, worksheets, handwritten notes, or old exams photographed with a phone. Read all visible text and diagrams carefully and treat them as primary source material.',
            });
            imageContextAdded = true;
          }

          const base64 = finalBuffer.toString('base64');
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: finalMediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          });
        } catch (err) {
          console.error(`Failed to process image ${file.name}:`, err);
        }
      } else {
        // PDF
        const bytes  = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        messageContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        });
      }
    }

    const toneMap: Record<string, string> = {
      matthew: 'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
      michael: 'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
      brynne:  'You are Ascend, an expert study assistant. Calibrate depth and vocabulary to match the level of the uploaded materials. Your job is exam preparation — stay strictly within what was taught.',
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

    // Non-streaming for flashcards and exams
    if (requestType === 'flashcards' || requestType === 'exam') {
      return NextResponse.json({ studyGuide: await callClaude(messageContent) });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first so client can capture slideImagePaths
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', slideImagePaths: allSlideImagePaths })}\n\n`));

          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY!,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: CLAUDE_MODEL,
              max_tokens: 8000,
              stream: true,
              messages: [{ role: 'user', content: messageContent }],
            }),
          });

          if (!anthropicResponse.ok || !anthropicResponse.body) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Anthropic API error' })}\n\n`));
            controller.close();
            return;
          }

          const reader = anthropicResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`));
                }
              } catch {}
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Generation failed' })}\n\n`));
            controller.close();
          } catch {}
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error && error.message ? error.message : 'Failed to generate content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}