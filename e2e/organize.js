// Classes/GPA, add-class + syllabus, dashboard, calendar, quick-add, binder + grades, folder page, profile.
const path = require('path'); const fs = require('fs'); const os = require('os');
const h = require('./lib');
const PDF = path.join(os.tmpdir(), 'ascend-e2e-syllabus.pdf'); fs.writeFileSync(PDF, Buffer.alloc(4000, 7));
const mkClass = (s, o) => ({ student_id: s, semester: 'Fall 2025', professor: null, class_level: null, credit_hours: 3, is_bcpm: false, is_science: false, grade_only: false, letter_grade: null, grading_schema: null, is_active: true, ...o });
h.run('organize', async () => {
  for (const s of h.STUDENTS) {
    let page = await h.newPage();
    page.t.mocks.classes = q => q.get('is_active') === 'eq.true' ? [mkClass(s, { id: 'bio', name: 'BIO 115', is_bcpm: true, grading_schema: { Exams: 60, Homework: 40 } }), mkClass(s, { id: 'art', name: 'ART 101', grade_only: true, letter_grade: 'B+' }), mkClass(s, { id: 'ap', name: 'AP Chem', class_level: 'AP', is_bcpm: true })] : [mkClass(s, { id: 'old', name: 'MATH 120', grade_only: true, letter_grade: 'A', is_bcpm: true, is_active: false })];
    page.t.mocks.grades = [{ class_id: 'bio', category: 'Exams', score: 90, max_score: 100 }, { class_id: 'bio', category: 'Homework', score: 8, max_score: 10 }];
    await h.go(page, `/${s}/classes`); let t = (await h.text(page)).replace(/\n+/g, ' ');
    h.check(`${s}: Overall GPA 3.43, BCPM 3.50, AP not counted`, /overall gpa\s*3\.43/i.test(t) && /bcpm gpa\s*3\.50/i.test(t) && /AP — not counted/.test(t), t.match(/overall gpa\s*[\d.—]+/i)?.[0]);
    await h.clickText(page, '+ GPA Class', { tag: 'button' }); await h.sleep(400);
    await page.type('input[placeholder*="ART 101"]', 'HIST 200'); await h.clickInModal(page, 'A-'); await h.clickInModal(page, 'BCPM'); await h.clickInModal(page, 'Add to GPA'); await h.sleep(800);
    const w = page.t.writes.find(x => x.method === 'POST' && x.table === 'classes');
    h.check(`${s}: GPA class saved for the right student`, w && w.body.student_id === s && w.body.grade_only === true && w.body.letter_grade === 'A-' && w.body.is_bcpm === true);
    h.check(`${s}: classes page has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    page = await h.newPage();
    page.t.apiMocks['/api/parse-syllabus'] = { json: { parsed: { exams: [{ name: 'Exam 1', date: '2026-11-10', type: 'exam' }, { name: 'Final', date: null, type: 'final' }], assignments: [{ name: 'HW 1', date: '2026-10-20', type: 'homework' }], gradingSchema: { Exams: 70, Homework: 30 }, courseDescription: 'x' } } };
    await h.go(page, `/${s}/add-class`); await page.type('input', 'Bio With Syllabus');
    await page.select('select', (await page.$$eval('select:first-of-type option', o => o.map(x => x.value).filter(Boolean)))[0]);
    await (await page.$('input[type=file]')).uploadFile(PDF); await h.clickText(page, 'Import Syllabus', { tag: 'button' }); await h.sleep(1200);
    h.check(`${s}: syllabus preview lists parsed items`, /Exam 1/.test(await h.text(page)) && /HW 1/.test(await h.text(page)));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /^Add Class/.test(b.innerText.trim()))?.click()); await h.sleep(1800);
    const by = tb => page.t.writes.filter(x => x.table === tb && x.method === 'POST'); const tasks = by('tasks').flatMap(x => x.body);
    h.check(`${s}: syllabus import creates class, folders, linked exam task, assignment — all for this student`, by('classes')[0]?.body.student_id === s && by('classes')[0]?.body.grading_schema?.Exams === 70 && by('exam_folders')[0]?.body.length === 2 && tasks.some(x => x.task_type === 'exam' && x.folder_id && x.student_id === s) && tasks.some(x => x.title === 'HW 1' && x.student_id === s));
    h.check(`${s}: add-class returns to this student's dashboard`, page.url().endsWith('/' + s), page.url());
    await page.close();

    page = await h.newPage();
    let taskGets = 0; page.t.mocks.tasks = () => { taskGets++; return [{ id: 't1', student_id: s, title: 'A task', due_date: '2026-12-01', due_time: null, task_type: 'assignment', completed: false, class_name: null }]; };
    page.t.mocks.classes = q => { page.t.lastClassQuery = q.toString(); return [{ id: 'b1', name: 'BIO 115', student_id: s, is_active: true, grade_only: false, semester: 'F', professor: 'X' }]; };
    page.t.mocks.exam_folders = [];
    await h.go(page, `/${s}`);
    h.check(`${s}: dashboard greets the student and queries their own classes`, new RegExp('Hey, ' + h.cap(s)).test(await h.text(page)) || /BIO 115/.test(await h.text(page)), '') ;
    h.check(`${s}: dashboard class query is scoped to this student + hides GPA-only`, new RegExp('student_id=eq\\.' + s).test(page.t.lastClassQuery || '') && /grade_only=eq\.false/.test(page.t.lastClassQuery || ''), page.t.lastClassQuery);
    const gets0 = taskGets; let navs = 0; page.on('framenavigated', f => { if (f === page.mainFrame()) navs++; });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.querySelector('svg line[x1="10"]'))?.click()); await h.sleep(400);
    await page.type('input[placeholder]', 'Quick task'); await h.clickInModal(page, 'Add Task', false); await h.sleep(1800);
    h.check(`${s}: quick-add saves for this student and refreshes in place`, page.t.writes.some(x => x.table === 'tasks' && x.method === 'POST' && x.body.title === 'Quick task' && x.body.student_id === s) && navs === 0 && taskGets > gets0);
    await page.close();
    page = await h.newPage(); page.t.mocks.tasks = []; page.t.mocks.classes = [{ id: 'b1', name: 'BIO 115' }]; page.t.mocks.exam_folders = q => { page.t.lastFolderQuery = q.toString(); return []; };
    await h.go(page, `/${s}/calendar`);
    h.check(`${s}: calendar exams limited to this student's classes`, /class_id=in\./.test(page.t.lastFolderQuery || ''));
    await h.clickText(page, '+ Add', { tag: 'button' }); await h.sleep(500); await page.type('input[placeholder]', 'Cal task'); await h.clickInModal(page, 'Add Task', false); await h.sleep(900);
    h.check(`${s}: calendar add-task saves for this student`, page.t.writes.some(x => x.table === 'tasks' && x.method === 'POST' && x.body.title === 'Cal task' && x.body.student_id === s));
    await page.close();

    const mkB = async () => {
      const p = await h.newPage();
      p.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall 2026', professor: 'Dr X', notes: 'hello', grading_schema: { Exams: 60, Homework: 40 }, is_active: true, grade_only: false }];
      p.t.mocks.exam_folders = [{ id: 'f1', class_id: 'c1', name: 'Exam 1', exam_date: '2026-12-30', created_at: '2026-10-01' }, { id: 'f2', class_id: 'c1', name: 'Exam 2', exam_date: null, created_at: '2026-10-02' }];
      p.t.mocks.grades = [{ id: 'g1', class_id: 'c1', category: 'Exams', item_name: 'Exam 1', score: 90, max_score: 100 }];
      p.t.mocks.resources = [{ id: 'r1', file_name: 'Lecture 1', file_type: 'pdf', storage_url: 'https://rbvklkigxwithxsdvjpq.supabase.co/storage/v1/object/public/resources/' + s + '/f1/1_Lecture_1.pdf', created_at: '2026-10-01T00:00:00Z' }];
      for (const x of ['tasks', 'flashcard_decks', 'practice_exams', 'study_guides', 'flashcard_items', 'practice_exam_items']) p.t.mocks[x] = [];
      return p;
    };
    page = await mkB(); await h.go(page, `/${s}/classes/c1`); t = await h.text(page);
    h.check(`${s}: binder lists folders; weighted grade 90 (not 54)`, /Exam 1/.test(t) && /Exam 2/.test(t) && /90(\.0)?%/.test(t) && !/\b54(\.0)?%/.test(t));
    await h.clickText(page, '+ Add Grade', { tag: 'button' }); await h.sleep(300); await h.clickInModal(page, 'Homework');
    await h.setModalInput(page, 0, 'HW 1'); await h.setModalInput(page, 1, '8'); await h.setModalInput(page, 2, '10'); await h.clickInModal(page, 'Save Grade', false); await h.sleep(700);
    const gw = page.t.writes.find(x => x.table === 'grades' && x.method === 'POST');
    h.check(`${s}: grade saved for this student; weighted grade 86`, gw && gw.body.student_id === s && gw.body.score === 8 && /86(\.0)?%/.test(await h.text(page)));
    await page.close();
    page = await mkB(); page.t.failWrites.grades = true; await h.go(page, `/${s}/classes/c1`);
    await h.clickText(page, '+ Add Grade', { tag: 'button' }); await h.sleep(300); await h.clickInModal(page, 'Homework'); await h.setModalInput(page, 0, 'HW 2'); await h.setModalInput(page, 1, '5'); await h.clickInModal(page, 'Save Grade', false); await h.sleep(700);
    h.check(`${s}: failed grade save keeps the dialog open with an error`, /couldn't save that grade/i.test(await h.text(page)));
    await page.close();
    page = await mkB(); await h.go(page, `/${s}/classes/c1`); await h.clickText(page, '+ Add Folder', { tag: 'button' }); await h.sleep(300);
    await h.setModalInput(page, 0, 'Midterm'); await h.setModalInput(page, 1, '2026-12-20'); await h.clickInModal(page, 'Create Folder', false); await h.sleep(900);
    h.check(`${s}: folder + countdown reminders created for this student`, page.t.writes.some(x => x.table === 'exam_folders' && x.method === 'POST' && x.body.name === 'Midterm') && page.t.writes.filter(x => x.table === 'tasks' && x.method === 'POST').flatMap(x => x.body).every(x => x.student_id === s) && page.t.writes.some(x => x.table === 'tasks'));
    await page.close();
    page = await mkB(); await h.go(page, `/${s}/classes/c1/f1`);
    h.check(`${s}: folder page renders`, /Lecture 1/.test(await h.text(page)) && /Dec 30/.test(await h.text(page)));
    await page.evaluate(() => { const el = [...document.querySelectorAll('div,span')].find(e => /^Dec 30$/.test(e.innerText?.trim()) && e.children.length === 0); el?.parentElement?.querySelector('button')?.click(); }); await h.sleep(300);
    await h.setInput(page, 'input[type=date]', '2027-01-15'); page.t.writes.length = 0; await h.clickText(page, 'Save', { tag: 'button', exact: true }); await h.sleep(800);
    h.check(`${s}: date change updates folder + this student's linked task`, page.t.writes.some(x => x.table === 'exam_folders' && x.body.exam_date === '2027-01-15') && page.t.writes.some(x => x.table === 'tasks' && x.query.includes('folder_id=eq.f1') && x.query.includes('student_id=eq.' + s)));
    page.t.writes.length = 0;
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === '✕')?.click()); await h.sleep(900);
    h.check(`${s}: deleting a resource removes the row and the stored file`, page.t.writes.some(x => x.table === 'resources' && x.method === 'DELETE') && page.t.writes.some(x => x.table === 'storage' && x.method === 'DELETE'));
    await h.clickText(page, '+ Upload', { tag: 'button' }); await h.sleep(400);
    await page.evaluate(() => { const el = [...document.querySelectorAll('div')].find(d => d.innerText?.trim() === 'PDF' && d.children.length <= 2 && d.closest('[style*="z-index: 200"]')); let c = el; while (c && getComputedStyle(c).cursor !== 'pointer') c = c.parentElement; (c || el)?.click(); }); await h.sleep(300);
    await (await page.$('input[type=file]')).uploadFile(PDF); await h.sleep(300); page.t.writes.length = 0;
    await h.clickInModal(page, 'Upload & Save', false) || await h.clickInModal(page, 'Save', false); await h.sleep(2000);
    const st = page.t.writes.find(x => x.table === 'storage');
    h.check(`${s}: upload goes to this student's storage folder`, st && st.query.includes(`resources/${s}/f1/`), st?.query);
    h.check(`${s}: binder/folder have no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // profile: automatic grade + editing
    page = await h.newPage(); await h.fakeClock(page, '2026-11-11T10:00:00-05:00'); await h.go(page, `/${s}/profile`); t = await h.text(page);
    const want = { matthew: 'Senior · 12th Grade', michael: 'Freshman · 9th Grade', brynne: '6th Grade' }[s];
    if (want) h.check(`${s}: profile shows automatic grade (${want})`, t.includes(want), t.slice(0, 120));
    await page.evaluate(() => [...document.querySelectorAll('div')].find(d => /^Class of \d{4}$/.test(d.innerText?.trim()) && d.children.length === 0)?.click()); await h.sleep(300);
    await h.setInput(page, 'input', '2031'); page.t.writes.length = 0; await h.clickText(page, 'Save', { tag: 'button', exact: true }); await h.sleep(700);
    const pw = page.t.writes.find(x => x.table === 'students' && x.method === 'PATCH');
    h.check(`${s}: profile saves to this student's record`, pw && pw.body.grad_year === 2031 && pw.query.includes('id=eq.' + s), JSON.stringify(pw));
    h.check(`${s}: profile has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
  }
});
