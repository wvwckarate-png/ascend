// Learning from the real exam (what it showed, and how that reaches the next exam's generators) and weak spots by topic.
const h = require('./lib');
const NOW = '2026-11-16T10:00:00-05:00';
const INSIGHTS = { exam: 'Exam 1', learnedOn: '2026-11-16', source: 'Graded Exam 1', summary: 'Mostly application questions built on the lecture graphs.', topics: [{ topic: 'Enzyme kinetics', weight: 'heavy' }, { topic: 'Glycolysis', weight: 'some' }], styles: ['About 30 multiple choice, most applying a concept to a new case'], difficulty: 'Hard: little pure recall.', surprises: ['Reading Lineweaver-Burk plots'], nextTime: ['Practise interpreting every graph in the slides'] };
const RES = [
  { id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-01T10:00:00Z', is_old_exam: false, folder_id: 'f1', transcript: null },
  { id: 'r2', file_name: 'Exam 1 from 2025', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-03T10:00:00Z', is_old_exam: true, folder_id: 'f1', transcript: null },
  { id: 'r9', file_name: 'Graded Exam 1', file_type: 'image', storage_url: h.BASE + '/favicon.ico', created_at: '2026-11-12T15:00:00Z', is_old_exam: true, folder_id: 'f1', transcript: 'Q1 ... graded page text' },
];
function mocks(page, s, o = {}) {
  page.t.mocks.classes = q => { const all = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', notes: 'Curves exams.', is_active: true, grade_only: false }]; return all; };
  page.t.mocks.exam_folders = q => {
    const all = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: o.examDate || '2026-11-10', exam_insights: o.insights || null }, { id: 'f2', class_id: 'c1', name: 'Exam 2', exam_date: '2026-12-15', exam_insights: null }];
    if (q.get('exam_insights')) return all.filter(f => f.exam_insights).map(f => ({ exam_insights: f.exam_insights }));
    const id = (q.get('id') || '').replace('eq.', ''); return id ? all.filter(f => f.id === id) : all;
  };
  const res = o.res || RES;
  page.t.mocks.resources = q => { const f = q.get('folder_id') || '', ids = (q.get('id') || '').match(/^in\.\((.*)\)$/); if (ids) return res.filter(r => ids[1].replace(/"/g, '').split(',').includes(r.id)); return f.startsWith('eq.') ? res.filter(r => r.folder_id === f.slice(3)) : f.startsWith('in.') ? res.filter(r => f.includes(r.folder_id)) : res; };
  page.t.mocks.practice_exams = [{ id: 'e1', title: 'Practice 1', status: 'completed', score: 80, created_at: '2026-11-08T12:00:00Z', completed_at: '2026-11-08T13:00:00Z', folder_id: 'f1', source_resource_ids: ['r1'], questions: [{ type: 'mc', topic: 'Glycolysis', question: 'Where does glycolysis occur?' }, { type: 'tf', topic: 'Krebs cycle', question: 'The Krebs cycle makes ATP directly.' }] }];
  page.t.mocks.study_guides = []; page.t.mocks.flashcard_decks = o.decks || []; page.t.mocks.flashcard_cards = o.cards || []; page.t.mocks.flashcard_items = o.items || []; page.t.mocks.practice_exam_items = o.examItems || []; page.t.mocks.tasks = []; page.t.mocks.grades = [];
}
const card = page => page.evaluate(() => { const e = document.querySelector('[data-exam-insights]'); return e ? { state: e.dataset.examInsights, text: e.innerText.replace(/\n+/g, ' | ') } : null; });

h.run('learn', async () => {
  for (const s of h.STUDENTS) {
    // ── the graded exam is offered for reading ──
    let page = await h.newPage({ width: 430, height: 1500 }); await h.fakeClock(page, NOW); mocks(page, s);
    let calls = []; page.t.apiMocks['/api/exam-debrief'] = ({ bodyText }) => { calls.push(bodyText); return { delay: 300, json: { insights: INSIGHTS, failed: [] } }; };
    await h.go(page, `/${s}/classes/c1/f1`, 1500);
    let c = await card(page);
    h.check(`${s}: after the exam, a graded exam added on or after exam day is offered — last year's old exam is not`, c && c.state === 'ready' && /You added your graded exam \(Graded Exam 1\)/.test(c.text) && !/from 2025/.test(c.text) && /how Dr Smith really tests/.test(c.text), JSON.stringify(c));
    page.t.writes.length = 0;
    await h.clickText(page, 'Learn from this exam', { tag: 'button' }); await h.sleep(1800);
    const body = calls[0] || '';
    const sent = { res: h.field(body, 'resources'), tr: h.field(body, 'transcripts'), ctx: h.field(body, 'context'), practice: h.field(body, 'practice'), names: h.field(body, 'materialNames') };
    h.check(`${s}: only the graded exam is sent to be read, marked as the exam`, sent.res === '[]' && /"name":"Graded Exam 1"/.test(sent.tr) && /"oldExam":true/.test(sent.tr) && !/2025|Lecture 1/.test(sent.tr), JSON.stringify(sent).slice(0, 300));
    h.check(`${s}: it is compared with the practice questions Ascend made, and told the class and professor`, /Where does glycolysis occur/.test(sent.practice) && /"topic":"Krebs cycle"/.test(sent.practice) && /BIO 115/.test(sent.ctx) && /Dr Smith/.test(sent.ctx) && /Exam 1/.test(sent.ctx) && /Lecture 1/.test(sent.names) && !/Graded Exam 1/.test(sent.names), JSON.stringify(sent).slice(0, 400));
    const w = page.t.writes.find(x => x.table === 'exam_folders' && x.method === 'PATCH');
    h.check(`${s}: what it learned is saved on this exam`, w && w.query.includes('id=eq.f1') && w.body.exam_insights.summary === INSIGHTS.summary && Object.keys(w.body).length === 1, JSON.stringify(w).slice(0, 200));
    c = await card(page);
    h.check(`${s}: the page shows the summary, weighted topics, question styles, gaps and advice`, c && c.state === 'learned' && /Mostly application questions/.test(c.text) && /Enzyme kinetics · heavy/.test(c.text) && /Glycolysis/.test(c.text) && /About 30 multiple choice/.test(c.text) && /Lineweaver-Burk/.test(c.text) && /Practise interpreting every graph/.test(c.text) && /Hard: little pure recall/.test(c.text) && /next exam in BIO 115/.test(c.text), JSON.stringify(c));
    h.check(`${s}: learning from the exam leaves no errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await h.newPage({ width: 430, height: 1300 }); await h.fakeClock(page, NOW); mocks(page, s);
    page.t.apiMocks['/api/exam-debrief'] = { status: 422, json: { error: 'Ascend couldn’t read that as an exam. Check that the file marked as the graded exam is the right one.' } };
    await h.go(page, `/${s}/classes/c1/f1`, 1400); await h.clickText(page, 'Learn from this exam', { tag: 'button' }); await h.sleep(900); c = await card(page);
    h.check(`${s}: an unreadable exam says so and saves nothing`, c && c.state === 'ready' && /couldn.t read that as an exam/.test(c.text) && !page.t.writes.some(x => x.table === 'exam_folders'), JSON.stringify(c));
    await page.close();
    page = await h.newPage({ width: 430, height: 1300 }); await h.fakeClock(page, NOW); mocks(page, s, { examDate: '2026-12-01' }); await h.go(page, `/${s}/classes/c1/f1`, 1400);
    h.check(`${s}: before the exam there is nothing to learn from yet`, (await card(page)) === null);
    await page.close();
    page = await h.newPage({ width: 430, height: 1300 }); await h.fakeClock(page, NOW); mocks(page, s, { res: RES.slice(0, 2) }); await h.go(page, `/${s}/classes/c1/f1`, 1400);
    h.check(`${s}: after the exam with no graded exam uploaded, nothing is offered`, (await card(page)) === null);
    await page.close();
    page = await h.newPage({ width: 430, height: 1300 }); await h.fakeClock(page, NOW); mocks(page, s, { insights: INSIGHTS, res: RES.slice(0, 2) }); await h.go(page, `/${s}/classes/c1/f1`, 1400); c = await card(page);
    h.check(`${s}: saved insights show again on a later visit`, c && c.state === 'learned' && /Mostly application questions/.test(c.text) && !/Read it again/.test(c.text), JSON.stringify(c));
    await page.close();

    // ── …and they shape the next exam's materials ──
    for (const feature of ['practice-exam', 'flashcards', 'study']) {
      for (const learned of [true, false]) {
        page = await h.newPage(); mocks(page, s, { insights: learned ? INSIGHTS : null });
        page.t.mocks.students = [{ id: s, name: h.cap(s), track: 'Pre-Med', target_school: 'WVU', target_program: 'WVU School of Medicine', grad_year: 2030, generation_profile: '' }];
        page.t.mocks.resources = [{ id: 'x1', file_name: 'Lecture 7', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f2', transcript: null, is_old_exam: false }];
        page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: feature === 'study' ? '<h1>Guide</h1><p>Body</p>' : '[]' } });
        page.t.apiMocks['/api/check-resource'] = () => ({ status: 500, json: { error: 'x' } });
        await h.go(page, `/${s}/${feature}?folderId=f2&folderName=Exam%202`, 2200);
        if (!/1 file selected|1 selected/i.test(await h.text(page))) { await h.clickPointer(page, 'Lecture 7'); await h.sleep(300); }
        await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => /^(generate|make|create) /i.test(b.innerText.trim()) && b.innerText.length > 12); bs[bs.length - 1]?.click(); }); await h.sleep(2500);
        const call = page.t.apiCalls.find(x => x.path === '/api/generate-study-guide'); const prompt = call ? h.field(call.bodyText, 'prompt') : '';
        if (learned) h.check(`${s} ${feature}: the next exam's prompt carries what Exam 1 showed about this professor`, /PROFESSOR PROFILE/.test(prompt) && /Mostly application questions/.test(prompt) && /Weighted most heavily: Enzyme kinetics/.test(prompt) && /Practise interpreting every graph/.test(prompt) && /Curves exams/.test(prompt), prompt.slice(0, 200) + ' … ' + (prompt.match(/PROFESSOR PROFILE.{0,200}/) || [''])[0]);
        else h.check(`${s} ${feature}: with nothing learned yet, the prompt has no professor profile`, !!prompt && !/PROFESSOR PROFILE/.test(prompt) && /Curves exams/.test(prompt), prompt.slice(0, 160));
        await page.close();
      }
    }

    // ── topics are saved with new cards ──
    page = await h.newPage(); mocks(page, s);
    page.t.mocks.students = [{ id: s, name: h.cap(s), track: 'Pre-Med', grad_year: 2030, generation_profile: '' }];
    page.t.mocks.resources = [{ id: 'x1', file_name: 'Lecture 7', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f2', transcript: null, is_old_exam: false }];
    const FRONTS = ['Where in the cell does glycolysis take place?', 'What is the Michaelis constant a measure of?', 'Which molecule is the final electron acceptor?'];
    page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: JSON.stringify(FRONTS.map((f, i) => ({ front: f, back: 'Back ' + i, topic: i === 1 ? 'Enzyme kinetics.' : i === 0 ? 'Glycolysis' : undefined }))) } });
    page.t.apiMocks['/api/check-resource'] = () => ({ json: { verdicts: [{ i: 1, codes: ['unclear'], note: 'x', fix: { front: FRONTS[1], back: 'Clearer back' }, drop: false }], gaps: [] } });
    await h.go(page, `/${s}/flashcards?folderId=f2&folderName=Exam%202`, 2200);
    if (!/1 file selected|1 selected/i.test(await h.text(page))) { await h.clickPointer(page, 'Lecture 7'); await h.sleep(300); }
    await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => /^(generate|make|create) /i.test(b.innerText.trim()) && b.innerText.length > 12); bs[bs.length - 1]?.click(); }); await h.sleep(3000);
    await page.evaluate(() => { const i = [...document.querySelectorAll('input')].find(x => /deck name/i.test(x.placeholder)); if (i) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Topic deck'); i.dispatchEvent(new Event('input', { bubbles: true })); } }); await h.sleep(200);
    await h.clickText(page, 'Save Deck', { tag: 'button' }); await h.sleep(1500);
    const saved = (page.t.writes.find(x => x.table === 'flashcard_cards' && x.method === 'POST') || {}).body || [];
    h.check(`${s}: each new card is saved with its topic; a card the checker rewrote keeps its topic`, saved.length === 3 && saved.find(x => /glycolysis/.test(x.front)).topic === 'Glycolysis' && saved.find(x => /Michaelis/.test(x.front)).topic === 'Enzyme kinetics' && saved.find(x => /Michaelis/.test(x.front)).back === 'Clearer back' && saved.find(x => /electron/.test(x.front)).topic === null, JSON.stringify(saved).slice(0, 400));
    await page.close();

    // ── weak spots grouped by topic ──
    page = await h.newPage({ width: 430, height: 1700 }); await h.fakeClock(page, NOW);
    mocks(page, s, { examDate: '2026-12-01', decks: [{ id: 'd1', title: 'Deck', card_count: 4, created_at: '2026-11-05T10:00:00Z', folder_id: 'f1', source_resource_ids: ['r1'] }],
      items: [{ card_id: 'k1', times_seen: 4, times_missed: 3, is_retired: false }, { card_id: 'k2', times_seen: 5, times_missed: 2, is_retired: false }, { card_id: 'k3', times_seen: 6, times_missed: 3, is_retired: false }, { card_id: 'k4', times_seen: 5, times_missed: 0, is_retired: false }],
      cards: q => { const all = [{ id: 'k1', front: 'Km card', topic: 'Enzyme kinetics' }, { id: 'k2', front: 'Vmax card', topic: 'enzyme kinetics' }, { id: 'k3', front: 'Untagged old card', topic: null }, { id: 'k4', front: 'Known card', topic: 'Glycolysis' }]; const m = (q.get('id') || '').match(/^in\.\((.*)\)$/); return m ? all.filter(x => m[1].replace(/"/g, '').split(',').includes(x.id)) : all; },
      examItems: [{ question_text: 'Missed Km question', question_type: 'mc', topic: 'Enzyme kinetics' }, { question_text: 'Missed buffer question', question_type: 'tf', topic: 'Buffers' }] });
    await h.go(page, `/${s}/classes/c1/f1`, 1800);
    const topics = await page.$$eval('[data-weak-topics] > div', els => els.map(e => e.innerText.replace(/\n+/g, ' | ')));
    h.check(`${s}: misses are grouped by topic across cards and practice exams, worst first`, topics.length === 2 && topics[0] === 'Enzyme kinetics | 2 cards · 1 exam question' && topics[1] === 'Buffers | 1 exam question', JSON.stringify(topics));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /^Practice Exam$/.test(b.innerText.trim()) && b.closest('div').parentElement.querySelector('[data-weak-topics]'))?.click()); await h.sleep(1500);
    const focus = decodeURIComponent(page.url().split('weakSpots=')[1] || '');
    h.check(`${s}: targeted practice is aimed at the weak topics by name`, /practice-exam\?folderId=f1/.test(page.url()) && /^\["Topic: Enzyme kinetics","Topic: Buffers"/.test(focus), page.url().slice(0, 120) + ' ' + focus.slice(0, 120));
    await page.close();
  }
});
