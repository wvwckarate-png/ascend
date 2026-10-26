// Turns what a student uploaded (library files, transcripts, files attached in the generator) into the content blocks
// Claude reads. Shared by the generate route and the quality-check route so both see exactly the same material.
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getSharp, getOfficeParser, getJSZip } from './optionalDeps';
import { supabaseAdmin } from './supabaseAdmin';
import { fetchOwnStorageFile } from './storageFetch';
import type { ContentBlock } from './claude';

const MAX_RESOURCE_BYTES = 40 * 1024 * 1024;

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

async function compressAndUploadImage(imageBuffer: Buffer, filename: string, guideId: string): Promise<string | null> {
  try {
    const sharp = await getSharp();
    if (!sharp) return null; // slide images are a bonus; the guide is still generated from the slide text
    const compressed = await sharp(imageBuffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const storagePath = `${guideId}/${filename.replace(/\.[^.]+$/, '')}.jpg`;
    const { error } = await supabaseAdmin.storage.from('slide-images').upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: true });
    if (error) { console.error('Storage upload error:', error); return null; }
    return supabaseAdmin.storage.from('slide-images').getPublicUrl(storagePath).data.publicUrl;
  } catch (err) {
    console.error('Image compression/upload error:', err);
    return null;
  }
}

async function extractPptxImages(file: File): Promise<{ name: string; base64: string; mediaType: string }[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const JSZip = await getJSZip();
  if (!JSZip) return [];
  const zip = await JSZip.loadAsync(buffer);
  if (!zip.folder('ppt/media')) return [];

  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  const candidates: { name: string; buffer: Buffer; mediaType: string }[] = [];
  for (const [filename, zipEntry] of Object.entries(zip.files) as [string, { async: (t: 'nodebuffer') => Promise<Buffer> }][]) {
    if (!filename.startsWith('ppt/media/')) continue;
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    if (!imageExtensions.includes(ext)) continue;
    const imageBuffer = await zipEntry.async('nodebuffer');
    if (imageBuffer.length < 50000) continue;
    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/png';
    candidates.push({ name: filename.split('/').pop() || filename, buffer: imageBuffer, mediaType });
  }
  candidates.sort((a, b) => b.buffer.length - a.buffer.length);
  const kept: typeof candidates = [];
  for (const c of candidates) {
    const dup = kept.some(k => Math.min(k.buffer.length, c.buffer.length) / Math.max(k.buffer.length, c.buffer.length) > 0.8);
    if (!dup) kept.push(c);
  }
  return kept.map(k => ({ name: k.name, base64: k.buffer.toString('base64'), mediaType: k.mediaType }));
}

async function extractOfficeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tmpPath = join(tmpdir(), `ascend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
  await writeFile(tmpPath, buffer);
  try {
    const officeParser = await getOfficeParser();
    if (!officeParser) throw new Error('Slide/Word text extraction is unavailable right now');
    return await new Promise<string>((resolve, reject) => {
      officeParser.parseOffice(tmpPath, (ast: unknown, err?: unknown) => {
        if (err) reject(err);
        else resolve(typeof ast === 'string' ? ast : (ast as { text?: string })?.text || JSON.stringify(ast));
      });
    });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

// Library files are fetched here, server-side, straight from this project's own storage (no ~4.5 MB request cap).
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
  return { files: slots.filter((f): f is File => f !== null), failed };
}

const KIND_LABEL: Record<string, string> = {
  youtube: 'YouTube video transcript — outside source, not the professor’s own material',
  audio: 'lecture/audio recording transcript',
  image: 'photographed page (OCR)',
  pdf: 'document',
  pptx: 'lecture slides',
  link: 'web link',
};

export type Materials = {
  content: ContentBlock[];
  slideImagePaths: string[];
  failed: string[];
  fileCount: number;
  transcriptCount: number;
};

/**
 * Reads the material fields of a request: `files` / `file` (attached directly), `resources` (JSON list of library files),
 * `transcripts` (JSON list of {name, text, kind?}).
 *  - slideImages: also pull pictures out of slide decks and upload them (study guides only; costs time, so never for checks).
 *  - cache: mark the end of the material for prompt caching, so the draft and the follow-up checks read it at a fraction of the price.
 */
export async function buildMaterials(formData: FormData, opts: { slideImages: boolean; cache?: boolean }): Promise<Materials> {
  const filesRaw = formData.getAll('files');
  const singleFile = formData.get('file');
  const uploaded = (filesRaw.length > 0 ? filesRaw : singleFile ? [singleFile] : []) as File[];

  let storedList: { name: string; url: string }[] = [];
  try { storedList = JSON.parse((formData.get('resources') as string | null) || '[]'); } catch { storedList = []; }
  const stored = await fetchStoredResources(Array.isArray(storedList) ? storedList.slice(0, 20) : []);
  const allFiles = [...stored.files, ...uploaded];

  let transcripts: { name: string; text: string; kind?: string }[] = [];
  try { transcripts = JSON.parse((formData.get('transcripts') as string | null) || '[]'); } catch { transcripts = []; }

  const content: ContentBlock[] = [];
  const slideImagePaths: string[] = [];
  let imageContextAdded = false;

  for (const t of transcripts) {
    const label = t.kind && KIND_LABEL[t.kind] ? ` (${KIND_LABEL[t.kind]})` : '';
    content.push({ type: 'text', text: `--- Resource${label}: ${t.name} ---\n${t.text}\n--- End of resource ---` });
  }

  for (const file of allFiles) {
    const name = file.name.toLowerCase();
    const isPptx = name.endsWith('.pptx') || name.endsWith('.ppt');
    const isDocx = name.endsWith('.docx') || name.endsWith('.doc');
    const imageMediaType = getImageMediaType(file.name, file.type);

    if (isPptx || isDocx) {
      try {
        const extracted = await extractOfficeText(file);
        // Keep real characters (Greek letters, °, µ, subscripts, arrows…) — only strip control characters.
        const cleanText = extracted.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        const wordCount = cleanText.split(/\s+/).filter(w => w.length > 3).length;

        const slideImageUrls: { name: string; url: string }[] = [];
        if (isPptx && opts.slideImages) {
          try {
            const rawImages = await extractPptxImages(file);
            const tempGuideId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            for (let i = 0; i < rawImages.length; i += 6) {
              const batch = rawImages.slice(i, i + 6);
              const urls = await Promise.all(batch.map(img => compressAndUploadImage(Buffer.from(img.base64, 'base64'), img.name, tempGuideId)));
              batch.forEach((img, j) => { if (urls[j]) slideImageUrls.push({ name: img.name, url: urls[j] as string }); });
            }
            slideImagePaths.push(...slideImageUrls.map(img => img.url));
          } catch (imgErr) {
            console.error(`Failed to extract/upload images from ${file.name}:`, imgErr);
          }
        }

        if (cleanText.length > 500 && wordCount > 30) {
          content.push({ type: 'text', text: `--- ${isPptx ? 'Lecture Slides' : 'Document'}: ${file.name} ---\nIMPORTANT: Generate content ONLY from the text and images provided. Do not use outside knowledge.\n${cleanText}\n--- End of ${isPptx ? 'slide text' : 'document'} ---` });
          if (slideImageUrls.length > 0) {
            const imageList = slideImageUrls.map((img, i) =>
              `Image ${i + 1}: ${img.name} → <div class="sg-figure"><img src="${img.url}" style="max-width:100%;border-radius:8px;" alt="${img.name}" /><span class="sg-figure-caption">Figure ${i + 1} — [write a descriptive caption based on what this image shows]</span></div>`
            ).join('\n');
            content.push({ type: 'text', text: `PROFESSOR SLIDE IMAGES — The following ${slideImageUrls.length} image(s) were extracted from the lecture slides. These are the professor's actual figures and may appear on exams. Embed each one directly in the study guide near the section it illustrates using the exact HTML provided. Do not skip any image.\n\n${imageList}` });
          }
        } else {
          content.push({ type: 'text', text: `--- ${isPptx ? 'Lecture Slides' : 'Document'}: ${file.name} ---\nThis file could not be read. Inform the student that this file format could not be extracted and no content was generated from it.\n--- End ---` });
        }
      } catch (err) {
        console.error(`Failed to extract ${file.name}:`, err);
      }
    } else if (imageMediaType) {
      try {
        const rawBuffer = Buffer.from(await file.arrayBuffer());
        let finalBuffer: Buffer = rawBuffer;
        let finalMediaType = imageMediaType;
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(imageMediaType)) {
          finalBuffer = await convertImageToJpeg(rawBuffer);
          finalMediaType = 'image/jpeg';
        }
        if (finalBuffer.length > 3 * 1024 * 1024) {
          const sharp = await getSharp();
          if (!sharp) throw new Error('Image resizing is unavailable right now');
          finalBuffer = await sharp(finalBuffer).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
          finalMediaType = 'image/jpeg';
        }
        if (!imageContextAdded) {
          content.push({ type: 'text', text: 'The following images are pages from the student\'s study materials — textbook pages, worksheets, handwritten notes, or old exams photographed with a phone. Read all visible text and diagrams carefully and treat them as primary source material.' });
          imageContextAdded = true;
        }
        content.push({ type: 'text', text: `--- Image: ${file.name} ---` });
        content.push({ type: 'image', source: { type: 'base64', media_type: finalMediaType, data: finalBuffer.toString('base64') } });
      } catch (err) {
        console.error(`Failed to process image ${file.name}:`, err);
      }
    } else {
      // PDF — the title lets the model tell an old exam or a professor's handout from other documents
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      content.push({ type: 'document', title: file.name.slice(0, 200), source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
    }
  }

  if (opts.cache && content.length > 0) {
    content[content.length - 1] = { ...content[content.length - 1], cache_control: { type: 'ephemeral' } };
  }

  return { content, slideImagePaths, failed: stored.failed, fileCount: allFiles.length, transcriptCount: transcripts.length };
}
