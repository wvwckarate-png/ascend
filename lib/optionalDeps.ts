// Native/heavy server libraries are loaded on demand and may be missing in a given serverless runtime.
// Loading them lazily means one unavailable library degrades one feature instead of crashing the whole API route
// (and the real error lands in the logs / the /api/health report).

/* eslint-disable @typescript-eslint/no-explicit-any */
// Last load error per library, so /api/health can say WHY something is unavailable (message only, trimmed).
export const loadErrors: Record<string, string> = {};
const note = (name: string, err: unknown) => {
  console.error(`${name} unavailable:`, err);
  loadErrors[name] = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 600);
};

export async function getSharp(): Promise<any | null> {
  try { return (await import('sharp')).default; } catch (err) { note('sharp', err); return null; }
}
export async function getOfficeParser(): Promise<any | null> {
  try { return (await import('officeparser')).default; } catch (err) { note('officeparser', err); return null; }
}
export async function getJSZip(): Promise<any | null> {
  try { return (await import('jszip')).default; } catch (err) { note('jszip', err); return null; }
}
