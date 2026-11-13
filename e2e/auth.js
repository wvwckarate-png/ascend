// Login (PIN) + parent dashboard. Needs the fake backend and a build pointed at it — see e2e/README.md.
const h = require('./lib');
h.run('auth', async () => {
  const pins = { matthew: '4321', michael: null, brynne: null };
  for (const s of ['michael', 'brynne', 'matthew']) {
    const page = await h.newPage(); await h.fakeClock(page, '2026-11-11T10:00:00-05:00'); await h.go(page, '/');
    const t0 = await h.text(page);
    h.check('home lists all three with automatic grades', /Senior · 12th Grade/.test(t0) && /Freshman · 9th Grade/.test(t0) && /6th Grade/.test(t0), t0.slice(0, 200));
    await h.clickText(page, h.cap(s), { tag: 'div' }); await h.sleep(1800);
    if (!pins[s]) h.check(`${s} (no PIN) goes straight in`, page.url().endsWith('/' + s), page.url());
    else {
      h.check('PIN keypad opens', /Enter your PIN/.test(await h.text(page)));
      for (const d of '0000') await page.keyboard.press(d); await h.sleep(1500);
      h.check('wrong PIN rejected', /Wrong PIN/.test(await h.text(page)) && !page.url().endsWith('/' + s));
      for (const d of pins[s]) await page.keyboard.press(d); await h.sleep(2500);
      h.check('correct PIN logs in', page.url().endsWith('/' + s), page.url());
      h.check('lands on a working dashboard', /Hey, Matthew/.test(await h.text(page)));
    }
    if (pins[s] === null) {
      const acc = await page.evaluate(() => document.querySelector('[style*="--accent"]')?.style.getPropertyValue('--accent').trim());
      const html = await (await fetch(h.BASE + '/' + s)).text(); const served = (html.match(/--accent:\s*([^;"]+)/) || [])[1];
      if (s === 'michael') h.check('saved theme (green) is in the page the server sends — no colour flash', served === '#5A977B' && acc === '#5A977B', `${served} / ${acc}`);
      else h.check(`${s} with no saved theme gets the default colours`, !!served && served === acc, `${served} / ${acc}`);
    }
    h.check(`${s} login: no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();
  }
  const page = await h.newPage(); await h.go(page, '/parent');
  await h.setInput(page, 'input[type=password]', 'wrong'); await page.keyboard.press('Enter'); await h.sleep(900);
  h.check('parent: wrong password rejected', /incorrect/i.test(await h.text(page)));
  await h.setInput(page, 'input[type=password]', 'testpw123'); await page.keyboard.press('Enter'); await h.sleep(2800);
  const t = await h.text(page);
  h.check('parent: roster, PIN status, version', /PIN active/.test(t) && (t.match(/No PIN set/g) || []).length === 2 && /Ascend v\d+\.\d+\.\d+/.test(t) && !/4321/.test(t));
  await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === 'Set PIN')[0]?.click()); await h.sleep(300);
  await page.type('input[inputmode="numeric"]', '1234'); await h.clickText(page, 'Save PIN', { tag: 'button' }); await h.sleep(1200);
  const st = await (await fetch(h.BASE + '/api/pin-status', { headers: { origin: h.BASE } })).json();
  h.check('parent: PIN saved server-side', Object.entries(st).filter(([k, v]) => v && k !== 'matthew').length === 1, JSON.stringify(st));
  await page.evaluate(() => { const rm = [...document.querySelectorAll('button')].filter(b => /remove/i.test(b.innerText)); rm[rm.length - 1]?.click(); }); await h.sleep(1000);
  const st2 = await (await fetch(h.BASE + '/api/pin-status', { headers: { origin: h.BASE } })).json();
  h.check('parent: Remove clears it', !st2.michael && !st2.brynne);
  h.check('parent: no runtime errors', page.t.errors.length === 0, page.t.errors.join('|'));
});
