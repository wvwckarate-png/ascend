// The front door: who may open what. Sign-in itself is pretended (see lib.js); the server routes are called for real
// with no sign-in to prove they refuse.
const h = require('./lib');
const student = id => ({ email: id + '@example.com', role: 'student', studentId: id, needsPassword: false, secured: false });
h.run('auth', async () => {
  // ── nobody signed in ──
  let page = await h.newPage({ signedOut: true }); await h.go(page, '/', 1500); let t = await h.text(page);
  h.check('visitor: home shows only the name and a Sign in button — no students, no PIN pad', /Ascend/.test(t) && /Sign in/.test(t) && !/Matthew|Michael|Brynne|Parent Dashboard|PIN/.test(t), t.slice(0, 200));
  for (const path of ['/matthew', '/michael/classes', '/brynne/library', '/matthew/flashcards', '/parent']) {
    const seen = []; const p = await h.newPage({ signedOut: true }); p.on('request', r => { if (r.url().includes('/rest/v1/')) seen.push(r.url()); });
    await h.go(p, path, 1800); const body = await h.text(p);
    h.check(`visitor: ${path} goes to sign in, with no study data requested or shown`, p.url() === h.BASE + '/login' && seen.length === 0 && !/Hey,|My Classes|Welcome, Gregory/.test(body), `${p.url()} ${seen.length}`);
    await p.close();
  }
  await page.close();

  // ── a student ──
  page = await h.newPage(); page.t.account = student('matthew');
  page.t.mocks.students = [{ id: 'matthew', name: 'Matthew', grade: '', focus: 'Exercise Physiology' }];
  await h.go(page, '/', 2000);
  h.check('student: home goes straight to their own pages', page.url() === h.BASE + '/matthew' && /Hey, Matthew/.test(await h.text(page)), page.url());
  for (const path of ['/michael', '/brynne/classes', '/michael/library', '/parent']) {
    await h.go(page, path, 2000);
    h.check(`student: ${path} sends Matthew back to his own pages`, page.url() === h.BASE + '/matthew' && !/Hey, Michael|Hey, Brynne|Welcome, Gregory/.test(await h.text(page)), page.url());
  }
  await h.go(page, '/matthew/profile', 1500); t = await h.text(page);
  h.check('student: profile shows who is signed in and a Sign out button; no PIN row', /Signed in/.test(t) && /matthew@example\.com/.test(t) && /Sign out/.test(t) && !/PIN/.test(t), t.slice(-300));
  await h.clickText(page, 'Sign out', { tag: 'button', exact: true }); await h.sleep(1500);
  h.check('student: Sign out clears the device and lands on sign in', page.url() === h.BASE + '/login' && await page.evaluate(() => !localStorage.getItem('ascend-auth')), page.url());
  page.t.account = null; await h.go(page, '/matthew', 1500);
  h.check('student: after signing out their pages are closed', page.url() === h.BASE + '/login', page.url());
  await page.close();

  // ── a parent ──
  page = await h.newPage({ width: 900, height: 900 }); await h.go(page, '/', 1800); t = await h.text(page);
  h.check('parent: home offers all three students, the dashboard and Sign out', /Whose pages/i.test(t) && /Matthew/.test(t) && /Michael/.test(t) && /Brynne/.test(t) && /Parent Dashboard/.test(t) && /Sign out/.test(t), t.slice(0, 200));
  await h.clickText(page, 'Michael', { tag: 'div' }); await h.sleep(2000);
  h.check('parent: can open any student\u2019s pages', page.url() === h.BASE + '/michael' && /Hey, Michael|Dashboard/.test(await h.text(page)), page.url());
  page.t.apiMocks['/api/admin/accounts'] = { json: { accounts: [] } };
  await h.go(page, '/parent', 2500); t = await h.text(page);
  h.check('parent: dashboard opens with no password box and no PIN section', /Welcome, Gregory/.test(t) && /People & sign-ins/i.test(t) && !/PIN|Enter your password/.test(t) && !(await page.$('input[type=password]')), t.slice(0, 200));
  // what a parent can see at a glance about each child
  await h.fakeClock(page, '2026-11-16T10:00:00-05:00');
  page.t.apiMocks['/api/study-days'] = ({ bodyText }) => ({ json: { days: JSON.parse(bodyText).student === 'matthew' ? [{ day: '2026-11-14', planned: 3, done: 2 }, { day: '2026-11-15', planned: 2, done: 2 }, { day: '2026-11-16', planned: 4, done: 1 }] : [] } });
  page.t.mocks.classes = q => (q.get('student_id') === 'eq.matthew' ? [{ id: 'c1', student_id: 'matthew', name: 'BIO 115', is_active: true, grading_schema: { Exams: 50, Homework: 20, Final: 30 } }] : []);
  page.t.mocks.exam_folders = [{ name: 'Exam 2', exam_date: '2026-11-19', class_id: 'c1' }, { name: 'Final', exam_date: '2026-12-20', class_id: 'c1' }];
  page.t.mocks.grades = q => (q.get('student_id') === 'eq.matthew' ? [{ class_id: 'c1', category: 'Exams', score: 90, max_score: 100 }, { class_id: 'c1', category: 'Homework', score: 19, max_score: 20 }] : []);
  page.t.mocks.tasks = q => (q.get('student_id') === 'eq.matthew' ? [{ completed: false, due_date: '2026-11-15' }, { completed: true, due_date: '2026-11-10' }, { completed: false, due_date: '2026-12-01' }] : []);
  await h.go(page, '/parent', 3000);
  const eff = id => page.$eval(`[data-effort="${id}"]`, e => e.innerText.replace(/\n+/g, ' | ')).catch(() => '');
  const m = await eff('matthew');
  h.check('parent: sees a child\u2019s streak, today\u2019s progress and overdue work', /3-day streak/.test(m) && /Today: 1 of 4 done/.test(m) && /1 task due or overdue/.test(m), m);
  h.check('parent: sees exams in the next three weeks with a countdown, not far-off ones', /Exam 2 · BIO 115 \| in 3 days/.test(m) && !/Final · BIO/.test(m), m);
  h.check('parent: sees each class against an A', /BIO 115 · 91\.4% now \| needs 96\.7% on the rest/.test(m), m);
  const mi = await eff('michael');
  h.check('parent: a child with no activity reads plainly', /No streak yet/.test(mi) && /Hasn.t opened Ascend today/.test(mi) && !/Coming up|Grades against/.test(mi), mi);
  h.check('parent: no runtime errors', page.t.errors.length === 0, page.t.errors.join('|'));
  await page.close();

  // ── edge cases ──
  page = await h.newPage(); page.t.account = { ...student('brynne'), needsPassword: true }; await h.go(page, '/brynne', 2500);
  h.check('invited but no password yet: sent to choose one before anything opens', page.url() === h.BASE + '/welcome', page.url());
  await page.close();
  page = await h.newPage(); page.t.account = 'down'; await h.go(page, '/matthew', 1800); t = await h.text(page);
  h.check('server unreachable: says so with a retry, and does not sign the person out', /Can.t reach Ascend right now/.test(t) && /Try again/.test(t) && page.url() === h.BASE + '/matthew' && await page.evaluate(() => !!localStorage.getItem('ascend-auth')), t);
  page.t.account = student('matthew'); page.t.mocks.students = [{ id: 'matthew', name: 'Matthew', grade: '', focus: '' }];
  await h.clickText(page, 'Try again', { tag: 'button' }); await h.sleep(2000);
  h.check('…and Try again opens the page once it is back', /Hey, Matthew/.test(await h.text(page)));
  await page.close();

  // ── how data is requested ──
  page = await h.newPage(); await h.go(page, '/matthew', 1800);
  h.check('before the database rules exist, data requests go out the old way', page.t.restAuth.length > 0 && page.t.restAuth.every(a => a && a !== 'Bearer e2e-token'), page.t.restAuth.slice(0, 2).join(' ').slice(0, 60));
  await page.close();
  page = await h.newPage(); page.t.account = { ...student('matthew'), secured: true }; await h.go(page, '/matthew', 1800);
  h.check('once they exist, every data request is made as the signed-in person', page.t.restAuth.length > 0 && page.t.restAuth.every(a => a === 'Bearer e2e-token'), page.t.restAuth.slice(0, 3).join(' | ').slice(0, 120));
  const api = page.t.apiCalls.find(c => c.path === '/api/study-days');
  h.check('requests to Ascend\u2019s own server carry the sign-in too', !!api);
  await page.close();

  // ── the server refuses anyone who is not signed in (real calls, no sign-in) ──
  const post = (path, body, headers = {}) => fetch(h.BASE + path, { method: 'POST', headers: { origin: h.BASE, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(r => r.status);
  for (const path of ['/api/generate-study-guide', '/api/check-resource', '/api/transcribe-audio', '/api/extract-image-text', '/api/extract-pptx-text', '/api/fetch-youtube-transcript', '/api/parse-syllabus', '/api/export-pdf'])
    h.check(`server: ${path} refuses a caller who is not signed in`, (await post(path, {})) === 401);
  h.check('server: daily progress refuses a caller who is not signed in', (await post('/api/study-days', { student: 'matthew' })) === 401);
  h.check('server: a made-up sign-in token is refused', (await post('/api/study-days', { student: 'matthew' }, { authorization: 'Bearer not-a-real-token' })) === 401 && (await post('/api/admin/accounts', { action: 'list' }, { authorization: 'Bearer not-a-real-token' })) === 401);
  h.check('server: the invitations list refuses everyone but a signed-in parent', (await post('/api/admin/accounts', { action: 'list' })) === 401 && (await post('/api/admin/accounts', { action: 'list', password: 'testpw123' })) === 401);
  for (const gone of ['/api/verify-pin', '/api/pin-status', '/api/parent-pins', '/api/verify-parent-password'])
    h.check(`server: ${gone} no longer exists`, (await post(gone, {})) === 404);
});
