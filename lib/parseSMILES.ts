import React from 'react';

// Matches [SMILES: CCO] or [SMILES:CCO] patterns
const SMILES_REGEX = /\[SMILES:\s*([^\]]+)\]/g;

export function containsSMILES(text: string): boolean {
  return SMILES_REGEX.test(text);
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

// Renders text that may contain SMILES tags, with MoleculeStructure components inline
// Import MoleculeStructure lazily to avoid SSR issues
export function renderWithSMILES(text: string, size: 'small' | 'medium' | 'large' = 'medium'): React.ReactNode[] {
  const segments = parseSMILES(text);
  const dimensions = {
    small:  { width: 120, height: 90  },
    medium: { width: 200, height: 150 },
    large:  { width: 280, height: 210 },
  };
  const { width, height } = dimensions[size];

  return segments.map((seg, i) => {
    if (seg.type === 'smiles') {
      // Dynamic import to avoid SSR — component handles its own loading state
      const MoleculeStructure = require('./MoleculeStructure').default;
      return React.createElement(
        'span',
        { key: i, style: { display: 'inline-block', verticalAlign: 'middle', margin: '4px 6px' } },
        React.createElement(MoleculeStructure, { smiles: seg.value, width, height })
      );
    }
    return React.createElement('span', { key: i }, seg.value);
  });
}