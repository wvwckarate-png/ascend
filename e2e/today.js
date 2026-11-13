// Home page "Today's Plan" (ring + streak), grade targeting on the class page, and class context from the general screen.
const h = require('./lib');
const NOW = '2026-11-12T10:00:00-05:00', TODAY = '2026-11-12';
const ring = page => page.$eval('[data-today-plan] [role=img]', e => e.getAttribute('aria-label')).catch(() => null);
const fill = page => page.$eval('[data-ring-fill]', e => { const c = parseFloat(e.getAttribute('stroke-dasharray')); return Math.round((1 - parseFloat(getComputedStyle(e).strokeDashoffset) / c) * 100); });
const items = page => page.$$eval('[data-plan-item]', els => els.map(e => ({ kind: e.dataset.planItem, done: e.dataset.done, text: e.innerText.replace(/\n+/g, ' | ') })));
const saves = page => page.t.apiCalls.filter(c => c.path === '/api/study-days').map(c => JSON.parse(c.bodyText)).filter(b => b.day !== undefined);
const planText = page => page.$eval('[data-today-plan]', e => e.innerText).catch(() => '');
const deck = o => ({ id: 'd1', title: 'Cell Deck', folder_id: 'f1', class_name: 'BIO 115', created_at: '2026-10-01T00:00:00Z', cards: 20, new_cards: 0, due_seen: 6, reviewed_today: 2, weak: 3, retired: 0, ...o });
const task = o => ({ id: 't1', title: 'HW 3', due_date: TODAY, due_time: null, task_type: 'assignment', completed: false, completed_at: null, class_name: 'BIO 115', resource_id: null, resource_type: null, ...o });
async function home(s, m = {}) {
  const page = await h.newPage({ width: 430, height: 1500 }); await h.fakeClock(page, NOW);
  page.t.mocks.students = [{ id: s, name: h.cap(s), grade: '', focus: 'Exercise Physiology' }];
  page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', is_active: true, grade_only: false }];
  page.t.mocks.exam_folders = m.folders || [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-11-15' }];
  page.t.mocks.tasks = (m.tasks || []).map(t => ({ student_id: s, ...t }));
  page.t.mocks['rpc/study_plan_decks'] = m.decks || [];
  page.t.apiMocks['/api/study-days'] = { json: { days: m.days || [] } };
  page.t.mocks.resources = m.resources || [{ folder_id: 'f1' }, { folder_id: 'f1' }];
  page.t.mocks.practice_exams = m.exams || [{ folder_id: 'f1', status: 'completed', completed_at: '2026-11-09T15:00:00-05:00', created_at: '2026-11-09T14:00:00-05:00' }];
  await h.go(page, `/${s}`, 1800);
  return page;
}

h.run('today', async () => {
  for (const s of h.STUDENTS) {
    // ── a normal day ──
    let page = await home(s, { tasks: [task({}), task({ id: 't2', title: 'Review: Krebs guide', task_type: 'review', resource_id: 'g1', resource_type: 'study_guide', class_name: null }), task({ id: 't3', title: 'Future essay', due_date: '2026-11-20' }), task({ id: 't4', title: 'Review: Cell Deck flashcards', task_type: 'review', resource_id: 'd1', resource_type: 'flashcard_deck' })],
      decks: [deck({})], days: [{ day: '2026-11-11', planned: 3, done: 2 }, { day: '2026-11-10', planned: 2, done: 1 }] });
    let t = await planText(page), it = await items(page);
    h.check(`${s}: plan card heads the home page with the count`, /TODAY.S PLAN/i.test(t) && /4 things to do today/.test(t) && /Next: HW 3/.test(t), t.slice(0, 200));
    h.check(`${s}: order is graded work, exam prep, due cards, then reviews`, it.length === 4 && /HW 3/.test(it[0].text) && /Take a practice exam: Exam 1/.test(it[1].text) && /Review: Cell Deck/.test(it[2].text) && /Krebs guide/.test(it[3].text), JSON.stringify(it));
    h.check(`${s}: due cards show count, weak cards and exam countdown`, /6 cards due · 3 you keep missing · exam in 3 days/.test(it[2].text) && /BIO 115/.test(it[2].text), it[2].text);
    h.check(`${s}: deck reminder and due cards are shown once; future tasks left out`, !/Future essay/.test(t) && (t.match(/Cell Deck/g) || []).length === 1);
    h.check(`${s}: ring reads 0 of 4 and is partly filled by cards already reviewed`, (await ring(page)) === '0 of 4 done today' && (await fill(page)) > 3 && (await fill(page)) < 12, `${await ring(page)} ${await fill(page)}`);
    h.check(`${s}: streak counts earlier days while today is still open`, /2-day streak/.test(t));
    let w = saves(page);
    h.check(`${s}: today's numbers saved once for this student`, w.length === 1 && w[0].student === s && w[0].day === TODAY && w[0].planned === 4 && w[0].done === 0 && !page.t.writes.some(x => x.table === 'study_days'), JSON.stringify(w).slice(0, 300));
    h.check(`${s}: the old spaced-repetition band is gone (the plan replaces it)`, !/SPACED REPETITION/i.test(await h.text(page)));
    page.t.writes.length = 0; page.t.apiCalls.length = 0;
    await page.click('[data-today-plan] button[aria-label=\'Mark "HW 3" done\']'); await h.sleep(900);
    t = await planText(page); it = await items(page);
    const tw = page.t.writes.find(x => x.table === 'tasks' && x.method === 'PATCH');
    h.check(`${s}: ticking a task saves it with the time it was finished`, tw && tw.body.completed === true && /^2026-11-12T/.test(tw.body.completed_at || '') && tw.query.includes('id=eq.t1'), JSON.stringify(tw));
    h.check(`${s}: ring, headline, streak and order update at once`, (await ring(page)) === '1 of 4 done today' && /3 to go/.test(t) && /3-day streak/.test(t) && /Next: Take a practice exam/.test(t) && it[3].done === 'true' && /HW 3/.test(it[3].text), `${await ring(page)} | ${t.slice(0, 160)}`);
    w = saves(page);
    h.check(`${s}: progress saved again with 1 done`, w.length === 1 && w[0].done === 1 && w[0].planned === 4, JSON.stringify(w).slice(0, 200));
    await page.click('[data-today-plan] button[aria-label=\'Mark "HW 3" not done\']'); await h.sleep(700);
    const tw2 = page.t.writes.filter(x => x.table === 'tasks' && x.method === 'PATCH').pop();
    h.check(`${s}: un-ticking clears it`, tw2.body.completed === false && tw2.body.completed_at === null && (await ring(page)) === '0 of 4 done today');
    await page.click('[data-today-plan] button[aria-label="Open Review: Cell Deck"]'); await h.sleep(1500);
    h.check(`${s}: Study opens that deck`, page.url().endsWith(`/${s}/flashcards?deckId=d1`), page.url());
    h.check(`${s}: plan causes no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // ── everything finished ──
    page = await home(s, { tasks: [task({ completed: true, completed_at: '2026-11-12T09:00:00-05:00' })], decks: [deck({ due_seen: 0, reviewed_today: 8, weak: 0 })], exams: [{ folder_id: 'f1', status: 'completed', completed_at: '2026-11-12T08:30:00-05:00', created_at: '2026-11-12T08:00:00-05:00' }], days: [{ day: TODAY, planned: 3, done: 3 }, { day: '2026-11-11', planned: 1, done: 1 }] });
    t = await planText(page);
    h.check(`${s}: finished day shows a full ring and says so`, /Plan complete/.test(t) && (await ring(page)) === '3 of 3 done today' && (await fill(page)) === 100 && /2-day streak/.test(t) && (await items(page)).every(i => i.done === 'true'), `${t.slice(0, 150)} ${await ring(page)} ${await fill(page)}`);
    h.check(`${s}: nothing re-saved when today's numbers are unchanged`, saves(page).length === 0);
    await page.close();

    // ── nothing to do ──
    page = await home(s, { folders: [], resources: [], exams: [] });
    t = await planText(page);
    h.check(`${s}: empty day is calm, with no streak pill and nothing saved`, /all caught up/i.test(t) && (await ring(page)) === 'Nothing planned today' && !/streak/.test(t) && (await items(page)).length === 0 && saves(page).length === 0, t);
    await page.close();

    // ── exam close, nothing prepared; long list ──
    page = await home(s, { folders: [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-11-13' }, { id: 'f2', class_id: 'c1', name: 'Exam 2', exam_date: '2026-11-20' }], resources: [{ folder_id: 'f2' }], exams: [],
      tasks: [1, 2, 3, 4].map(n => task({ id: 'x' + n, title: 'Assignment ' + n, due_date: '2026-11-1' + (n % 2) })), decks: [deck({ id: 'd9', folder_id: null, title: 'Loose deck', weak: 0 })] });
    t = await planText(page); it = await items(page);
    h.check(`${s}: long plan shows five with a "Show all" button`, it.length === 5 && /Show all 7/.test(t), `${it.length} ${t.slice(-80)}`);
    await h.clickText(page, 'Show all 7', { tag: 'button' }); await h.sleep(300); it = await items(page);
    h.check(`${s}: exam tomorrow with no uploads asks for materials; next exam asks for flashcards`, it.length === 7 && it.some(i => /Upload your materials for Exam 1/.test(i.text) && /Exam tomorrow · nothing uploaded yet/.test(i.text)) && it.some(i => /Make flashcards for Exam 2/.test(i.text) && /Exam in 8 days/.test(i.text)), JSON.stringify(it.map(i => i.text)));
    await page.click('[data-today-plan] button[aria-label="Open Make flashcards for Exam 2"]'); await h.sleep(1500);
    h.check(`${s}: exam-prep step opens the right folder's generator`, /\/flashcards\?folderId=f2&folderName=Exam%202$/.test(page.url()), page.url());
    await page.close();

    // ── database trouble: the home page still works ──
    page = await h.newPage({ width: 430, height: 1200 }); await h.fakeClock(page, NOW);
    page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: '', is_active: true, grade_only: false }]; page.t.mocks.exam_folders = []; page.t.mocks.tasks = [{ student_id: s, ...task({}) }];
    page.t.mocks['rpc/study_plan_decks'] = { message: 'function unavailable' };   // not a list: what a broken reply looks like
    await h.go(page, `/${s}`, 1800).catch(() => {});
    t = await h.text(page);
    h.check(`${s}: plan still shows tasks if the card counter fails`, /HW 3/.test(await planText(page)) && /My Classes/i.test(t), (await planText(page)).slice(0, 120));
    await page.close();

    // ── grade targeting on the class page ──
    page = await h.newPage({ width: 430, height: 1600 });
    page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', notes: '', grading_schema: { Exams: 50, Homework: 20, Final: 30 } }];
    page.t.mocks.exam_folders = []; page.t.mocks.grades = [{ id: 'g1', category: 'Exams', item_name: 'Exam 1', score: 90, max_score: 100 }, { id: 'g2', category: 'Homework', item_name: 'HW 1', score: 19, max_score: 20 }];
    await h.go(page, `/${s}/classes/c1`);
    const gt = () => page.$eval('[data-grade-target]', e => e.innerText.replace(/\n+/g, ' | ')).catch(() => '');
    t = await gt();
    h.check(`${s}: class page says what is needed on the final for an A`, /96\.7%/.test(t) && /needed on what.s left for an A/.test(t) && /Still to come: Final \(30%\)/.test(t), t);
    await page.click('[data-grade-target] [role=radio]:nth-child(2)'); await h.sleep(250); t = await gt();
    h.check(`${s}: switching the target to A- recalculates`, /86\.7%/.test(t) && /for an A-/.test(t), t);
    await page.click('[data-grade-target] [role=radio]:nth-child(4)'); await h.sleep(250); t = await gt();
    h.check(`${s}: an easier target shows the lower number`, /63\.3%/.test(t) && /for a B/.test(t), t);
    h.check(`${s}: grade target causes no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
    page = await h.newPage(); page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: '', notes: '', grading_schema: { Exams: 50, Final: 50 } }]; page.t.mocks.exam_folders = []; page.t.mocks.grades = [];
    await h.go(page, `/${s}/classes/c1`);
    h.check(`${s}: no target card until there is a grade`, !(await page.$('[data-grade-target]')) && /Grade Tracker/i.test(await h.text(page)));
    await page.close();

    // ── class context when resources are picked from the general screen ──
    for (const feature of ['practice-exam', 'flashcards', 'study']) {
      page = await h.newPage();
      page.t.mocks.students = [{ id: s, name: h.cap(s), track: 'Pre-Med', target_school: 'WVU', target_program: 'WVU School of Medicine', grad_year: 2030, generation_profile: '' }];
      page.t.mocks.classes = (p) => { const all = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', notes: 'Curves exams', is_active: true, grade_only: false }, { id: 'c2', student_id: s, name: 'CHEM 115', semester: 'Fall', professor: 'Dr Jones', notes: '', is_active: true, grade_only: false }]; const id = (p.get('id') || '').replace('eq.', ''); return id ? all.filter(c => c.id === id) : all; };
      page.t.mocks.exam_folders = (p) => { const all = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-12-30' }, { id: 'f2', class_id: 'c2', name: 'Midterm', exam_date: null }]; const id = (p.get('id') || '').replace('eq.', ''); return id ? all.filter(f => f.id === id) : all; };
      page.t.mocks.resources = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f1', transcript: null }, { id: 'r2', file_name: 'Chem notes', file_type: 'pdf', storage_url: h.BASE + '/favicon.ico', folder_id: 'f2', transcript: null }];
      for (const tb of ['flashcard_decks', 'flashcard_cards', 'flashcard_items', 'practice_exams', 'practice_exam_items', 'study_guides', 'tasks', 'grades']) page.t.mocks[tb] = [];
      page.t.apiMocks['/api/generate-study-guide'] = () => ({ json: { studyGuide: feature === 'study' ? '<h1>Guide</h1><p>Body</p>' : '[]' } });
      page.t.apiMocks['/api/check-resource'] = () => ({ status: 500, json: { error: 'x' } });
      const gen = () => page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => /^(generate|make|create) /i.test(b.innerText.trim()) && b.innerText.length > 12); bs[bs.length - 1]?.click(); });
      await h.go(page, `/${s}/${feature}`); await h.clickButton(page, /new|generate|make|create/); await h.sleep(800);
      await h.clickPointer(page, 'BIO 115'); await h.sleep(250); await h.clickPointer(page, 'Exam 1'); await h.sleep(250); await h.clickPointer(page, 'Lecture 1'); await h.sleep(900);
      await gen(); await h.sleep(2500);
      let call = page.t.apiCalls.find(c => c.path === '/api/generate-study-guide'); let prompt = call ? h.field(call.bodyText, 'prompt') : '';
      h.check(`${s} ${feature}: one class picked from the general screen -> prompt names the class and professor`, /BIO 115/.test(prompt) && /Dr Smith/.test(prompt) && !/Dr Jones/.test(prompt) && !/undefined/.test(prompt), prompt.slice(0, 300));
      await page.close();
    }
  }
});
