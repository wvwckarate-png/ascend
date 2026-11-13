import { supabase } from './supabase';

// Uploads one class file into an exam folder and returns the saved row. The kind is worked out from the file itself,
// so several files can be dropped at once. Slides, images and audio also get their text pulled out for the AI.
const BY_EXT: Record<string, string> = { pdf: 'pdf', pptx: 'pptx', ppt: 'pptx', mp3: 'audio', m4a: 'audio', wav: 'audio', ogg: 'audio', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image' };

export function resourceTypeOf(fileName: string): string | null {
  return BY_EXT[(fileName.split('.').pop() || '').toLowerCase()] || null;
}

export async function uploadResourceFile({ file, studentId, folderId, name, oldExam = false }: { file: File; studentId: string; folderId: string; name?: string; oldExam?: boolean }) {
  const type = resourceTypeOf(file.name);
  if (!type) throw new Error('this kind of file isn’t supported');
  const title = (name || file.name.replace(/\.[^/.]+$/, '')).trim() || 'Untitled';
  const ext = file.name.split('.').pop();
  const path = `${studentId}/${folderId}/${Date.now()}_${title.replace(/[^a-zA-Z0-9-_]/g, '_')}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('resources').upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const storageUrl = supabase.storage.from('resources').getPublicUrl(path).data.publicUrl;

  let transcript: string | null = null;
  try {
    if (type === 'audio') {
      // Already in storage: the server reads it from there (lecture audio is far bigger than the request size limit).
      const res = await fetch('/api/transcribe-audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: storageUrl, name: file.name }) });
      transcript = (await res.json())?.transcript || null;
    } else if (type === 'image' || type === 'pptx') {
      const form = new FormData(); form.append('file', file);
      const res = await fetch(type === 'image' ? '/api/extract-image-text' : '/api/extract-pptx-text', { method: 'POST', body: form });
      transcript = (await res.json())?.transcript || null;
    }
  } catch { /* the file is still saved; its text just isn't pre-read */ }

  const { data, error } = await supabase.from('resources').insert({ folder_id: folderId, is_old_exam: oldExam, file_name: title, file_type: type, storage_url: storageUrl, ...(transcript ? { transcript } : {}) }).select().single();
  if (error || !data) throw new Error('uploaded, but could not be saved');
  return data as { id: string; file_name: string; file_type: string; storage_url: string | null; created_at: string; is_old_exam?: boolean; folder_id: string };
}
