'use client';
import { parseContent } from '../../lib/parseContent';
import { KaTeXRenderer } from './KaTeXRenderer';
import MoleculeStructure from './MoleculeStructure';

// Plain text that may contain LaTeX math ($x^2$, $$…$$) and molecule tags ([SMILES: CCO | Ethanol]).
// Used wherever AI-written text is shown outside the flashcards (exam questions, options, explanations…).
export default function RichText({ text }: { text: string | null | undefined }) {
  const segments = parseContent(text || '');
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'katex-inline') return <KaTeXRenderer key={i} expression={seg.value} />;
        if (seg.type === 'katex-block') return <span key={i} style={{ display: 'block', margin: '6px 0' }}><KaTeXRenderer expression={seg.value} displayMode /></span>;
        if (seg.type === 'smiles') {
          return (
            <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '6px 8px', verticalAlign: 'middle' }}>
              <MoleculeStructure smiles={seg.value} width={140} height={100} />
              {seg.label && <span style={{ fontSize: 10, fontWeight: 700, color: '#9E9BB0' }}>{seg.label}</span>}
            </span>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </span>
  );
}
