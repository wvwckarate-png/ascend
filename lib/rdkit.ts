// Loads the RDKit chemistry engine (molecule drawing) on demand — only when a flashcard/answer actually has a
// [SMILES: …] structure — instead of downloading ~10 MB of WebAssembly on every page for every student.
// Version is pinned so a surprise upstream release can't break the app.

const VERSION = '2026.9.1';
const BASE = `https://unpkg.com/@rdkit/rdkit@${VERSION}/dist`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type RDKitWindow = Window & { RDKit?: any; initRDKitModule?: (opts?: { locateFile?: (f: string) => string }) => Promise<any> };

let pending: Promise<any> | null = null;

export function loadRDKit(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('RDKit needs a browser'));
  const w = window as RDKitWindow;
  if (w.RDKit) return Promise.resolve(w.RDKit);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('RDKit timed out')), 30000);
    const script = document.createElement('script');
    script.src = `${BASE}/RDKit_minimal.js`;
    script.async = true;
    script.onload = () => {
      w.initRDKitModule!({ locateFile: (f: string) => `${BASE}/${f}` })
        .then(mod => { w.RDKit = mod; clearTimeout(timer); resolve(mod); })
        .catch(err => { clearTimeout(timer); reject(err); });
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('RDKit failed to load')); };
    document.head.appendChild(script);
  });
  // Allow a retry later if it failed (e.g. offline at the time).
  pending.catch(() => { pending = null; });
  return pending;
}
