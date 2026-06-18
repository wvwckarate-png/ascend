'use client';
import { useEffect, useRef, useState } from 'react';

interface MoleculeStructureProps {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function MoleculeStructure({ smiles, width = 200, height = 150 }: MoleculeStructureProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!smiles) return;

    const render = () => {
      try {
        const RDKit = (window as any).RDKit;
        if (!RDKit) { setTimeout(render, 100); return; }
        const mol = RDKit.get_mol(smiles);
        if (!mol) { setError(true); return; }
        const svg = mol.get_svg_with_highlights(JSON.stringify({
          width,
          height,
          bondLineWidth: 1.5,
          addStereoAnnotation: true,
        }));
        mol.delete();
        setSvg(svg);
      } catch {
        setError(true);
      }
    };

    render();
  }, [smiles, width, height]);

  if (error) return (
    <div style={{ padding: '8px 12px', borderRadius: 8, background: '#F3F1EC', fontSize: 11, color: '#9E9BB0', fontFamily: 'monospace' }}>
      {smiles}
    </div>
  );

  if (!svg) return (
    <div style={{ width, height, borderRadius: 10, background: '#F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #E8E5F0', borderTopColor: '#7B6FA0', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div
      style={{ background: '#FFFFFF', borderRadius: 10, border: '1.5px solid #E8E5F0', padding: 8, display: 'inline-block' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export { MoleculeStructure };