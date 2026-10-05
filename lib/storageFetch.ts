// Server-side fetch of files that students already uploaded to this project's own public Supabase storage.
// Lets API routes read big files (lecture audio, slide decks) without pushing the bytes through the
// ~4.5 MB request-body limit, and refuses any URL that isn't our own storage (no SSRF).

export function isOwnStorageUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try {
    const u = new URL(raw);
    const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return u.protocol === 'https:' && u.host === own.host && u.pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

export async function fetchOwnStorageFile(url: string, name: string, maxBytes: number): Promise<File> {
  if (!isOwnStorageUrl(url)) throw new Error('Not a file from this app');
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Could not read the file (HTTP ${res.status})`);
  if (Number(res.headers.get('content-length') || 0) > maxBytes) throw new Error('File is too large');
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new Error('File is too large');
  return new File([buf], name, { type: res.headers.get('content-type') || undefined });
}
