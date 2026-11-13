// Theme picker, re-orderable class cards and the "old exam" upload type.
const h = require('./lib');
const path = require('path');
const fs = require('fs');
const PDF = path.join(require('os').tmpdir(), 'ascend-e2e-old-exam.pdf');
fs.writeFileSync(PDF, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

const ACCENTS = { purple: '#7B6FA0', blue: null, green: null, red: null, orange: null, grey: null };
const accent = page => page.evaluate(() => { const el = document.querySelector('[style*="--accent"]'); return el ? el.style.getPropertyValue('--accent').trim() : null; });
const CLASSES = ['Anatomy', 'Biochem', 'Calculus', 'Dance', 'Ethics'].map((name, i) => ({ id: 'c' + (i + 1), name, semester: 'Fall', professor: 'Dr ' + name, is_active: true, grade_only: false, sort_order: null }));
const cardOrder = page => page.evaluate(() => [...document.querySelectorAll('[data-reorder-id]')].map(e => e.dataset.reorderId).join(','));
const classMocks = (page, s) => {
  page.t.mocks.students = [{ id: s, name: h.cap(s), track: 'Pre-Med', target_school: 'WVU', target_program: 'WVU School of Medicine', grad_year: 2030, generation_profile: '' }];
  page.t.mocks.classes = CLASSES.map(c => ({ ...c, student_id: s }));
  page.t.mocks.exam_folders = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-12-30' }];
  for (const t of ['flashcard_decks', 'flashcard_cards', 'flashcard_items', 'practice_exams', 'practice_exam_items', 'study_guides', 'tasks', 'grades']) page.t.mocks[t] = [];
};

h.run('personalize', async () => {
  for (const s of h.STUDENTS) {
    // ── themes ──
    let page = await h.newPage(); await h.go(page, `/${s}/profile`);
    const start = await accent(page);
    const radios = await page.$$eval('[role=radio]', els => els.map(e => ({ label: e.getAttribute('aria-label'), on: e.getAttribute('aria-checked') })));
    h.check(`${s}: six themes offered, exactly one selected`, radios.length === 6 && radios.filter(r => r.on === 'true').length === 1 && !!start, JSON.stringify(radios));
    const seen = new Set([start]);
    for (const [label, name] of [['Ocean', 'blue'], ['Forest', 'green'], ['Crimson', 'red'], ['Ember', 'orange'], ['Slate', 'grey'], ['Violet', 'purple']]) {
      page.t.writes.length = 0;
      await page.click(`[role=radio][aria-label="${label} theme"]`); await h.sleep(350);
      const now = await accent(page); seen.add(now);
      const w = page.t.writes.find(x => x.table === 'students' && x.method === 'PATCH');
      const on = await page.$eval(`[role=radio][aria-label="${label} theme"]`, e => e.getAttribute('aria-checked'));
      h.check(`${s}: ${label} applies at once and is saved for this student`, on === 'true' && w && w.body.theme === name && w.query.includes('id=eq.' + s) && Object.keys(w.body).length === 1, `${now} ${JSON.stringify(w)}`);
    }
    h.check(`${s}: the six themes are six different colours`, seen.size === 6, [...seen].join(' '));
    // the page really repaints: a themed element's computed colour follows the variable
    await page.click('[role=radio][aria-label="Ocean theme"]'); await h.sleep(300);
    const blue = await accent(page);
    const painted = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'var(--accent)'; document.querySelector('[style*="--accent"]').appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
    h.check(`${s}: colours on the page follow the theme`, painted === rgb(blue), `${painted} vs ${blue}`);
    // keeps the theme while moving between pages (no full reload)
    await h.clickText(page, 'Home', { tag: 'a' }) || await page.evaluate(s => document.querySelector(`a[href="/${s}"]`)?.click(), s); await h.sleep(1500);
    h.check(`${s}: theme carries to other pages`, (await accent(page)) === blue, `${page.url()} ${await accent(page)}`);
    h.check(`${s}: themes cause no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await h.newPage(); page.t.failWrites.students = true; await h.go(page, `/${s}/profile`);
    await page.click('[role=radio][aria-label="Forest theme"]'); await h.sleep(600);
    h.check(`${s}: failed theme save is reported, colour still applied`, /Couldn.t save your theme/.test(await h.text(page)) && (await page.$eval('[role=radio][aria-label="Forest theme"]', e => e.getAttribute('aria-checked'))) === 'true');
    await page.close();

    // ── class order ──
    page = await h.newPage({ width: 430, height: 1400 }); classMocks(page, s); await h.go(page, `/${s}`);
    let t = await h.text(page);
    h.check(`${s}: home shows four classes and a Reorder button`, /Anatomy/.test(t) && /Dance/.test(t) && !/Ethics/.test(t) && /Reorder/.test(t));
    const q = page.t;
    await h.clickText(page, 'Reorder', { tag: 'button', exact: true }); await h.sleep(300); t = await h.text(page);
    h.check(`${s}: reorder mode shows every class`, /Drag to reorder/i.test(t) && /Ethics/.test(t) && (await cardOrder(page)) === 'c1,c2,c3,c4,c5');
    q.writes.length = 0;
    await page.click('button[aria-label="Move Anatomy later"]'); await h.sleep(600);
    let w = q.writes.filter(x => x.table === 'classes' && x.method === 'PATCH');
    const saved = Object.fromEntries(w.map(x => [x.query.match(/id=eq\.(c\d)/)?.[1], x.body.sort_order]));
    h.check(`${s}: arrow button moves the card and saves the new order`, (await cardOrder(page)) === 'c2,c1,c3,c4,c5' && w.length === 5 && saved.c2 === 0 && saved.c1 === 1 && saved.c5 === 4 && w.every(x => Object.keys(x.body).length === 1), JSON.stringify(saved));
    h.check(`${s}: first card cannot move earlier, last cannot move later`, await page.$eval('button[aria-label="Move Biochem earlier"]', b => b.disabled) && await page.$eval('button[aria-label="Move Ethics later"]', b => b.disabled));
    // drag Ethics (last) onto the first card
    q.writes.length = 0;
    const box = async id => page.$eval(`[data-reorder-id="${id}"]`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75 }; });
    const from = await box('c5'), to = await box('c2');
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 }); await page.mouse.move(to.x, to.y, { steps: 6 }); await h.sleep(150); await page.mouse.up(); await h.sleep(600);
    w = q.writes.filter(x => x.table === 'classes' && x.method === 'PATCH');
    const order = await cardOrder(page);
    h.check(`${s}: dragging a card re-orders and saves`, order.startsWith('c5,') && order.split(',').length === 5 && w.length === 5 && w.find(x => x.query.includes('id=eq.c5'))?.body.sort_order === 0, `${order} ${w.length}`);
    h.check(`${s}: tapping a card while re-ordering does not open the class`, page.url().endsWith('/' + s));
    await h.clickText(page, 'Done', { tag: 'button', exact: true }); await h.sleep(300); t = await h.text(page);
    h.check(`${s}: Done leaves reorder mode with the new order on top`, /My Classes/i.test(t) && /Ethics/.test(t) && (await cardOrder(page)) === '' && t.indexOf('Ethics') < t.indexOf('Biochem'));
    const classGet = []; page.on('request', r => { if (r.url().includes('/rest/v1/classes') && r.method() === 'GET') classGet.push(r.url()); });
    await page.reload({ waitUntil: 'networkidle2' }); await h.sleep(800);
    h.check(`${s}: home asks for classes in saved order`, classGet.some(u => /order=sort_order\.asc\.nullslast/.test(u)), classGet[0]);
    classGet.length = 0; await h.go(page, `/${s}/classes`);
    h.check(`${s}: classes page uses the same order`, classGet.some(u => /order=sort_order\.asc\.nullslast/.test(u)), classGet.join(' | ').slice(0, 300));
    h.check(`${s}: reorder causes no runtime errors`, q.errors.length === 0, q.errors.join('|'));
    await page.close();

    page = await h.newPage({ width: 430, height: 1400 }); classMocks(page, s); page.t.failWrites.classes = true; await h.go(page, `/${s}`);
    await h.clickText(page, 'Reorder', { tag: 'button', exact: true }); await h.sleep(300);
    await page.click('button[aria-label="Move Anatomy later"]'); await h.sleep(700);
    h.check(`${s}: failed order save is reported`, /Couldn.t save order/.test(await h.text(page)));
    await page.close();

    // one class: nothing to reorder
    page = await h.newPage(); classMocks(page, s); page.t.mocks.classes = page.t.mocks.classes.slice(0, 1); await h.go(page, `/${s}`);
    h.check(`${s}: no Reorder button with a single class`, !/Reorder/.test(await h.text(page)) && /Anatomy/.test(await h.text(page)));
    await page.close();

    // ── old exams ──
    page = await h.newPage(); classMocks(page, s);
    page.t.mocks.resources = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', created_at: '2026-11-01T10:00:00Z', is_old_exam: false }, { id: 'r2', file_name: 'Exam 1 2025', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', created_at: '2026-11-02T10:00:00Z', is_old_exam: true }];
    await h.go(page, `/${s}/classes/c1/f1`); t = await h.text(page);
    h.check(`${s}: folder shows which file is an old exam`, /Old exam ✓/.test(t) && (t.match(/Mark as old exam/g) || []).length === 1, t.slice(0, 300));
    page.t.writes.length = 0;
    await h.clickText(page, 'Mark as old exam', { tag: 'button', exact: true }); await h.sleep(600);
    w = page.t.writes.find(x => x.table === 'resources' && x.method === 'PATCH');
    h.check(`${s}: marking a file saves the flag on that file`, w && w.body.is_old_exam === true && w.query.includes('id=eq.r1') && ((await h.text(page)).match(/Old exam ✓/g) || []).length === 2, JSON.stringify(w));
    page.t.writes.length = 0;
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === 'Old exam ✓')[1]?.click()); await h.sleep(600);
    w = page.t.writes.find(x => x.table === 'resources' && x.method === 'PATCH');
    h.check(`${s}: un-marking clears it`, w && w.body.is_old_exam === false, JSON.stringify(w));
    // upload with the switch on
    await h.clickText(page, '+ Upload', { tag: 'button' }); await h.sleep(400);
    await page.evaluate(() => { const el = [...document.querySelectorAll('div')].find(d => d.innerText?.trim() === 'PDF' && d.children.length <= 2 && d.closest('[style*="z-index: 200"]')); let c = el; while (c && getComputedStyle(c).cursor !== 'pointer') c = c.parentElement; (c || el)?.click(); }); await h.sleep(300);
    await (await page.$('input[type=file]')).uploadFile(PDF); await h.sleep(300);
    h.check(`${s}: upload form has the old-exam switch, off by default`, (await page.$eval('[role=switch]', e => e.getAttribute('aria-checked'))) === 'false' && /This is an old exam or quiz/.test(await h.text(page)));
    await page.click('[role=switch]'); await h.sleep(150); page.t.writes.length = 0;
    await h.clickInModal(page, 'Upload & Save', false) || await h.clickInModal(page, 'Save', false); await h.sleep(2000);
    w = page.t.writes.find(x => x.table === 'resources' && x.method === 'POST');
    h.check(`${s}: uploaded file is saved as an old exam`, w && w.body.is_old_exam === true && w.body.folder_id === 'f1', JSON.stringify(w?.body).slice(0, 200));
    // next upload starts with the switch off again
    await h.clickText(page, '+ Upload', { tag: 'button' }); await h.sleep(400);
    const sw = await page.$('[role=switch]');
    h.check(`${s}: switch resets for the next upload`, !sw || (await page.$eval('[role=switch]', e => e.getAttribute('aria-checked'))) === 'false');
    h.check(`${s}: folder old-exam controls cause no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // generators: the flag reaches the AI request (drafting and checking), and the library shows the tag
    for (const feature of ['practice-exam', 'flashcards', 'study']) {
      page = await h.newPage(); classMocks(page, s);
      page.t.mocks.resources = (params) => {
        const all = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', transcript: null, is_old_exam: false }, { id: 'r2', file_name: 'Exam 1 2025', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', transcript: null, is_old_exam: true }, { id: 'r3', file_name: 'Quiz review video', file_type: 'youtube', storage_url: 'https://youtu.be/x', folder_id: 'f1', transcript: 'the quiz asked about glycolysis', is_old_exam: true }];
        return all;
      };
      page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: feature === 'study' ? '<h1>Guide</h1><p>Body</p>' : '[]' } });
      page.t.apiMocks['/api/check-resource'] = () => ({ status: 500, json: { error: 'x' } });
      await h.go(page, `/${s}/${feature}`);
      await h.clickButton(page, /new|generate|make|create/); await h.sleep(800);
      await h.clickPointer(page, 'Anatomy'); await h.sleep(250); await h.clickPointer(page, 'Exam 1'); await h.sleep(300);
      t = await h.text(page);
      h.check(`${s} ${feature}: library tags the old exams`, (t.match(/Old exam/g) || []).length === 2, t.slice(0, 400));
      for (const n of ['Lecture 1', 'Exam 1 2025', 'Quiz review video']) { await h.clickPointer(page, n); await h.sleep(200); }
      await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => /^(generate|make|create) /i.test(b.innerText.trim()) && b.innerText.length > 12); bs[bs.length - 1]?.click(); }); await h.sleep(2500);
      const call = page.t.apiCalls.find(c => c.path === '/api/generate-study-guide');
      let res = [], tr = [];
      try { res = JSON.parse(h.field(call.bodyText, 'resources') || '[]'); tr = JSON.parse(h.field(call.bodyText, 'transcripts') || '[]'); } catch {}
      h.check(`${s} ${feature}: request marks the old exam file and not the lecture`, res.find(r => r.name === 'Exam 1 2025')?.oldExam === true && res.find(r => r.name === 'Lecture 1')?.oldExam === false, JSON.stringify(res));
      h.check(`${s} ${feature}: request marks the old exam transcript`, tr.find(r => r.name === 'Quiz review video')?.oldExam === true, JSON.stringify(tr).slice(0, 200));
      h.check(`${s} ${feature}: no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
      await page.close();
    }
  }
});
