// Visual + text snapshot of every screen for every student, with fixed data, clock and randomness.
//   node e2e/visual.js capture <dir>        take snapshots
//   node e2e/visual.js compare <dirA> <dirB> report text + pixel differences
// Used to prove a refactor changed nothing a student can see.
const fs = require('fs'); const path = require('path');
const h = require('./lib');

const Q = [
  { type: 'mc', question: 'Powerhouse of the cell?', options: { A: 'Nucleus', B: 'Mitochondria', C: 'Ribosome', D: 'Golgi' }, answer: 'B', explanation: 'Mitochondria make ATP.', source: 'mitochondria make ATP (Lecture 3)', flag: 'Possible discrepancy: the handout and slides differ.' },
  { type: 'tf', question: 'DNA is found in the nucleus.', answer: 'True', explanation: 'Yes.' },
  { type: 'sa', question: 'Define osmosis.', model_answer: 'Diffusion of water across a membrane.' },
];
const GUIDE = '<div class="sg-section"><h1 class="sg-h1">CELLS</h1><p class="sg-body">Mitochondria make <span class="sg-term">ATP</span>. Energy is $E = mc^2$.</p><ul class="sg-ul"><li>Point one</li><li>Point two</li></ul><div class="sg-callout"><span class="sg-callout-label">LIKELY TESTED</span><p>Know the stages.</p></div><table class="sg-table"><thead><tr><th>Stage</th><th>ATP</th></tr></thead><tbody><tr><td>Glycolysis</td><td>2</td></tr></tbody></table></div>';

function mocks(page, s) {
  const N = h.cap(s); const m = page.t.mocks;
  m.students = [{ id: s, name: N, focus: 'Exercise Physiology · Track', track: 'Pre-Med', bio: 'A short bio.', target_school: 'WVU', target_program: 'WVU School of Medicine', grad_year: 2030, generation_profile: 'Strong on concepts.' }];
  const cls = (o) => ({ student_id: s, semester: 'Fall 2026', professor: 'Dr Smith', notes: 'Emphasises diagrams.', class_level: null, credit_hours: 3, is_bcpm: false, is_science: false, grade_only: false, letter_grade: null, grading_schema: null, is_active: true, ...o });
  const all = [cls({ id: 'c1', name: 'BIO 115', is_bcpm: true, grading_schema: { Exams: 60, Homework: 40 } }), cls({ id: 'c2', name: 'CHEM 115' }), cls({ id: 'c3', name: 'ART 101', grade_only: true, letter_grade: 'B+' }), cls({ id: 'c4', name: 'AP Physics', class_level: 'AP' }), cls({ id: 'c5', name: 'MATH 120', grade_only: true, letter_grade: 'A', is_active: false })];
  m.classes = q => all.filter(c => (q.get('is_active') ? String(c.is_active) === q.get('is_active').replace('eq.', '') : true) && (q.get('grade_only') ? String(c.grade_only) === q.get('grade_only').replace('eq.', '') : true) && (q.get('id') ? q.get('id') === 'eq.' + c.id : true));
  m.grades = [{ id: 'g1', class_id: 'c1', category: 'Exams', item_name: 'Exam 1', score: 90, max_score: 100 }, { id: 'g2', class_id: 'c1', category: 'Homework', item_name: 'HW 1', score: 8, max_score: 10 }];
  m.exam_folders = q => [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-11-20', created_at: '2026-10-01' }, { id: 'f2', class_id: 'c1', name: 'Exam 2', exam_date: null, created_at: '2026-10-02' }].filter(f => !q.get('id') || q.get('id') === 'eq.' + f.id);
  m.resources = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: 'https://rbvklkigxwithxsdvjpq.supabase.co/storage/v1/object/public/resources/x/f1/1_Lecture_1.pdf', folder_id: 'f1', transcript: null, created_at: '2026-10-01T00:00:00Z' }, { id: 'r2', file_name: 'Respiration video', file_type: 'youtube', storage_url: 'https://youtube.com/watch?v=abc', folder_id: 'f1', transcript: 'words', created_at: '2026-10-02T00:00:00Z' }];
  m.tasks = [
    { id: 't1', student_id: s, title: 'HW 3', due_date: '2026-11-11', due_time: '14:00', task_type: 'assignment', completed: false, class_name: 'BIO 115', resource_id: null, resource_type: null, folder_id: null },
    { id: 't2', student_id: s, title: 'Review: Cell Deck flashcards', due_date: '2026-11-12', due_time: null, task_type: 'review', completed: false, class_name: null, resource_id: 'd1', resource_type: 'flashcard_deck', folder_id: null },
    { id: 't3', student_id: s, title: 'Old quiz', due_date: '2026-11-05', due_time: null, task_type: 'quiz', completed: false, class_name: 'CHEM 115', resource_id: null, resource_type: null, folder_id: null },
    { id: 't4', student_id: s, title: 'Done thing', due_date: '2026-11-09', due_time: null, task_type: 'reading', completed: true, class_name: null, resource_id: null, resource_type: null, folder_id: null },
    { id: 't5', student_id: s, title: 'Exam 1 — BIO 115', due_date: '2026-11-20', due_time: null, task_type: 'exam', completed: false, class_name: 'BIO 115', resource_id: null, resource_type: null, folder_id: 'f1' }];
  m.flashcard_decks = q => [{ id: 'd1', student_id: s, title: 'Cell Deck', card_count: 3, folder_id: 'f1', created_at: '2026-10-01T00:00:00Z' }].filter(d => !q.get('id') || q.get('id') === 'eq.' + d.id);
  m.flashcard_cards = [0, 1, 2].map(i => ({ id: 'k' + i, deck_id: 'd1', front: `What is concept ${i}?`, back: i === 1 ? 'It is $x^2$ and [SMILES: CCO | Ethanol]' : `Answer ${i}`, position: i, front_image_url: null, back_image_url: null, front_blocks: null, back_blocks: null }));
  m.flashcard_items = [{ id: 'i0', card_id: 'k0', deck_id: 'd1', student_id: s, times_seen: 4, times_correct: 1, times_missed: 3, interval_days: 1, next_review: '2020-01-01T00:00:00Z', is_retired: false, is_flagged: false }];
  const exam = (o) => ({ student_id: s, questions: Q, responses: {}, score: null, status: 'in_progress', created_at: '2026-10-01T10:00:00Z', completed_at: null, timer_seconds: null, folder_id: 'f1', ...o });
  const exams = [exam({ id: 'e1', title: 'Cell Exam' }), exam({ id: 'e2', title: 'Finished Exam', status: 'completed', score: 50, responses: { 0: 'B', 1: 'False', 2: 'water' }, completed_at: '2026-10-02T10:00:00Z' })];
  m.practice_exams = q => exams.filter(e => !q.get('id') || q.get('id') === 'eq.' + e.id);
  m.practice_exam_items = [{ question_text: 'DNA is found in the nucleus.', question_type: 'tf', is_correct: false }];
  m.study_guides = q => [{ id: 'g1', student_id: s, class_id: 'c1', folder_id: 'f1', title: 'Exam 1 Guide', content: GUIDE, source_filename: 'Lecture 1', created_at: '2026-10-01T00:00:00Z', slide_image_paths: [] }].filter(g => !q.get('id') || q.get('id') === 'eq.' + g.id);
}

const SCREENS = [
  ['home', '', null], ['calendar', '/calendar', null], ['classes', '/classes', null], ['binder', '/classes/c1', null], ['folder', '/classes/c1/f1', null],
  ['profile', '/profile', null], ['add-class', '/add-class', null], ['flashcards', '/flashcards', null], ['exams', '/practice-exam', null], ['study', '/study', null],
  ['guide-view', '/study?guideId=g1', null],
  ['deck-detail', '/flashcards', async p => { await h.clickPointer(p, 'Cell Deck'); }],
  ['deck-study', '/flashcards?deckId=d1', null],
  ['deck-study-flipped', '/flashcards?deckId=d1', async p => { await p.keyboard.press('ArrowUp'); await h.sleep(300); await p.keyboard.press('ArrowLeft'); await h.sleep(1500); }],
  ['flash-setup', '/flashcards', async p => { await h.clickButton(p, /^\+? ?(new|generate)/); await h.sleep(500); await h.clickPointer(p, 'BIO 115'); await h.sleep(250); await h.clickPointer(p, 'Exam 1'); }],
  ['exam-taking', '/practice-exam', async p => { await h.clickButton(p, /continue/); }],
  ['exam-results', '/practice-exam', async p => { await h.clickButton(p, /view results/); await h.sleep(500); await h.clickButton(p, /show explanation/); }],
  ['exam-setup', '/practice-exam', async p => { await h.clickButton(p, /new exam/); }],
  ['study-setup', '/study', async p => { await h.clickButton(p, /new guide/); await h.sleep(500); await h.clickPointer(p, 'BIO 115'); }],
  ['gpa-modal', '/classes', async p => { await h.clickText(p, '+ GPA Class', { tag: 'button' }); }],
  ['grade-modal', '/classes/c1', async p => { await h.clickText(p, '+ Add Grade', { tag: 'button' }); }],
  ['folder-upload', '/classes/c1/f1', async p => { await h.clickText(p, '+ Upload', { tag: 'button' }); }],
  ['quick-add', '/profile', async p => { await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.querySelector('svg line[x1="10"]'))?.click()); }],
  ['home-upload', '', async p => { await h.clickPointer(p, 'Upload'); }],
  ['calendar-add', '/calendar', async p => { await h.clickText(p, '+ Add', { tag: 'button' }); }],
];

async function capture(dir) {
  fs.mkdirSync(dir, { recursive: true });
  await h.launch();
  for (const s of h.STUDENTS) for (const [name, route, act] of SCREENS) {
    const page = await h.newPage({ width: 430, height: 1400 });
    await h.fakeClock(page, '2026-11-11T10:00:00-05:00');
    await page.evaluateOnNewDocument(() => { Math.random = () => 0.42; });
    mocks(page, s);
    await h.go(page, `/${s}${route}`, 1600);
    if (act) { await act(page); await h.sleep(1200); }
    await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await h.sleep(200);
    const txt = await h.text(page);
    fs.writeFileSync(path.join(dir, `${s}--${name}.txt`), txt + '\n---ERRORS---\n' + page.t.errors.join('\n'));
    await page.screenshot({ path: path.join(dir, `${s}--${name}.png`), fullPage: true });
    await page.close();
    process.stdout.write('.');
  }
  await h.close(); console.log('\ncaptured', h.STUDENTS.length * SCREENS.length, 'screens to', dir);
}

async function compare(a, b) {
  const sharp = require('sharp'); let same = 0, diff = 0;
  for (const f of fs.readdirSync(a).filter(f => f.endsWith('.png')).sort()) {
    const key = f.replace('.png', '');
    if (!fs.existsSync(path.join(b, f))) { console.log('MISSING in B:', key); diff++; continue; }
    const ta = fs.readFileSync(path.join(a, key + '.txt'), 'utf8'), tb = fs.readFileSync(path.join(b, key + '.txt'), 'utf8');
    const A = await sharp(path.join(a, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const B = await sharp(path.join(b, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let px = -1, maxd = 0;
    if (A.info.width === B.info.width && A.info.height === B.info.height) {
      px = 0;
      for (let i = 0; i < A.data.length; i += 4) { const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2])); if (d > 6) px++; if (d > maxd) maxd = d; }
    }
    const pct = px < 0 ? 100 : (100 * px / (A.info.width * A.info.height));
    const textSame = ta === tb;
    if (textSame && px >= 0 && pct < 0.02) { same++; continue; }
    diff++;
    let note = '';
    if (!textSame) { const la = ta.split('\n'), lb = tb.split('\n'); note = ` | text: A-only [${la.filter(x => !lb.includes(x)).slice(0, 4).join(' / ').slice(0, 160)}] B-only [${lb.filter(x => !la.includes(x)).slice(0, 4).join(' / ').slice(0, 160)}]`; }
    console.log(`DIFF ${key}: ${px < 0 ? `size ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}` : `${pct.toFixed(3)}% pixels (max channel delta ${maxd})`}${note}`);
  }
  console.log(`visual compare: ${same} identical, ${diff} different`);
  process.exit(0);
}

const [cmd, a, b] = process.argv.slice(2);
(cmd === 'capture' ? capture(a) : compare(a, b)).catch(e => { console.error(e.stack); process.exit(1); });
