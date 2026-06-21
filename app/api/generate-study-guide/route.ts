import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

import officeParser from 'officeparser';
import JSZip from 'jszip';
import sharp from 'sharp';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function compressAndUploadImage(
  imageBuffer: Buffer,
  filename: string,
  guideId: string
): Promise<string | null> {
  try {
    // Compress image with sharp — resize to max 1200px wide, 80% JPEG quality
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
  const zip = await JSZip.loadAsync(buffer);
  const images: { name: string; base64: string; mediaType: string }[] = [];

  const mediaFolder = zip.folder('ppt/media');
  if (!mediaFolder) return images;

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  const candidateImages: { name: string; buffer: Buffer; mediaType: string }[] = [];

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (!filename.startsWith('ppt/media/')) continue;
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!imageExtensions.includes(ext)) continue;

    const imageBuffer = await zipEntry.async('nodebuffer');
    // Raise threshold to 50KB — filters thumbnails and decorative elements
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

  // Sort by size descending — largest version of each image wins
  candidateImages.sort((a, b) => b.buffer.length - a.buffer.length);

  // Deduplicate — skip images within 20% size of an already-kept image
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
          max_tokens: 8000,
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

    // Collect all slide image paths for tracking
    const allSlideImagePaths: string[] = [];

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
          let slideImageUrls: { name: string; url: string }[] = [];
          if (isPptx) {
            try {
              const rawImages = await extractPptxImages(file);
              // Generate a temporary guide ID for storage path
              const tempGuideId = `temp-${Date.now()}`;
              for (const img of rawImages) {
                const imageBuffer = Buffer.from(img.base64, 'base64');
                const url = await compressAndUploadImage(imageBuffer, img.name, tempGuideId);
                if (url) slideImageUrls.push({ name: img.name, url });
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
            // Tell Claude about the image URLs to embed
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
        max_tokens: 8000,
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
    return NextResponse.json({ studyGuide: output, slideImagePaths: allSlideImagePaths });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}