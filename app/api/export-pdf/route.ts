import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { guardAI } from '../../../lib/apiGuard';
import { buildPdfDocument, PDF_ALLOWED_HOSTS } from '../../../lib/pdfDocument';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const LOCAL_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Renders a study guide to a real PDF (vector text, proper page breaks, page numbers). Phones print poorly from the browser,
// so the page asks the server for the PDF instead. The renderer has JavaScript off and can only load fonts, the guide CSS
// and this project's own image storage.
export async function POST(req: NextRequest) {
  const blocked = guardAI(req, 'pdf', 12);
  if (blocked) return blocked;

  let body: { title?: unknown; html?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : 'Study Guide';
  const html = typeof body.html === 'string' ? body.html : '';
  if (!html.trim()) return NextResponse.json({ error: 'Nothing to export' }, { status: 400 });
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) return NextResponse.json({ error: 'That guide is too large to export as one PDF' }, { status: 413 });

  const isMac = process.platform === 'darwin';
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_EXECUTABLE_PATH || (isMac ? LOCAL_CHROME : await chromium.executablePath()),
      args: isMac ? ['--no-sandbox'] : chromium.args,
      headless: isMac ? true : 'shell',
    });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', r => {
      const url = r.url();
      let ok = url.startsWith('data:') || url === 'about:blank';
      if (!ok) { try { const u = new URL(url); ok = u.protocol === 'https:' && PDF_ALLOWED_HOSTS.includes(u.host); } catch { ok = false; } }
      if (ok) r.continue(); else r.abort('blockedbyclient');
    });

    await page.setContent(buildPdfDocument(title, html), { waitUntil: 'load', timeout: 45000 });
    await page.evaluateHandle('document.fonts.ready').catch(() => null);

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-size:8px;font-family:sans-serif;color:#9E9BB0;text-align:center;">Ascend &middot; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    const safeName = title.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Study-Guide';
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('export-pdf failed:', err);
    return NextResponse.json({ error: err instanceof Error && err.message ? err.message : 'Could not create the PDF' }, { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
