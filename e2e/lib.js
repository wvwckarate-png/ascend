// Browser test harness. Headless Chrome against a local build; every Supabase write and paid API call is intercepted,
// so the suites can never change real data. Run a build first:  npx next build && npx next start -p 3112
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3112';
const SB = 'rbvklkigxwithxsdvjpq.supabase.co';
const REAL_API = [];
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
// Pretend sign-in for local runs: a session that never expires, and /api/account answering for it (default: a parent,
// who may open every student's pages). page.t.account = null means signed out; set it to a student to test the door.
const FAKE_SESSION = { access_token: 'e2e-token', refresh_token: 'e2e-refresh', token_type: 'bearer', expires_in: 315360000, expires_at: Math.floor(Date.now() / 1000) + 315360000, user: { id: '00000000-0000-4000-8000-000000000e2e', aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } };
const STUDENTS = (process.env.ONLY || 'matthew,michael,brynne').split(',');

let browser;
setTimeout(() => { console.error('HARD TIMEOUT'); process.exit(2); }, 1500000).unref();
async function launch() {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  return browser;
}
async function close() { if (browser) await browser.close(); }

async function newPage({ width = 430, height = 900, device, signedOut = false } = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
  if (device) await page.emulate(puppeteer.KnownDevices[device]); else await page.setViewport({ width, height });
  const t = { writes: [], errors: [], bad: [], apiCalls: [], dialogs: [], mocks: {}, apiMocks: {}, failWrites: {}, restAuth: [], authCalls: [], failAuth: false, account: signedOut ? null : { email: 'e2e@example.com', role: 'parent', studentId: null, needsPassword: false, secured: false } };
  // Once per tab: start signed in (or, for signedOut, make sure an earlier tab's sign-in is gone). Later sign-outs inside the tab stick.
  if (LOCAL) await page.evaluateOnNewDocument(sess => { try { if (!sessionStorage.getItem('e2e-seeded')) { sessionStorage.setItem('e2e-seeded', '1'); if (sess) localStorage.setItem('ascend-auth', sess); else localStorage.removeItem('ascend-auth'); } } catch {} }, signedOut ? '' : JSON.stringify(FAKE_SESSION));
  page.t = t;
  page.on('pageerror', e => t.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) t.errors.push('console.error: ' + m.text().slice(0, 300)); });
  page.on('dialog', async d => { t.dialogs.push(d.message()); await d.accept(); });
  page.on('response', r => {
    const u = r.url();
    if (r.status() >= 400 && r.request().method() === 'GET' && (u.includes(SB) || u.startsWith(BASE))) t.bad.push(`${r.status()} ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 110)}`);
  });
  await page.setRequestInterception(true);
  const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  page.on('request', req => {
    const u = req.url(); const m = req.method();
    if (u.includes(SB) && m === 'OPTIONS') return req.continue();
    if (u.includes(SB) && u.includes('/rest/v1/') && m !== 'GET' && m !== 'HEAD') {
      let body = null; try { body = JSON.parse(req.postData() || 'null'); } catch {}
      const table = u.split('/rest/v1/')[1].split('?')[0];
      t.writes.push({ method: m, table, query: u.split('?')[1] || '', body });
      if (t.failWrites[table]) return req.respond({ status: 401, headers: CORS, body: JSON.stringify({ code: '42501', message: `permission denied for table ${table}` }) });
      const payload = Array.isArray(body) ? body.map((b, i) => ({ id: 'mock-' + i, ...b })) : body ? { id: 'mock-id', ...body } : {};
      const wantsObj = (req.headers()['accept'] || '').includes('pgrst.object');
      const noBody = m === 'DELETE' || (m === 'PATCH' && !(req.headers()['prefer'] || '').includes('return=representation'));
      const out = noBody ? null : (wantsObj ? (Array.isArray(payload) ? payload[0] : payload) : (Array.isArray(payload) ? payload : [payload]));
      return req.respond({ status: out === null ? 204 : (m === 'POST' ? 201 : 200), headers: CORS, body: out === null ? '' : JSON.stringify(out) });
    }
    if (LOCAL && u.includes(SB) && u.includes('/auth/v1/user') && m === 'PUT') { let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch {} t.authCalls.push(b); return t.failAuth ? req.respond({ status: 422, headers: CORS, body: JSON.stringify({ code: 'same_password', msg: 'New password should be different from the old password.' }) }) : req.respond({ status: 200, headers: CORS, body: JSON.stringify(FAKE_SESSION.user) }); }
    if (u.includes(SB) && u.includes('/rest/v1/')) t.restAuth.push(req.headers()['authorization'] || '');
    if (LOCAL && u.startsWith(BASE + '/api/account') && m === 'GET') {
      if (t.account === 'down') return req.respond({ status: 500, headers: CORS, body: '{}' });
      return req.respond({ status: t.account ? 200 : 401, headers: CORS, body: JSON.stringify({ account: t.account }) });
    }
    if (u.includes(SB) && u.includes('/rest/v1/') && m === 'GET') {
      const table = u.split('/rest/v1/')[1].split('?')[0];
      // Local runs never read the real database: a table a test didn't describe is simply empty.
      if (t.mocks[table] === undefined && LOCAL) t.mocks[table] = table === 'students' ? (q => { const id = (q.get('id') || '').replace('eq.', ''); return (id ? [id] : ['matthew', 'michael', 'brynne']).map(x => ({ id: x, name: x[0].toUpperCase() + x.slice(1), grade: '', focus: 'Exercise Physiology', track: 'Pre-Med', grad_year: { matthew: 2027, michael: 2030, brynne: 2033 }[x] || 2030, generation_profile: '' })); }) : [];
      if (t.mocks[table] !== undefined) {
        const rows = typeof t.mocks[table] === 'function' ? t.mocks[table](new URL(u).searchParams, u) : t.mocks[table];
        const wantsObj = (req.headers()['accept'] || '').includes('pgrst.object');
        return req.respond({ status: wantsObj && rows.length === 0 ? 406 : 200, headers: { ...CORS, 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }, body: JSON.stringify(wantsObj ? (rows[0] ?? {}) : rows) });
      }
    }
    if (u.includes(SB) && u.includes('/storage/v1/') && m !== 'GET') {
      t.writes.push({ method: m, table: 'storage', query: u.split('/storage/v1/')[1].slice(0, 80), body: null });
      return req.respond({ status: 200, headers: CORS, body: JSON.stringify({ Key: 'mock', Id: 'mock' }) });
    }
    if (u.startsWith(BASE + '/api/') && m !== 'GET') {
      const path = u.replace(BASE, '');
      t.apiCalls.push({ method: m, path, bodyText: req.postData() || '' });
      const passThrough = REAL_API.some(p => path.startsWith(p)) || (process.env.REAL_API && !t.apiMocks[path]);
      if (!passThrough) {
        const mock = t.apiMocks[path];
        const handler = typeof mock === 'function' ? mock({ method: m, path, bodyText: req.postData() || '', n: t.apiCalls.filter(c => c.path === path).length }) : mock;
        const send = () => (handler && handler.raw !== undefined)
          ? req.respond({ status: handler.status || 200, headers: { 'content-type': handler.contentType || 'text/plain' }, body: handler.raw })
          : req.respond({ status: handler?.status || 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(handler ? handler.json : { studyGuide: 'MOCK', transcript: 'MOCK', success: true }) });
        return handler && handler.delay ? setTimeout(send, handler.delay) : send();
      }
    }
    req.continue();
  });
  return page;
}

async function go(page, path, wait = 1500) { await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 30000 }); await sleep(wait); }
const text = page => page.evaluate(() => document.body.innerText);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function clickText(page, txt, { tag = '*', exact = false } = {}) {
  return page.evaluate((txt, tag, exact) => {
    const want = txt.toLowerCase();
    const els = [...document.querySelectorAll(tag)].filter(e => { const t = (e.innerText || '').trim().toLowerCase(); return exact ? t === want : t.includes(want); });
    els.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
    if (!els.length) return false; els[0].click(); return true;
  }, txt, tag, exact);
}
async function clickPointer(page, txt) {
  const pt = await page.evaluate(txt => {
    const want = txt.toLowerCase();
    const els = [...document.querySelectorAll('body *')].filter(e => (e.innerText || '').trim().toLowerCase().includes(want) && e.children.length <= 3);
    els.sort((a, b) => a.innerText.length - b.innerText.length);
    let el = els[0]; if (!el) return null;
    let cur = el; while (cur && getComputedStyle(cur).cursor !== 'pointer') cur = cur.parentElement;
    cur = cur || el; cur.scrollIntoView({ block: 'center' });
    const r = cur.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2 };
  }, txt);
  if (!pt) return false; await page.mouse.click(pt.x, pt.y); return true;
}
async function clickInModal(page, txt, exact = true) {
  return page.evaluate((txt, exact) => {
    const modals = [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position === 'fixed' && d.innerText && d.querySelector('button'));
    const modal = modals.find(m => m.style.zIndex === '200') || modals[modals.length - 1]; if (!modal) return false;
    const b = [...modal.querySelectorAll('button')].find(b => { const t = b.innerText.trim().toLowerCase().replace(/^✓ /, ''); return exact ? t === txt.toLowerCase() : t.includes(txt.toLowerCase()); });
    if (!b) return false; b.click(); return true;
  }, txt, exact);
}
const clickButton = (page, re) => page.evaluate(src => { const b = [...document.querySelectorAll('button')].find(b => new RegExp(src, 'i').test(b.innerText)); b?.click(); return !!b; }, re.source);
const setModalInput = (page, n, v) => page.evaluate((n, v) => {
  const modals = [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position === 'fixed' && d.querySelector('input,textarea,select'));
  const modal = modals.find(m => m.style.zIndex === '200') || modals[modals.length - 1];
  const i = modal.querySelectorAll('input')[n];
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true }));
}, n, v);
const setInput = (page, sel, v) => page.evaluate((sel, v) => {
  const i = document.querySelector(sel);
  Object.getOwnPropertyDescriptor(i.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(i, v);
  i.dispatchEvent(new Event('input', { bubbles: true }));
}, sel, v);
async function fakeClock(page, iso) {
  await page.emulateTimezone('America/New_York');
  await page.evaluateOnNewDocument(now => { const R = Date, off = now - R.now(); class F extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } } window.Date = F; }, Date.parse(iso));
}

let pass = 0, fail = 0; const failures = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; if (process.env.VERBOSE) console.log('  ✓', name); } else { fail++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗', name, extra ? '— ' + String(extra).slice(0, 300) : ''); }
}
const summary = () => ({ pass, fail });
const done = async (name) => { await close(); console.log(`${name}: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); };
const sse = evs => evs.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
const field = (body, name) => (body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`)) || [])[1] || '';
const cap = s => s[0].toUpperCase() + s.slice(1);
const run = (name, fn) => (async () => { await launch(); await fn(); await done(name); })().catch(async e => { console.error(e.stack); await close(); process.exit(1); });

module.exports = { browser: () => browser, BASE, SB, STUDENTS, launch, close, newPage, go, text, sleep, clickText, clickPointer, clickInModal, clickButton, setModalInput, setInput, fakeClock, check, summary, done, run, sse, field, cap };
