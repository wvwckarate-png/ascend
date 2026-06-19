import { parseSMILES, Segment as SMILESSegment } from './parseSMILES';
import { parseKaTeX, KaTeXSegment } from './parseKaTeX';

export type ContentSegment =
  | { type: 'text'; value: string }
  | { type: 'smiles'; value: string; label?: string }
  | { type: 'katex-inline'; value: string }
  | { type: 'katex-block'; value: string };

export function parseContent(text: string): ContentSegment[] {
  const smilesParts = parseSMILES(text);
  const result: ContentSegment[] = [];

  for (const part of smilesParts) {
    if (part.type === 'smiles') {
      result.push({ type: 'smiles', value: part.value, label: part.label });
    } else {
      const katexParts = parseKaTeX(part.value);
      for (const kp of katexParts) {
        result.push(kp as ContentSegment);
      }
    }
  }

  return result;
}