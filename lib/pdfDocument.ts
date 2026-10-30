// Builds the standalone HTML page that the PDF route renders. It reuses the study guide's own stylesheet, so the PDF looks
// like the guide on screen, plus a few print rules (page breaks, fonts that cover Greek letters and symbols).
import { readFileSync } from 'fs';
import { join } from 'path';
import katexPkg from 'katex/package.json';

const supabaseHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host; } catch { return ''; } })();

// The ONLY places the renderer may load anything from (everything else is blocked).
export const PDF_ALLOWED_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', supabaseHost].filter(Boolean);

const PRINT_CSS = `
  @page { size: Letter; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 10.5pt; line-height: 1.6; color: #1D1B26; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sg-wrap { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif !important; }
  .sg-wrap img { max-width: 100% !important; height: auto !important; }
  .sg-callout, .sg-figure, .sg-step, .sg-timeline-item, .sg-compare-col, tr, .katex-display { break-inside: avoid; page-break-inside: avoid; }
  .sg-h1, .sg-h2, .sg-h3, h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
  .sg-section { margin-bottom: 14pt; }
  table { border-collapse: collapse; }
`;

/** Remove anything executable. (JavaScript is also switched off in the renderer and a strict CSP is set — belt and braces.) */
export function stripActiveContent(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|link|meta|base|style|form|frame|frameset)\b[\s\S]*?(<\/\s*\1\s*>|\/?>)/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*("|')\s*(javascript|vbscript|data:text)[^"']*\2/gi, '');
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function buildPdfDocument(title: string, bodyHtml: string): string {
  const guideCss = readFileSync(join(process.cwd(), 'app/styles/study-guide.css'), 'utf8');
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "font-src https://cdn.jsdelivr.net https://fonts.gstatic.com data:",
    `img-src ${supabaseHost ? `https://${supabaseHost} ` : ''}data:`,
  ].join('; ');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(csp)}">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${katexPkg.version}/dist/katex.min.css">
<style>${guideCss}</style>
<style>${PRINT_CSS}</style>
</head><body>
${stripActiveContent(bodyHtml)}
</body></html>`;
}
