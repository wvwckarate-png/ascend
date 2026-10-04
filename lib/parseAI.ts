// Tolerant parser for "return ONLY a JSON array" model output. Strips markdown fences and any prose the
// model wrapped around the array, then parses. Throws if no non-empty array can be recovered.
export function parseJSONArray<T>(raw: string): T[] {
  const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No JSON array in model output');
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Model returned an empty list');
  return parsed as T[];
}
