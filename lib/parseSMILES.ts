// Matches [SMILES: CCO] or [SMILES:CCO] patterns
export function containsSMILES(text: string): boolean {
  return /\[SMILES:\s*([^\]]+)\]/.test(text);
}

// Returns an array of text segments and SMILES strings
// e.g. "This is ethanol [SMILES: CCO] a simple alcohol"
// → [{ type: 'text', value: 'This is ethanol ' }, { type: 'smiles', value: 'CCO' }, { type: 'text', value: ' a simple alcohol' }]
export type Segment =
  | { type: 'text'; value: string }
  | { type: 'smiles'; value: string };

export function parseSMILES(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  const regex = /\[SMILES:\s*([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'smiles', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}