// Client side of "Save as PDF / Print" for study guides. The server renders the PDF (/api/export-pdf) because phone
// browsers print web pages badly; here we fetch it and hand it to the device (share sheet, download, or open).

export type PdfFile = { file: File; url: string };

const safeName = (title: string) => (title.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Study-Guide');

export async function requestGuidePdf(title: string, html: string): Promise<PdfFile> {
  const res = await fetch('/api/export-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, html }) });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `PDF failed (${res.status})`);
  }
  const blob = await res.blob();
  const file = new File([blob], `${safeName(title)}.pdf`, { type: 'application/pdf' });
  return { file, url: URL.createObjectURL(file) };
}

/** Phones and tablets: where printing from the browser is unreliable. */
export const isTouchDevice = (): boolean => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function downloadFile(file: File, url?: string) {
  const a = document.createElement('a');
  a.href = url || URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Call this straight from a tap: iOS only allows the share sheet within a moment of the user's touch. */
export async function shareOrSave(file: File, url: string, title: string): Promise<'shared' | 'saved' | 'cancelled'> {
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title }); return 'shared'; }
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
  }
  downloadFile(file, url);
  return 'saved';
}
