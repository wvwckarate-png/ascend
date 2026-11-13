// Drag preview on class cards, the slimmer home page, the weak-spot drill, and the after-exam follow-up.
const h = require('./lib');
const NOW = '2026-11-12T10:00:00-05:00', TODAY = '2026-11-12';
const CLASSES = s => ['Anatomy', 'Biochem', 'Calculus', 'Dance', 'Ethics'].map((name, i) => ({ id: 'c' + (i + 1), student_id: s, name, semester: 'Fall', professor: '', is_active: true, grade_only: false, grading_schema: i === 0 ? { Homework: 20, Exams: 50, Final: 30 } : null }));
const cardOrder = page => page.evaluate(() => [...document.querySelectorAll('[data-reorder-id]')].map(e => e.dataset.reorderId).join(','));
const task = o => ({ id: 't1', title: 'HW 3', due_date: TODAY, due_time: null, task_type: 'assignment', completed: false, completed_at: null, class_name: null, resource_id: null, resource_type: null, ...o });
async function home(s, m = {}) {
  const page = await h.newPage({ width: 430, height: 1700 }); await h.fakeClock(page, NOW);
  page.t.mocks.classes = CLASSES(s);
  page.t.mocks.exam_folders = m.folders || [];
  page.t.mocks.tasks = (m.tasks || []).map(t => ({ student_id: s, ...t }));
  page.t.mocks['rpc/study_plan_decks'] = []; page.t.apiMocks['/api/study-days'] = { json: { days: [] } };
  page.t.mocks.resources = []; page.t.mocks.practice_exams = []; page.t.mocks.grades = m.grades || [];
  await h.go(page, `/${s}`, 1800);
  return page;
}

h.run('loop', async () => {
  for (const s of h.STUDENTS) {
    // dismissals are remembered per device, so start each student with a clean browser
    { const p0 = await h.newPage(); await h.go(p0, '/robots.txt', 100); await p0.evaluate(() => localStorage.clear()); await p0.close(); }
    // ── drag preview ──
    let page = await home(s);
    await h.clickText(page, 'Reorder', { tag: 'button', exact: true }); await h.sleep(300);
    const box = id => page.$eval(`[data-reorder-id="${id}"]`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75, left: r.left, top: r.top, w: r.width }; });
    const from = await box('c5'), to = await box('c1');
    h.check(`${s}: no floating card or outline before dragging`, !(await page.$('[data-drag-ghost]')) && !(await page.$('[data-drop-slot]')));
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 12, from.y - 18, { steps: 3 }); await h.sleep(120);
    let ghost = await page.$eval('[data-drag-ghost]', e => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, text: e.innerText, pe: getComputedStyle(e).pointerEvents }; }).catch(() => null);
    let slot = await page.$eval('[data-drop-slot]', e => ({ id: e.dataset.reorderId, border: getComputedStyle(e).borderTopStyle, shown: getComputedStyle(e.firstElementChild).visibility })).catch(() => null);
    h.check(`${s}: picking a card up shows a floating copy that follows the pointer`, ghost && /Ethics/.test(ghost.text) && ghost.pe === 'none' && Math.abs(ghost.cx - (from.x + 12)) < 30 && Math.abs(ghost.cy - (from.y - 18 - from.w * 0.0)) < 80, JSON.stringify(ghost));
    h.check(`${s}: its place in the grid becomes an empty dashed outline`, slot && slot.id === 'c5' && slot.border === 'dashed' && slot.shown === 'hidden', JSON.stringify(slot));
    page.t.writes.length = 0;
    await page.mouse.move(to.x, to.y, { steps: 10 });
    let sliding = 0; for (let i = 0; i < 12; i++) { sliding = Math.max(sliding, await page.evaluate(() => [...document.querySelectorAll('[data-reorder-id]')].filter(e => e.getAnimations().length > 0).length)); await h.sleep(50); }
    const mid = await cardOrder(page);
    slot = await page.$eval('[data-drop-slot]', e => { const r = e.getBoundingClientRect(); return { id: e.dataset.reorderId, left: r.left, top: r.top }; }).catch(() => null);
    h.check(`${s}: before letting go, the other cards have already slid aside and the outline sits where it will land`, mid.startsWith('c5,') && slot && slot.id === 'c5' && Math.abs(slot.left - to.left) < 3 && Math.abs(slot.top - to.top) < 3 && sliding >= 2 && !!(await page.$('[data-drag-ghost]')), `${mid} sliding=${sliding} ${JSON.stringify(slot)}`);
    h.check(`${s}: nothing is saved until the card is dropped`, page.t.writes.filter(x => x.table === 'classes').length === 0);
    await page.mouse.up(); await h.sleep(600);
    const w = page.t.writes.filter(x => x.table === 'classes' && x.method === 'PATCH');
    h.check(`${s}: dropping removes the floating card and saves the order`, !(await page.$('[data-drag-ghost]')) && !(await page.$('[data-drop-slot]')) && (await cardOrder(page)).startsWith('c5,') && w.length === 5 && w.find(x => x.query.includes('id=eq.c5'))?.body.sort_order === 0, `${await cardOrder(page)} ${w.length}`);
    // pick up and put back in the same place: nothing saved
    page.t.writes.length = 0; const b3 = await box('c3');
    await page.mouse.move(b3.x, b3.y); await page.mouse.down(); await page.mouse.move(b3.x + 6, b3.y + 4, { steps: 2 }); await h.sleep(100); await page.mouse.up(); await h.sleep(400);
    h.check(`${s}: lifting a card and putting it straight back saves nothing`, page.t.writes.filter(x => x.table === 'classes').length === 0 && !(await page.$('[data-drag-ghost]')));
    await page.click('button[aria-label="Move Anatomy later"]');
    const slid = await page.evaluate(() => [...document.querySelectorAll('[data-reorder-id]')].filter(e => e.getAnimations().length > 0).length);
    h.check(`${s}: arrow buttons slide the cards too`, slid >= 2, String(slid));
    h.check(`${s}: drag preview causes no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // ── slimmer home page ──
    page = await home(s, { tasks: [task({}), task({ id: 't2', title: 'Essay draft', due_date: '2026-11-20' }), task({ id: 't3', title: 'Ancient lab', due_date: '2026-09-01' }), task({ id: 't4', title: 'Yesterday quiz', due_date: '2026-11-11', task_type: 'quiz' })] });
    const cards = await page.evaluate(() => { const plan = document.querySelector('[data-today-plan]').innerText; const up = [...document.querySelectorAll('div')].find(d => /^COMING UP/i.test(d.innerText || '') && d.innerText.length < 600)?.innerText || ''; return { plan, up }; });
    h.check(`${s}: what is due now lives in the plan; "Coming Up" holds only later work and old leftovers`, /HW 3/.test(cards.plan) && /Yesterday quiz/.test(cards.plan) && !/Essay draft/.test(cards.plan) && /Essay draft/.test(cards.up) && /Long overdue/i.test(cards.up) && /Ancient lab/.test(cards.up) && !/HW 3/.test(cards.up) && !/Yesterday quiz/.test(cards.up), JSON.stringify(cards).slice(0, 500));
    h.check(`${s}: install tip is shown with a close button`, !!(await page.$('[data-install-hint]')));
    await page.click('[data-install-hint] button[aria-label="Hide this tip"]'); await h.sleep(200);
    const goneNow = !(await page.$('[data-install-hint]'));
    await page.reload({ waitUntil: 'networkidle2' }); await h.sleep(1200);
    h.check(`${s}: closing the tip hides it for good on this device`, goneNow && !(await page.$('[data-install-hint]')) && /My Classes/i.test(await h.text(page)));
    await page.close();

    // ── after the exam ──
    const folders = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-11-10' }, { id: 'f2', class_id: 'c1', name: 'Final Exam', exam_date: '2026-11-11' }, { id: 'f3', class_id: 'c2', name: 'Old Midterm', exam_date: '2026-09-01' }, { id: 'f4', class_id: 'c2', name: 'Next one', exam_date: '2026-11-30' }];
    page = await home(s, { folders });
    const fu = () => page.$eval('[data-exam-followup]', e => e.innerText.replace(/\n+/g, ' | ')).catch(() => '');
    let t = await fu();
    h.check(`${s}: recent exams without a score get a follow-up; old and future ones do not`, /How did Final Exam go\?/.test(t) && /yesterday/.test(t) && /How did Exam 1 go\?/.test(t) && /2 days ago/.test(t) && !/Old Midterm|Next one/.test(t), t);
    h.check(`${s}: follow-ups stay out of the progress ring`, !/How did/.test(await page.$eval('[data-today-plan]', e => e.innerText)));
    await page.click('[data-followup-exam="f1"] button'); await h.sleep(250);
    const pre = await page.$$eval('[data-followup-exam="f1"] [role=radio]', els => els.map(e => `${e.innerText}:${e.getAttribute('aria-checked')}`).join(' '));
    h.check(`${s}: score form opens with the Exams category already chosen`, /Exams:true/i.test(pre) && /Homework:false/i.test(pre) && /Final:false/i.test(pre), pre);
    h.check(`${s}: cannot save an empty score`, await page.evaluate(() => [...document.querySelectorAll('[data-followup-exam="f1"] button')].find(b => /Save score/.test(b.innerText)).disabled));
    await page.type('[data-followup-exam="f1"] input[aria-label="Your score"]', '44');
    await page.$eval('[data-followup-exam="f1"] input[aria-label="Out of"]', e => e.select()); await page.type('[data-followup-exam="f1"] input[aria-label="Out of"]', '50');
    await h.clickText(page, 'Save score', { tag: 'button' }); await h.sleep(700);
    let g = page.t.writes.find(x => x.table === 'grades' && x.method === 'POST');
    h.check(`${s}: score goes into that class's grade tracker under the exam's name`, g && g.body.class_id === 'c1' && g.body.student_id === s && g.body.category === 'Exams' && g.body.item_name === 'Exam 1' && g.body.score === 44 && g.body.max_score === 50, JSON.stringify(g?.body));
    t = await fu();
    const link = await page.$eval('[data-followup-saved] a', a => a.getAttribute('href')).catch(() => '');
    h.check(`${s}: then it offers to upload the graded exam, and stops asking about that exam`, /Exam 1: 88% saved to Anatomy/.test(t) && /Upload the graded exam/.test(t) && link === `/${s}/classes/c1/f1?upload=oldexam` && !/How did Exam 1 go/.test(t) && /How did Final Exam go/.test(t), `${t} ${link}`);
    await page.click('[data-followup-exam="f2"] button'); await h.sleep(250);
    const pre2 = await page.$$eval('[data-followup-exam="f2"] [role=radio]', els => els.map(e => `${e.innerText}:${e.getAttribute('aria-checked')}`).join(' '));
    h.check(`${s}: a final exam defaults to the Final category`, /Final:true/i.test(pre2) && /Exams:false/i.test(pre2), pre2);
    await h.clickText(page, 'Cancel', { tag: 'button', exact: true }); await h.sleep(200);
    await h.clickText(page, 'Not back yet', { tag: 'button' }); await h.sleep(250);
    h.check(`${s}: "Not back yet" puts the question away`, !/How did Final Exam go/.test(await fu()));
    h.check(`${s}: follow-up causes no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.reload({ waitUntil: 'networkidle2' }); await h.sleep(1500);
    h.check(`${s}: it stays away after a reload (and comes back by itself in 3 days)`, !/How did Final Exam go/.test(await fu()) && (await page.evaluate(() => Number(localStorage.getItem('ascend:exam-followup:f2')) - Date.now())) > 2.9 * 86400000);
    await page.close();
    page = await home(s, { folders, grades: [{ class_id: 'c1', item_name: 'exam 1 ' }, { class_id: 'c1', item_name: 'Final Exam' }] });
    h.check(`${s}: exams that already have a score are never asked about`, !(await page.$('[data-exam-followup]')));
    await page.close();
    page = await home(s, { folders }); page.t.failWrites.grades = true;
    await page.click('[data-followup-exam="f1"] button'); await h.sleep(200); await page.type('[data-followup-exam="f1"] input[aria-label="Your score"]', '90'); await h.clickText(page, 'Save score', { tag: 'button' }); await h.sleep(700);
    h.check(`${s}: a failed save says so and keeps the form open`, /Couldn.t save that score/.test(await fu()) && !(await page.$('[data-followup-saved]')));
    await page.close();
    // the upload link opens the folder's upload form with the old-exam switch on
    page = await h.newPage(); page.t.mocks.classes = CLASSES(s); page.t.mocks.exam_folders = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-11-10' }]; page.t.mocks.resources = [];
    for (const tb of ['flashcard_decks', 'flashcard_cards', 'flashcard_items', 'practice_exams', 'practice_exam_items', 'study_guides', 'tasks', 'grades']) page.t.mocks[tb] = [];
    await h.go(page, `/${s}/classes/c1/f1?upload=oldexam`);
    h.check(`${s}: "Upload the graded exam" opens the upload form with the old-exam switch on`, /Add Resource/.test(await h.text(page)) && (await page.$eval('[role=switch]', e => e.getAttribute('aria-checked')).catch(() => '')) === 'true');
    await page.close();

    // ── weak-spot drill ──
    const mkCards = async (url, weakTotal) => {
      const p = await h.newPage();
      p.t.mocks['rpc/study_plan_decks'] = [{ id: 'd1', weak: weakTotal }, { id: 'd2', weak: 0 }];
      p.t.mocks.flashcard_decks = [{ id: 'd1', student_id: s, title: 'Cell Deck', card_count: 3, created_at: '2026-10-01T00:00:00Z', folder_id: 'f1' }, { id: 'd2', student_id: s, title: 'Chem Deck', card_count: 2, created_at: '2026-10-02T00:00:00Z', folder_id: null }];
      const item = (id, card, deck, seen, missed, extra = {}) => ({ id, card_id: card, deck_id: deck, student_id: s, times_seen: seen, times_correct: seen - missed, times_missed: missed, interval_days: 2, is_retired: false, next_review: '2026-12-01T00:00:00Z', ...extra });
      p.t.mocks.flashcard_items = weakTotal ? [item('i1', 'k1', 'd1', 4, 2), item('i2', 'k2', 'd1', 5, 0), item('i3', 'k3', 'd2', 5, 5), item('i4', 'k4', 'd2', 10, 3)] : [item('i2', 'k2', 'd1', 5, 0)];
      const all = [{ id: 'k1', deck_id: 'd1', front: 'Half-missed card', back: 'B1', position: 0 }, { id: 'k2', deck_id: 'd1', front: 'Easy card', back: 'B2', position: 1 }, { id: 'k3', deck_id: 'd2', front: 'Always-missed card', back: 'B3', position: 0 }, { id: 'k4', deck_id: 'd2', front: 'Mostly-known card', back: 'B4', position: 1 }];
      p.t.mocks.flashcard_cards = (q) => { const m = (q.get('id') || '').match(/^in\.\((.*)\)$/); return m ? all.filter(c => m[1].split(',').map(x => x.replace(/"/g, '')).includes(c.id)) : all; };
      p.t.mocks.classes = []; p.t.mocks.exam_folders = []; p.t.mocks.resources = []; p.t.mocks.tasks = [];
      await h.go(p, url, 1800); return p;
    };
    page = await mkCards(`/${s}/flashcards`, 2); t = await h.text(page);
    h.check(`${s}: decks page offers a weak-spot drill with the count`, /2 weak spots/.test(t) && /Drill them/.test(t), t.slice(0, 250));
    await h.clickText(page, 'Drill them', { tag: 'button' }); await h.sleep(1200); t = await h.text(page);
    h.check(`${s}: drill holds only the cards they keep missing, worst first`, /Weak-spot drill · 2 cards you keep missing/.test(t) && /Always-missed card/.test(t) && !/Easy card|Mostly-known card/.test(t), t.slice(0, 300));
    page.t.writes.length = 0; await page.keyboard.press('ArrowRight'); await h.sleep(300); await page.keyboard.press('2'); await h.sleep(700);
    const upd = page.t.writes.find(x => x.table === 'flashcard_items');
    h.check(`${s}: rating a drilled card updates that card's own record`, upd && upd.method === 'PATCH' && upd.query.includes('id=eq.i3') && upd.body.times_seen === 6 && upd.body.times_correct === 1, JSON.stringify(upd));
    h.check(`${s}: next drilled card comes from another deck`, /Half-missed card/.test(await h.text(page)));
    h.check(`${s}: drill causes no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
    page = await mkCards(`/${s}/flashcards?drill=weak&drillFolder=f1`, 2);
    const deckGets = []; t = await h.text(page);
    h.check(`${s}: a drill link from a folder starts straight away`, /Weak-spot drill/.test(t), t.slice(0, 200));
    await page.close();
    page = await h.newPage(); const seen = []; page.on('request', r => { if (r.url().includes('/rest/v1/flashcard_decks')) seen.push(r.url()); });
    page.t.mocks.flashcard_decks = []; page.t.mocks.flashcard_items = []; page.t.mocks.flashcard_cards = []; page.t.mocks['rpc/study_plan_decks'] = []; page.t.mocks.classes = []; page.t.mocks.exam_folders = []; page.t.mocks.resources = [];
    await h.go(page, `/${s}/flashcards?drill=weak&drillFolder=f1`, 1500); t = await h.text(page);
    h.check(`${s}: folder drill only looks at that folder's decks; nothing weak -> a friendly note`, seen.some(u => /folder_id=eq\.f1/.test(u) && u.includes('student_id=eq.' + s)) && /No weak spots right now/.test(t), `${seen.join(' ').slice(0, 200)} | ${t.slice(0, 160)}`);
    await page.close();
    page = await mkCards(`/${s}/flashcards`, 0);
    h.check(`${s}: no drill offer when nothing is weak`, !/weak spot/i.test(await h.text(page)));
    await page.close();
  }
});
