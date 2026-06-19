export type KaTeXSegment =
  | { type: 'text'; value: string }
  | { type: 'katex-inline'; value: string }
  | { type: 'katex-block'; value: string };

export function parseKaTeX(text: string): KaTeXSegment[] {
  const segments: KaTeXSegment[] = [];
  // Match $$...$$ (block) and $...$ (inline)
  const regex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'katex-block', value: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'katex-inline', value: match[2].trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}