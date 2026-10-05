'use client';
import { useEffect, useMemo, useRef } from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { parseKaTeX } from '../../lib/parseKaTeX';

// Renders a model-written study guide: sanitised HTML, then LaTeX math ($…$ / $$…$$) typeset in place.
// Uses the same math rules as the flashcards/exams (so "costs $5 and $10" stays plain text).
export default function GuideHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const safe = useMemo(() => sanitizeHtml(html), [html]);

  useEffect(() => {
    const root = ref.current;
    if (!root || !safe.includes('$')) return;
    let cancelled = false;

    // mhchem adds \ce{…} for chemical formulas/equations.
    // @ts-expect-error -- the mhchem contrib ships no type declarations
    const loadChem = import('katex/contrib/mhchem').catch(() => null);
    Promise.all([import('katex'), loadChem]).then(([{ default: katex }]) => {
      if (cancelled || !ref.current) return;

      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: n =>
          n.nodeValue?.includes('$') && !n.parentElement?.closest('script,style,pre,code,textarea,.katex')
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      });
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);

      for (const node of nodes) {
        const segs = parseKaTeX(node.nodeValue || '');
        if (!segs.some(s => s.type !== 'text')) continue;
        const frag = document.createDocumentFragment();
        for (const seg of segs) {
          if (seg.type === 'text') { frag.appendChild(document.createTextNode(seg.value)); continue; }
          const span = document.createElement('span');
          try {
            katex.render(seg.value, span, { displayMode: seg.type === 'katex-block', throwOnError: false });
          } catch {
            span.textContent = seg.value;
          }
          frag.appendChild(span);
        }
        node.parentNode?.replaceChild(frag, node);
      }
    }).catch(() => { /* math stays as plain text */ });

    return () => { cancelled = true; };
  }, [safe]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: safe }} />;
}
