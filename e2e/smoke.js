// Every page renders for every student with no runtime errors and no failed requests.
const h = require('./lib');
h.run('smoke', async () => {
  const routes = ['', '/add-class', '/calendar', '/classes', '/flashcards', '/practice-exam', '/profile', '/study'];
  for (const s of h.STUDENTS) for (const r of routes) {
    const page = await h.newPage(); await h.go(page, `/${s}${r}`);
    const t = await h.text(page);
    h.check(`${s}${r || '/'} renders cleanly`, t.length > 80 && page.t.errors.length === 0 && page.t.bad.length === 0, page.t.errors.concat(page.t.bad).join(' | '));
    await page.close();
  }
  for (const p of ['/', '/parent']) { const page = await h.newPage(); await h.go(page, p); h.check(`${p} renders`, (await h.text(page)).length > 40 && page.t.errors.length === 0, page.t.errors.join('|')); await page.close(); }
  const page = await h.newPage(); await h.go(page, '/not-a-student/classes'); h.check('unknown student shows the not-found page', /not found/i.test(await h.text(page)), (await h.text(page)).slice(0, 80)); await page.close();
});
