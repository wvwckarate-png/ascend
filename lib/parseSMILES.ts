// Matches [SMILES: CCO | Ethanol] or [SMILES: CCO] patterns
export function containsSMILES(text: string): boolean {
  return /\[SMILES:\s*([^\]]+)\]/.test(text);
}

export type Segment =
  | { type: 'text'; value: string }
  | { type: 'smiles'; value: string; label?: string };

export function parseSMILES(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  const regex = /\[SMILES:\s*([^\]|]+?)(?:\s*\|\s*([^\]]+))?\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'smiles',
      value: match[1].trim(),
      label: match[2]?.trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}