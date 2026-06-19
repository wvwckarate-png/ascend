'use client';
import { useEffect, useRef } from 'react';

interface KaTeXRendererProps {
  expression: string;
  displayMode?: boolean;
}

export function KaTeXRenderer({ expression, displayMode = false }: KaTeXRendererProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import('katex').then(({ default: katex }) => {
      try {
        katex.render(expression, ref.current!, {
          displayMode,
          throwOnError: false,
          errorColor: '#C47878',
        });
      } catch {
        if (ref.current) ref.current.textContent = expression;
      }
    });
  }, [expression, displayMode]);

  return (
    <span
      ref={ref}
      style={{
        display: displayMode ? 'block' : 'inline-block',
        textAlign: displayMode ? 'center' : 'inherit',
        margin: displayMode ? '12px 0' : '0 2px',
        verticalAlign: displayMode ? undefined : 'middle',
      }}
    />
  );
}