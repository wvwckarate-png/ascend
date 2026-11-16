// Every page renders for every student with no runtime errors and no failed requests.
// Against the live site (BASE=https://…) nobody is signed in, so it checks the front door instead: pages send visitors to sign in.
const h = require('./lib');
const LIVE = !/localhost|127\.0\.0\.1/.test(h.BASE);
h.run('smoke', async () => {
  const routes = ['', '/add-class', '/calendar', '/classes', '/flashcards', '/practice-exam', '/profile', '/study', '/library'];
  for (const s of h.STUDENTS) for (const r of routes) {
    const page = await h.newPage(); await h.go(page, `/${s}${r}`, LIVE ? 2500 : 1500);
    const t = await h.text(page);
    if (LIVE) h.check(`${s}${r || '/'} sends a visitor to sign in, showing nothing first`, page.url() === h.BASE + '/login' && /Sign in/.test(t) && page.t.errors.length === 0, `${page.url()} ${page.t.errors.join('|')}`);
    else h.check(`${s}${r || '/'} renders cleanly`, t.length > 80 && page.t.errors.length === 0 && page.t.bad.length === 0, page.t.errors.concat(page.t.bad).join(' | '));
    await page.close();
  }
  for (const p of ['/', '/parent', '/login']) { const page = await h.newPage(); await h.go(page, p, LIVE ? 2500 : 1500); const t = await h.text(page); h.check(`${p} renders`, t.length > 40 && page.t.errors.length === 0 && (!LIVE || (!/Matthew|Michael|Brynne/.test(t) && /Sign in/.test(t))), page.t.errors.join('|') + t.slice(0, 80)); await page.close(); }
  const page = await h.newPage(); await h.go(page, '/not-a-student/classes'); h.check('unknown student shows the not-found page', /not found/i.test(await h.text(page)), (await h.text(page)).slice(0, 80)); await page.close();
});
