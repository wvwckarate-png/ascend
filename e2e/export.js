// Study guide Print / PDF on desktop and on an (emulated) iPhone. Uses the real /api/export-pdf (set REAL_API=1).
const h = require('./lib');
const GUIDE = '<div class="sg-section"><h1 class="sg-h1">CELLS</h1><p class="sg-body">Mitochondria make <span class="sg-term">ATP</span> — ΔG°′ and α-helix.</p></div>';
const stubs = () => {
  window.__printCalls = 0; window.print = () => { window.__printCalls++; };
  window.__downloads = []; const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__downloads.push({ name: this.download }); return; } return click.call(this); };
  window.__opened = []; window.open = u => { window.__opened.push(u); return null; };
  window.__shares = []; navigator.canShare = () => true;
  navigator.share = async d => { const f = d.files[0]; window.__shares.push({ name: f.name, type: f.type, size: f.size, head: new TextDecoder().decode((await f.arrayBuffer()).slice(0, 5)) }); };
};
const open = async (s, { mobile = false, apiMock } = {}) => {
  const page = await h.newPage(mobile ? { device: 'iPhone 13' } : { width: 1100, height: 900 });
  await page.evaluateOnNewDocument(stubs);
  page.t.mocks.study_guides = [{ id: 'g1', student_id: s, title: 'BIO 115 — Exam 1 Guide', content: GUIDE, source_filename: 'Lecture 3.pdf', created_at: '2026-10-01T00:00:00Z' }];
  for (const t of ['classes', 'exam_folders', 'resources', 'tasks']) page.t.mocks[t] = [];
  if (apiMock) page.t.apiMocks['/api/export-pdf'] = apiMock;
  await h.go(page, `/${s}/study?guideId=g1`, 2200);
  return page;
};
h.run('export', async () => {
  for (const s of h.STUDENTS) {
    let page = await open(s);
    await h.clickButton(page, /^\s*print/); await h.sleep(500);
    h.check(`${s} desktop: Print uses the browser dialog`, (await page.evaluate(() => window.__printCalls)) === 1);
    await h.clickButton(page, /pdf/); await h.sleep(7000);
    const dl = await page.evaluate(() => window.__downloads);
    h.check(`${s} desktop: PDF downloads a .pdf`, dl.length === 1 && /\.pdf$/.test(dl[0].name), JSON.stringify(dl) + page.t.errors.join('|'));
    await page.close();
    page = await open(s, { mobile: true });
    await h.clickButton(page, /^\s*print/);
    let t = ''; for (let i = 0; i < 40 && !/Your PDF is ready/.test(t); i++) { await h.sleep(400); t = await h.text(page); }
    h.check(`${s} iPhone: Print makes a PDF and shows the ready bar`, /Your PDF is ready/.test(t) && /Share \/ Save/.test(t) && (await page.evaluate(() => window.__printCalls)) === 0, t.slice(0, 150));
    await h.clickButton(page, /share \/ save/); await h.sleep(800);
    const sh = await page.evaluate(() => window.__shares);
    h.check(`${s} iPhone: Share / Save hands a real PDF to the share sheet`, sh.length === 1 && sh[0].type === 'application/pdf' && sh[0].head === '%PDF-' && sh[0].size > 2000, JSON.stringify(sh));
    await h.clickButton(page, /^\s*open\s*$/); await h.sleep(400);
    h.check(`${s} iPhone: Open opens the PDF`, (await page.evaluate(() => window.__opened)).some(u => /^blob:/.test(u)));
    h.check(`${s}: export has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
    page = await open(s, { mobile: true, apiMock: () => ({ status: 500, json: { error: 'boom' } }) });
    await h.clickButton(page, /pdf/); await h.sleep(1500);
    h.check(`${s} iPhone: PDF failure shows a friendly message`, /Could not create the PDF/.test(await h.text(page)));
    await page.close();
  }
});
