// LaTeX inside JSON strings needs doubled backslashes. When a model forgets, "\\frac" would silently parse as
// form-feed + "rac" (and "\\beta" as backspace + "eta"). \f and \b never legitimately appear in this app's JSON, so
// double those; for \t \r \n only do it for well-known LaTeX command names so real "\n" newlines survive.
// Anything else that isn't a valid JSON escape (e.g. "\ce", "\alpha") is doubled as well.
export function repairLatexEscapes(json: string): string {
  return json
    .replace(/(?<!\\)\\([bf])(?=[a-zA-Z])/g, '\\\\$1')
    .replace(/(?<!\\)\\(t(?:imes|heta|ext|au|an|o|op|ilde|frac|binom)|r(?:ightleftharpoons|ightarrow|ight|ho|angle|m)|n(?:abla|eq|u|ot|otin|eg|e|rightarrow))(?![a-zA-Z])/g, '\\\\$1')
    .replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
}

// Tolerant parser for "return ONLY a JSON array" model output. Strips markdown fences and any prose the
// model wrapped around the array, then parses. Throws if no non-empty array can be recovered.
export function parseJSONArray<T>(raw: string): T[] {
  const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No JSON array in model output');
  const parsed = JSON.parse(repairLatexEscapes(cleaned.slice(start, end + 1)));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Model returned an empty list');
  return parsed as T[];
}

// Same idea for a single JSON object: strips fences/prose around the outermost {...}.
export function parseJSONObject<T>(raw: string): T {
  const cleaned = (raw || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
