export type KaTeXSegment =
  | { type: 'text'; value: string }
  | { type: 'katex-inline'; value: string }
  | { type: 'katex-block'; value: string };

// $$…$$ is display math. $…$ is inline math only when it looks like math: no space just inside the dollar signs,
// and the closing $ isn't followed by a digit — so prices like "$5 and $10" stay plain text.
const MATH = /\$\$([^$]+)\$\$|\$(?!\s)((?:\\.|[^$\n\\])*?[^\s$\\])\$(?!\d)/g;

export function parseKaTeX(text: string): KaTeXSegment[] {
  const segments: KaTeXSegment[] = [];
  let lastIndex = 0;
  let match;
  MATH.lastIndex = 0;

  while ((match = MATH.exec(text)) !== null) {
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
