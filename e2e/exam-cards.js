// Practice exams + flashcards: taking, scoring, retry, retake, timer, math, spaced repetition, delete cascade.
const h = require('./lib');
const QUESTIONS = [
  { type: 'mc', question: 'Powerhouse of the cell?', options: { A: 'Nucleus', B: 'Mitochondria', C: 'Ribosome', D: 'Golgi' }, answer: 'B', explanation: 'Mitochondria make ATP.', source: 'mitochondria make ATP (Lecture)', flag: 'Possible discrepancy: sources differ.' },
  { type: 'tf', question: 'DNA is found in the nucleus.', answer: 'True', explanation: 'Yes.' },
  { type: 'mc', question: 'Which is a lipid?', options: { A: 'Glucose', B: 'Cholesterol', C: 'Alanine', D: 'RNA' }, answer: 'B', explanation: 'Sterol.' },
  { type: 'sa', question: 'Define osmosis.', model_answer: 'Diffusion of water across a membrane.' },
];
h.run('exam-cards', async () => {
  for (const s of h.STUDENTS) {
    const mk = async (extra = {}) => {
      const page = await h.newPage();
      page.t.mocks.practice_exams = [{ id: 'e1', student_id: s, title: 'Cell Exam', questions: QUESTIONS, responses: {}, score: null, status: 'in_progress', created_at: '2026-10-01T10:00:00Z', completed_at: null, timer_seconds: null, folder_id: null, ...extra }];
      for (const t of ['practice_exam_items', 'exam_folders', 'classes', 'resources', 'tasks']) page.t.mocks[t] = [];
      return page;
    };
    let page = await mk(); await h.go(page, `/${s}/practice-exam`);
    h.check(`${s}: history lists the exam`, /Cell Exam/.test(await h.text(page)));
    await h.clickButton(page, /continue|resume/); await h.sleep(900);
    let t = await h.text(page);
    h.check(`${s}: exam shows all 4 questions`, /Powerhouse/.test(t) && /Define osmosis/.test(t) && /Multiple Choice/i.test(t) && /True \/ False/i.test(t));
    h.check(`${s}: flag/source hidden while taking the exam`, !/Double-check this|From your materials/i.test(t));
    await h.clickPointer(page, 'Mitochondria');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'False')?.click());
    await h.clickPointer(page, 'Glucose'); await page.type('textarea', 'water moves'); await h.sleep(300);
    h.check(`${s}: answered counter 4 of 4`, /4 of 4/.test(await h.text(page)));
    page.t.writes.length = 0;
    await h.clickButton(page, /submit/); await h.sleep(1300); t = await h.text(page);
    const upd = page.t.writes.find(x => x.table === 'practice_exams' && x.method === 'PATCH');
    h.check(`${s}: submit saves score 33 + completed`, upd && upd.body.score === 33 && upd.body.status === 'completed', JSON.stringify(upd?.body));
    const items = page.t.writes.find(x => x.table === 'practice_exam_items' && x.method === 'POST');
    h.check(`${s}: items recorded for the right student (2 wrong, SA unscored)`, items && items.body.length === 4 && items.body.filter(i => i.is_correct === false).length === 2 && items.body[3].is_correct === null && items.body.every(i => i.student_id === s));
    h.check(`${s}: results show 33% + source quote + double-check flag`, /33\s*%/.test(t) && /From your materials/i.test(t) && /Double-check this/i.test(t));
    page.t.writes.length = 0;
    await h.clickButton(page, /retry|missed/); await h.sleep(1200);
    const rw = page.t.writes.find(x => x.table === 'practice_exams' && x.method === 'POST');
    h.check(`${s}: Retry Missed = only the 2 missed questions`, rw && rw.body.questions.length === 2 && /^Retry:/.test(rw.body.title) && rw.body.student_id === s);
    h.check(`${s}: exam flow has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await mk({ status: 'completed', score: 33, responses: { 0: 'B', 1: 'False', 2: 'A', 3: 'water' }, completed_at: '2026-10-02T10:00:00Z' });
    await h.go(page, `/${s}/practice-exam`); page.t.writes.length = 0;
    await h.clickButton(page, /clear & retake/); await h.sleep(1200);
    const rp = page.t.writes.find(x => x.table === 'practice_exams' && x.method === 'PATCH'), rd = page.t.writes.find(x => x.table === 'practice_exam_items' && x.method === 'DELETE');
    h.check(`${s}: history Clear & Retake resets the clicked exam + its items`, rp && rp.query.includes('id=eq.e1') && rp.body.status === 'in_progress' && rd && rd.query.includes('exam_id=eq.e1') && /0 of 4/.test(await h.text(page)));
    page.t.writes.length = 0;
    await page.close();

    page = await mk({ timer_seconds: 4 }); await h.go(page, `/${s}/practice-exam`);
    await h.clickButton(page, /continue|resume/); await h.sleep(1200);
    h.check(`${s}: timer visible on a reopened timed exam`, /0:0[1-4]/.test(await h.text(page)));
    page.t.writes.length = 0; await h.sleep(5000);
    h.check(`${s}: auto-submits at 0:00`, page.t.writes.some(x => x.table === 'practice_exams' && x.method === 'PATCH' && x.body.status === 'completed'));
    await page.close();

    page = await mk({ questions: [{ type: 'mc', question: 'Solve $x^2 = 9$. What is $x$?', options: { A: '$x = 3$ only', B: '$x = \\pm 3$', C: '$x = 9$', D: 'None' }, answer: 'B', explanation: 'x' }, { type: 'tf', question: 'A ticket costs $5 and a snack costs $10.', answer: 'True', explanation: 'p' }] });
    await h.go(page, `/${s}/practice-exam`); await h.clickButton(page, /continue|resume/); await h.sleep(1500);
    h.check(`${s}: math typeset; prices stay text`, (await page.evaluate(() => document.querySelectorAll('.katex').length)) >= 3 && /costs \$5 and a snack costs \$10/.test(await h.text(page)));
    await page.close();

    page = await mk(); page.t.mocks.practice_exam_items = []; await h.go(page, `/${s}/practice-exam`); page.t.writes.length = 0;
    await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === '' && b.querySelector('svg') && getComputedStyle(b).color === 'rgb(196, 120, 120)'); bs[0]?.click(); }); await h.sleep(900);
    h.check(`${s}: deleting an exam removes items + review tasks first`, page.t.writes.filter(x => x.method === 'DELETE').map(x => x.table).join(',') === 'practice_exam_items,tasks,practice_exams');
    await page.close();

    // ---- flashcards
    const mkF = async () => {
      const p = await h.newPage();
      p.t.mocks.flashcard_decks = [{ id: 'd1', student_id: s, title: 'Cell Bio Deck', card_count: 3, folder_id: null, created_at: '2026-10-01T00:00:00Z' }];
      p.t.mocks.flashcard_cards = [0, 1, 2].map(i => ({ id: 'k' + i, deck_id: 'd1', front: `Front ${i}`, back: `Back ${i}`, position: i }));
      p.t.mocks.flashcard_items = [
        { id: 'i0', card_id: 'k0', deck_id: 'd1', student_id: s, times_seen: 3, times_correct: 3, times_missed: 0, interval_days: 4, next_review: '2020-01-01T00:00:00Z', is_retired: true },
        { id: 'i2', card_id: 'k2', deck_id: 'd1', student_id: s, times_seen: 2, times_correct: 2, times_missed: 0, interval_days: 8, next_review: '2099-01-01T00:00:00Z', is_retired: false }];
      for (const t of ['classes', 'exam_folders', 'resources', 'tasks']) p.t.mocks[t] = [];
      return p;
    };
    page = await mkF(); await h.go(page, `/${s}/flashcards`);
    await h.clickPointer(page, 'Cell Bio Deck'); await h.sleep(1000);
    h.check(`${s}: deck detail lists cards`, /Front 0/.test(await h.text(page)) && /Front 2/.test(await h.text(page)));
    await h.clickText(page, 'Study Due', { tag: 'button' }); await h.sleep(900); t = await h.text(page);
    h.check(`${s}: Study Due = only the due card (mastered + future excluded)`, /Front 1/.test(t) && !/Front 0/.test(t) && !/Front 2/.test(t));
    await page.keyboard.press('ArrowLeft'); await h.sleep(300);
    h.check(`${s}: arrow key flips the card`, /Back 1/.test(await h.text(page)));
    page.t.writes.length = 0; await page.keyboard.press('2'); await h.sleep(800);
    const ins = page.t.writes.find(x => x.table === 'flashcard_items' && x.method === 'POST'); const nr = ins && new Date(ins.body.next_review);
    h.check(`${s}: rating saved for the right student, due at the start of a future day`, ins && ins.body.student_id === s && ins.body.times_correct === 1 && nr.getHours() === 0 && nr > new Date(), JSON.stringify(ins?.body));
    h.check(`${s}: flashcards have no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
    page = await mkF(); await h.go(page, `/${s}/flashcards`); page.t.writes.length = 0;
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === '✕')[0]?.click()); await h.sleep(1200);
    h.check(`${s}: deleting a deck removes items, cards, review tasks, then the deck`, page.t.writes.filter(x => x.method === 'DELETE').map(x => x.table).join(',') === 'flashcard_items,flashcard_cards,tasks,flashcard_decks');
    await page.close();
  }
});
