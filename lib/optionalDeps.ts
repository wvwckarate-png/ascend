// Native/heavy server libraries are loaded on demand and may be missing in a given serverless runtime.
// Loading them lazily means one unavailable library degrades one feature instead of crashing the whole API route
// (and the real error lands in the logs / the /api/health report).

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getSharp(): Promise<any | null> {
  try { return (await import('sharp')).default; } catch (err) { console.error('sharp unavailable:', err); return null; }
}
export async function getOfficeParser(): Promise<any | null> {
  try { return (await import('officeparser')).default; } catch (err) { console.error('officeparser unavailable:', err); return null; }
}
export async function getJSZip(): Promise<any | null> {
  try { return (await import('jszip')).default; } catch (err) { console.error('jszip unavailable:', err); return null; }
}
