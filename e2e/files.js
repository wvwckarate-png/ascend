// The exam page's two shelves ("From class" grey paper vs "Made by Ascend" theme colour), made-from links, and the Library.
const h = require('./lib');
const path = require('path'); const fs = require('fs'); const os = require('os');
const mkFile = (name) => { const p = path.join(os.tmpdir(), name); fs.writeFileSync(p, '%PDF-1.4\n%%EOF'); return p; };
const RES = [
  { id: 'r1', file_name: 'Lecture 9 Bioenergetics', file_type: 'pptx', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-03T10:00:00Z', is_old_exam: false, folder_id: 'f1' },
  { id: 'r2', file_name: 'Exam 2 from 2025', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-05T10:00:00Z', is_old_exam: true, folder_id: 'f1' },
  { id: 'r3', file_name: 'Lecture 10 recording', file_type: 'audio', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-07T10:00:00Z', is_old_exam: false, folder_id: 'f1' },
  { id: 'r4', file_name: 'Buffers lecture', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-06T10:00:00Z', is_old_exam: false, folder_id: 'f2' },
];
function mocks(page, s, o = {}) {
  page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'Exercise Phys', semester: 'Fall', professor: 'Dr Alvarez', is_active: true, grade_only: false }, { id: 'c2', student_id: s, name: 'Chem 116', semester: 'Fall', professor: '', is_active: true, grade_only: false }];
  page.t.mocks.exam_folders = q => { const all = [{ id: 'f1', class_id: 'c1', name: 'Exam 2', exam_date: '2026-12-24' }, { id: 'f2', class_id: 'c2', name: 'Exam 3', exam_date: '2026-12-28' }]; const id = (q.get('id') || '').replace('eq.', ''); return id ? all.filter(f => f.id === id) : all; };
  const res = o.res || RES;
  page.t.mocks.resources = q => { const f = q.get('folder_id') || ''; return f.startsWith('eq.') ? res.filter(r => r.folder_id === f.slice(3)) : res; };
  const inFolder = rows => q => { const f = q.get('folder_id') || ''; return f.startsWith('eq.') ? rows.filter(r => r.folder_id === f.slice(3)) : rows; };
  page.t.mocks.study_guides = inFolder(o.guides || [{ id: 'g1', title: 'Bioenergetics guide', created_at: '2026-11-08T10:00:00Z', folder_id: 'f1', source_filename: 'x', content: '<h1>Guide</h1><p>Body</p>', source_resource_ids: ['r1'] }]);
  page.t.mocks.flashcard_decks = inFolder(o.decks || [{ id: 'd1', title: 'Exam 2 deck', card_count: 38, created_at: '2026-11-09T10:00:00Z', folder_id: 'f1', source_resource_ids: ['r1', 'r2'] }, { id: 'd2', title: 'Loose deck', card_count: 5, created_at: '2026-10-01T10:00:00Z', folder_id: null, source_resource_ids: [] }]);
  page.t.mocks.practice_exams = inFolder(o.exams || [{ id: 'e1', title: 'Practice exam 1', status: 'completed', score: 84, created_at: '2026-11-09T12:00:00Z', completed_at: '2026-11-09T13:00:00Z', folder_id: 'f1', questions: [], responses: {}, timer_seconds: null, source_resource_ids: ['r1'] }]);
  for (const t of ['flashcard_items', 'practice_exam_items', 'flashcard_cards', 'tasks', 'grades']) page.t.mocks[t] = [];
  page.t.mocks['rpc/study_plan_decks'] = [];
}
const cards = page => page.evaluate(() => ({
  classShelf: document.querySelector('[data-shelf="class"]')?.innerText.replace(/\n+/g, ' | ') || '',
  madeShelf: document.querySelector('[data-shelf="made"]')?.innerText.replace(/\n+/g, ' | ') || '',
  filesInClass: document.querySelectorAll('[data-shelf="class"] [data-kind="class"]').length, madeInClass: document.querySelectorAll('[data-shelf="class"] [data-kind="made"]').length,
  madeInMade: document.querySelectorAll('[data-shelf="made"] [data-kind="made"]').length, filesInMade: document.querySelectorAll('[data-shelf="made"] [data-kind="class"]').length,
}));

h.run('files', async () => {
  for (const s of h.STUDENTS) {
    { const p0 = await h.newPage(); await h.go(p0, '/robots.txt', 100); await p0.evaluate(() => localStorage.clear()); await p0.close(); }
    // ── exam page ──
    let page = await h.newPage({ width: 430, height: 1500 }); mocks(page, s); await h.go(page, `/${s}/classes/c1/f1`, 1500);
    let c = await cards(page);
    h.check(`${s}: uploads sit only on the grey shelf, Ascend's only on the coloured one`, c.filesInClass === 3 && c.madeInClass === 0 && c.madeInMade === 3 && c.filesInMade === 0, JSON.stringify(c).slice(0, 300));
    h.check(`${s}: grey shelf is headed "From class" with the count and Upload`, /From class \| 3 files you uploaded \| \+ Upload/.test(c.classShelf), c.classShelf.slice(0, 120));
    h.check(`${s}: coloured shelf is headed "Made by Ascend" with its own make buttons`, /Made by Ascend \| 3 things built from your files/.test(c.madeShelf) && /\+ Study guide/.test(c.madeShelf) && /\+ Flashcards/.test(c.madeShelf) && /\+ Practice exam/.test(c.madeShelf), c.madeShelf.slice(0, 160));
    const looks = await page.evaluate(() => { const f = getComputedStyle(document.querySelector('[data-file-card]')), m = getComputedStyle(document.querySelector('[data-made-card]')), sh = getComputedStyle(document.querySelector('[data-shelf="made"]')), sc = getComputedStyle(document.querySelector('[data-shelf="class"]')); const probe = document.createElement('i'); probe.style.color = 'var(--accent-light)'; document.querySelector('[data-shelf="made"]').appendChild(probe); const light = getComputedStyle(probe).color; probe.remove(); return { fileRadius: f.borderTopLeftRadius, madeRadius: m.borderTopLeftRadius, madeShelfIsTheme: sh.backgroundColor === light, classShelf: sc.backgroundColor }; });
    h.check(`${s}: the two kinds differ in shape and colour (square grey paper vs rounded theme colour)`, looks.fileRadius === '4px' && parseFloat(looks.madeRadius) >= 16 && looks.madeShelfIsTheme && looks.classShelf === 'rgb(239, 237, 231)', JSON.stringify(looks));
    h.check(`${s}: file cards show type, old-exam badge and how many things use them`, /SLIDES/i.test(c.classShelf) && /Old exam/.test(c.classShelf) && /Used in 3/.test(c.classShelf) && /Used in 1/.test(c.classShelf) && /Not used yet/.test(c.classShelf), c.classShelf);
    h.check(`${s}: each made item names the files it came from`, /Exam 2 deck \| from Lecture 9 Bioenergetics \+ Exam 2 from 2025/.test(c.madeShelf.replace(/ +/g, ' ')) && /Practice exam · 84%/i.test(c.madeShelf) && /taken Nov 9/.test(c.madeShelf) && /FLASHCARDS · 38/i.test(c.madeShelf), c.madeShelf);
    h.check(`${s}: unused files are called out by name`, /1 file hasn.t been used yet \| Lecture 10 recording/.test(c.madeShelf), c.madeShelf.slice(-120));
    const ready = await page.$$eval('[data-getting-ready] [data-step]', els => els.map(e => `${e.innerText.trim()}:${e.dataset.step}`).join(' '));
    h.check(`${s}: Getting ready shows all four pieces done`, ready === 'Materials:done Study guide:done Flashcards:done Practice exam:done' && /4 of 4/.test(await page.$eval('[data-getting-ready]', e => e.innerText)), ready);
    h.check(`${s}: the old four tabs are gone`, !(await page.evaluate(() => [...document.querySelectorAll('button')].some(b => /^(Resources|Study Guide|Practice Exam)$/.test(b.innerText.trim())))));
    await page.evaluate(() => [...document.querySelectorAll('[data-made-card="deck"] button')].pop().click()); await h.sleep(1500);
    h.check(`${s}: Study opens that exact deck`, page.url().endsWith(`/${s}/flashcards?deckId=d1`), page.url());
    const rec = await page.evaluate(sid => JSON.parse(localStorage.getItem('ascend:recent:' + sid) || '[]'), s);
    h.check(`${s}: opening it is remembered as recently opened`, rec[0]?.key === 'deck-d1' && rec[0].made === true && /Exercise Phys · Exam 2/.test(rec[0].sub), JSON.stringify(rec[0]));
    await h.go(page, `/${s}/classes/c1/f1`, 1200); await page.evaluate(() => [...document.querySelectorAll('[data-made-card="exam"] button')].pop().click()); await h.sleep(1200);
    h.check(`${s}: Review opens that exact practice exam`, page.url().endsWith(`/${s}/practice-exam?examId=e1`), page.url());
    await h.go(page, `/${s}/classes/c1/f1`, 1200); await page.click('[data-make="practice-exam"]'); await h.sleep(1200);
    h.check(`${s}: "+ Practice exam" opens the generator for this exam`, /\/practice-exam\?folderId=f1&folderName=Exam%202$/.test(page.url()), page.url());
    h.check(`${s}: exam page has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // nothing made yet / things made before sources were recorded / empty folder
    page = await h.newPage({ width: 430, height: 1300 }); mocks(page, s, { guides: [], decks: [], exams: [] }); await h.go(page, `/${s}/classes/c1/f1`, 1300); c = await cards(page);
    const ready2 = await page.$$eval('[data-getting-ready] [data-step]', els => els.map(e => e.dataset.step).join(','));
    h.check(`${s}: with only uploads, the next step is highlighted and the coloured shelf explains itself`, ready2 === 'done,next,todo,todo' && /Nothing made yet/.test(c.madeShelf) && /Pick one above/.test(c.madeShelf) && c.madeInMade === 0 && !/Not used yet/.test(c.classShelf) === false, `${ready2} ${c.madeShelf}`);
    await page.close();
    page = await h.newPage({ width: 430, height: 1300 }); mocks(page, s, { decks: [{ id: 'd9', title: 'Old deck', card_count: 9, created_at: '2026-09-01T10:00:00Z', folder_id: 'f1', source_resource_ids: [] }], guides: [{ id: 'g9', title: 'Old guide', created_at: '2026-09-02T10:00:00Z', folder_id: 'f1', source_filename: 'Lecture A.pdf, Lecture B.pdf', source_resource_ids: [] }], exams: [] }); await h.go(page, `/${s}/classes/c1/f1`, 1300); c = await cards(page);
    h.check(`${s}: older items without recorded sources never cause a false "Not used yet"`, !/Not used yet/.test(c.classShelf) && !/hasn.t been used/.test(c.madeShelf) && /Old guide \| from Lecture A\.pdf \+ Lecture B\.pdf/.test(c.madeShelf.replace(/ +/g, ' ')), c.madeShelf);
    await page.close();
    page = await h.newPage({ width: 430, height: 1300 }); mocks(page, s, { res: [], guides: [], decks: [], exams: [] }); await h.go(page, `/${s}/classes/c1/f1`, 1300); c = await cards(page);
    h.check(`${s}: empty exam asks for class files first`, /Nothing uploaded yet/.test(c.classShelf) && /Start with what your professor gave you/.test(c.classShelf) && /Upload your class files first/.test(c.madeShelf));
    await page.click('[data-make="flashcards"]'); await h.sleep(400);
    h.check(`${s}: trying to make something with no files opens Upload instead`, /Add Resource/.test(await h.text(page)) && page.url().endsWith('/classes/c1/f1'));
    await page.close();

    // ── library ──
    page = await h.newPage({ width: 430, height: 1700 }); mocks(page, s);
    await page.evaluateOnNewDocument(sid => localStorage.setItem('ascend:recent:' + sid, JSON.stringify([{ key: 'deck-d1', made: true, kind: 'deck', title: 'Exam 2 deck', sub: 'Exercise Phys · Exam 2', href: `/${sid}/flashcards?deckId=d1` }, { key: 'file-r1', made: false, kind: 'pptx', title: 'Lecture 9 Bioenergetics', sub: 'Exercise Phys · Exam 2', href: location.origin + '/favicon.ico' }])), s);
    await h.go(page, `/${s}/classes`, 1200);
    h.check(`${s}: Classes page links to the Library`, !!(await page.$(`a[href="/${s}/library"]`)));
    await page.click(`a[href="/${s}/library"]`); await h.sleep(2000);
    const lib = () => page.evaluate(() => ({ url: location.pathname, groups: [...document.querySelectorAll('[data-group]')].map(g => `${g.dataset.group}=${g.querySelectorAll('[data-kind="class"]').length}+${g.querySelectorAll('[data-kind="made"]').length}`).join(' ; '), text: document.querySelector('main').innerText.replace(/\n+/g, ' | ') }));
    let L = await lib();
    h.check(`${s}: Library lists everything by class and exam, with counts on the filter`, L.url === `/${s}/library` && /8 items/.test(L.text) && /From class · 4/.test(L.text) && /Made by Ascend · 4/.test(L.text) && L.groups === 'Exercise Phys · Exam 2=3+3 ; Chem 116 · Exam 3=1+0 ; Not filed under an exam=0+1', L.groups + ' | ' + L.text.slice(0, 200));
    h.check(`${s}: recently opened shows both kinds, each in its own look`, await page.evaluate(() => { const r = document.querySelector('[data-recent]'); return !!r && r.querySelectorAll('[data-kind="made"]').length === 1 && r.querySelectorAll('[data-kind="class"]').length === 1; }));
    await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].find(b => /From class/.test(b.innerText)).click()); await h.sleep(250); L = await lib();
    h.check(`${s}: "From class" shows only uploads`, L.groups === 'Exercise Phys · Exam 2=3+0 ; Chem 116 · Exam 3=1+0', L.groups);
    await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].find(b => /Made by Ascend/.test(b.innerText)).click()); await h.sleep(250); L = await lib();
    h.check(`${s}: "Made by Ascend" shows only what Ascend made, and hides the upload box`, L.groups === 'Exercise Phys · Exam 2=0+3 ; Not filed under an exam=0+1' && !(await page.$('[data-dropzone]')), L.groups);
    await page.evaluate(() => [...document.querySelectorAll('[role=radio]')].find(b => b.innerText.trim() === 'All').click());
    await page.type('input[type=search]', 'chem'); await h.sleep(300); L = await lib();
    h.check(`${s}: search matches the class name`, L.groups === 'Chem 116 · Exam 3=1+0', L.groups);
    await page.$eval('input[type=search]', e => e.select()); await page.type('input[type=search]', 'old exam'); await h.sleep(300); L = await lib();
    h.check(`${s}: search finds old exams`, L.groups === 'Exercise Phys · Exam 2=1+0' && /Exam 2 from 2025/.test(L.text), L.groups);
    await page.$eval('input[type=search]', e => e.select()); await page.type('input[type=search]', 'zzzz'); await h.sleep(300);
    h.check(`${s}: no match says so`, /Nothing matches .zzzz./.test((await lib()).text));
    await page.$eval('input[type=search]', e => e.select()); await page.keyboard.press('Backspace'); await h.sleep(300);
    // move a file
    page.t.writes.length = 0;
    await page.click('button[aria-label="Move Buffers lecture"]'); await h.sleep(200);
    await page.select('select[aria-label="Move Buffers lecture to"]', 'f1'); await h.sleep(600); L = await lib();
    let w = page.t.writes.find(x => x.table === 'resources' && x.method === 'PATCH');
    h.check(`${s}: Move files it under another exam without re-uploading`, w && w.body.folder_id === 'f1' && Object.keys(w.body).length === 1 && w.query.includes('id=eq.r4') && L.groups.startsWith('Exercise Phys · Exam 2=4+3') && !page.t.writes.some(x => x.table === 'storage'), `${JSON.stringify(w)} ${L.groups}`);
    h.check(`${s}: made items have no Move, uploads have no Study`, await page.evaluate(() => [...document.querySelectorAll('[data-kind="made"]')].every(e => !/Move/.test(e.innerText)) && [...document.querySelectorAll('[data-file-row]')].every(e => !/Study|Review/.test(e.innerText))));
    // several files at once
    page.t.writes.length = 0;
    await page.select('select[aria-label="Upload into"]', 'f2');
    const input = await page.$('[data-dropzone] input[type=file]');
    await input.uploadFile(mkFile('Handout A.pdf'), mkFile('Handout B.pdf'), mkFile('notes.xyz')); await h.sleep(3000);
    const posts = page.t.writes.filter(x => x.table === 'resources' && x.method === 'POST'), stores = page.t.writes.filter(x => x.table === 'storage');
    const note = await page.$eval('[data-dropzone] [role=status]', e => e.innerText).catch(() => '');
    h.check(`${s}: several files upload together into the chosen exam, in this student's storage`, posts.length === 2 && posts.every(x => x.body.folder_id === 'f2' && x.body.file_type === 'pdf' && x.body.is_old_exam === false) && posts.map(x => x.body.file_name).sort().join(',') === 'Handout A,Handout B' && stores.length === 2 && stores.every(x => x.query.includes(`resources/${s}/f2/`)), JSON.stringify(posts.map(x => x.body)).slice(0, 300));
    h.check(`${s}: an unsupported file is skipped and named`, /Added 2 of 3/.test(note) && /notes\.xyz \(not a supported kind of file\)/.test(note), note);
    // open a made item
    await page.evaluate(() => [...document.querySelectorAll('[data-made-card="guide"] button')].pop().click()); await h.sleep(1500);
    h.check(`${s}: Open on a study guide goes to that guide`, page.url().endsWith(`/${s}/study?guideId=g1`), page.url());
    h.check(`${s}: library has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
    page = await h.newPage(); mocks(page, s, { res: [], guides: [], decks: [], exams: [] }); await h.go(page, `/${s}/library`, 1500);
    h.check(`${s}: empty library explains where things come from`, /Nothing here yet/.test(await h.text(page)) && page.t.errors.length === 0);
    await page.close();
  }
});
