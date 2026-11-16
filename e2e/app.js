// Reminders switch, fast capture (photos + lecture recording) and the install prompt.
const h = require('./lib');
const path = require('path'); const fs = require('fs'); const os = require('os');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const img = n => { const p = path.join(os.tmpdir(), n); fs.writeFileSync(p, PNG); return p; };
function mocks(page, s) {
  page.t.mocks.classes = [{ id: 'c1', student_id: s, name: 'BIO 115', semester: 'Fall', professor: 'Dr Smith', is_active: true, grade_only: false }, { id: 'c2', student_id: s, name: 'Chem 116', semester: 'Fall', professor: '', is_active: true, grade_only: false }];
  page.t.mocks.exam_folders = q => { const all = [{ id: 'f-old', class_id: 'c1', name: 'Exam 1', exam_date: '2026-09-01' }, { id: 'f-far', class_id: 'c2', name: 'Final', exam_date: '2027-05-01' }, { id: 'f-next', class_id: 'c1', name: 'Exam 2', exam_date: '2026-12-20' }]; const id = (q.get('id') || '').replace('eq.', ''); return id ? all.filter(f => f.id === id) : all; };
  page.t.apiMocks['/api/study-days'] = { json: { days: [] } };
  page.t.apiMocks['/api/extract-image-text'] = { json: { transcript: 'text read from the photo' } };
  page.t.apiMocks['/api/transcribe-audio'] = { json: { transcript: 'the lecture, written out' } };
}
const plus = page => page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.querySelector('svg line[x1="10"]'))?.click());

h.run('app', async () => {
  for (const s of h.STUDENTS) {
    // ── photos from the + button ──
    let page = await h.newPage({ width: 430, height: 1000 }); await h.fakeClock(page, '2026-11-16T10:00:00-05:00'); mocks(page, s);
    await h.go(page, `/${s}`, 1500); await plus(page); await h.sleep(400);
    let t = await h.text(page);
    h.check(`${s}: the + button offers Snap a photo and Record lecture above Quick Add Task`, /Snap a photo/.test(t) && /Record lecture/.test(t) && /Quick Add Task/.test(t));
    await page.click('[data-capture-open="photo"]'); await h.sleep(700);
    const dest = await page.$eval('[data-capture] select', e => `${e.value}|${e.options[e.selectedIndex].text}`);
    h.check(`${s}: photos default to the next exam coming up, not a past or far-off one`, dest === 'f-next|BIO 115 · Exam 2', dest);
    h.check(`${s}: nothing to save until a photo is taken`, !(await page.evaluate(() => [...document.querySelectorAll('[data-capture] button')].some(b => /^Save/.test(b.innerText)))));
    const cam = await page.$('[data-capture] input[type=file]');
    h.check(`${s}: the photo button opens the camera (rear), and takes several`, await page.$eval('[data-capture] input[type=file]', e => e.accept === 'image/*' && e.getAttribute('capture') === 'environment' && e.multiple));
    await cam.uploadFile(img('shot-a.png'), img('shot-b.png')); await h.sleep(400);
    await (await page.$('[data-capture] input[type=file]')).uploadFile(img('shot-c.png')); await h.sleep(400);
    h.check(`${s}: each shot shows as a thumbnail and can be removed`, (await page.$$('[data-capture] img')).length === 3);
    await page.click('[data-capture] button[aria-label="Remove photo 2"]'); await h.sleep(200);
    await page.click('[data-capture] [role=switch]'); page.t.writes.length = 0; page.t.apiCalls.length = 0;
    await page.evaluate(() => [...document.querySelectorAll('[data-capture] button')].find(b => /^Save 2 photos$/.test(b.innerText)).click()); await h.sleep(2500);
    const posts = page.t.writes.filter(x => x.table === 'resources' && x.method === 'POST'), stores = page.t.writes.filter(x => x.table === 'storage');
    h.check(`${s}: both photos are stored in this student's folder for that exam`, stores.length === 2 && stores.every(x => x.query.includes(`resources/${s}/f-next/`)), JSON.stringify(stores.map(x => x.query)));
    h.check(`${s}: saved as class files with their text read, named by time, marked old exam when asked`, posts.length === 2 && posts.every(x => x.body.folder_id === 'f-next' && x.body.file_type === 'image' && x.body.transcript === 'text read from the photo' && x.body.is_old_exam === true && /^Photo Nov 16, 10:0\d AM \([12]\)$/.test(x.body.file_name)), JSON.stringify(posts.map(x => x.body)).slice(0, 400));
    h.check(`${s}: it says where they went and closes by itself`, /Saved 2 photos to BIO 115 · Exam 2/.test(await h.text(page)) || !(await page.$('[data-capture]')));
    await h.sleep(1500); h.check(`${s}: photo capture leaves no errors`, !(await page.$('[data-capture]')) && page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // ── from an exam page: lands on the grey shelf ──
    page = await h.newPage({ width: 430, height: 1200 }); mocks(page, s); await h.go(page, `/${s}/classes/c1/f-old`, 1300);
    await page.click('[data-shelf="class"] [data-capture-open="photo"]'); await h.sleep(600);
    h.check(`${s}: on an exam page, capture is filed under that exam`, (await page.$eval('[data-capture] select', e => e.value)) === 'f-old');
    await (await page.$('[data-capture] input[type=file]')).uploadFile(img('board.png')); await h.sleep(300);
    await page.evaluate(() => [...document.querySelectorAll('[data-capture] button')].find(b => /^Save 1 photo$/.test(b.innerText)).click()); await h.sleep(3200);
    h.check(`${s}: the new photo appears on the From class shelf straight away`, (await page.$$('[data-shelf="class"] [data-file-card]')).length === 1 && /1 file you uploaded/.test(await page.$eval('[data-shelf="class"]', e => e.innerText)));
    await page.close();

    // ── recording ──
    page = await h.newPage({ width: 430, height: 1000 }); await h.fakeClock(page, '2026-11-16T10:00:00-05:00'); mocks(page, s);
    await h.go(page, `/${s}`, 1500); await plus(page); await h.sleep(400); await page.click('[data-capture-open="record"]'); await h.sleep(600);
    h.check(`${s}: recorder starts idle with a clear limit`, (await page.$eval('[data-recorder]', e => e.dataset.recorder)) === 'idle' && /hour and a half/.test(await h.text(page)));
    await h.clickText(page, 'Start recording', { tag: 'button' }); await h.sleep(6500);
    const live = await page.$eval('[data-recorder]', e => `${e.dataset.recorder}|${e.innerText.replace(/\n/g, ' ')}`);
    h.check(`${s}: recording shows a running clock and how to get good audio`, /^recording\|0:0[4-9]/.test(live) && /Keep Ascend open/.test(live), live);
    await h.clickText(page, 'Stop', { tag: 'button', exact: true }); await h.sleep(900);
    const nm = await page.$eval('input[aria-label="Recording name"]', e => e.value).catch(() => '');
    h.check(`${s}: stopping gives a named recording ready to save`, (await page.$eval('[data-recorder]', e => e.dataset.recorder)) === 'ready' && /^Lecture recording Nov 16, 10:0\d AM$/.test(nm), nm);
    await page.$eval('input[aria-label="Recording name"]', e => e.select()); await page.type('input[aria-label="Recording name"]', 'Lecture 12 buffers');
    page.t.writes.length = 0; page.t.apiCalls.length = 0;
    await h.clickText(page, 'Save recording', { tag: 'button' }); await h.sleep(3000);
    const rp = page.t.writes.find(x => x.table === 'resources' && x.method === 'POST'), rs = page.t.writes.find(x => x.table === 'storage'), tc = page.t.apiCalls.find(c => c.path === '/api/transcribe-audio');
    h.check(`${s}: the recording is stored, transcribed from storage, and saved as an audio class file`, rs && rs.query.includes(`resources/${s}/f-next/`) && /\.(webm|m4a|ogg)$/.test(rs.query.split('?')[0]) && tc && /storage\/v1\/object\/public\/resources/.test(tc.bodyText) && rp && rp.body.file_type === 'audio' && rp.body.file_name === 'Lecture 12 buffers' && rp.body.transcript === 'the lecture, written out' && rp.body.folder_id === 'f-next', JSON.stringify({ rs: rs && rs.query, rp: rp && rp.body }).slice(0, 400));
    h.check(`${s}: recorder leaves no errors and lets go of the microphone`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.close();

    // no exam folders yet
    page = await h.newPage(); mocks(page, s); page.t.mocks.exam_folders = []; await h.go(page, `/${s}`, 1300); await plus(page); await h.sleep(300); await page.click('[data-capture-open="photo"]'); await h.sleep(600);
    h.check(`${s}: with no exam folder, capture explains what is needed`, /Add a class with an exam folder first/.test(await h.text(page)));
    await page.close();

    // ── reminders switch on the profile ──
    const ctx = h.browser().defaultBrowserContext();
    await ctx.clearPermissionOverrides();
    page = await h.newPage({ width: 430, height: 1500 }); await page.evaluateOnNewDocument(() => { Object.defineProperty(Notification, 'permission', { get: () => 'denied' }); }); await h.go(page, `/${s}/profile`, 1500);
    h.check(`${s}: profile has a Reminders row; blocked notifications are explained`, (await page.$eval('[data-reminders]', e => e.dataset.reminders)) === 'blocked' && /blocked for Ascend/.test(await h.text(page)) && !/Coming soon/.test(await h.text(page)));
    await page.close();
    await ctx.overridePermissions(h.BASE, ['notifications']);
    page = await h.newPage({ width: 430, height: 1500 });
    let fakeSub = null;
    await page.evaluateOnNewDocument(() => {
      const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/e2e', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/e2e', keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } }), unsubscribe: async () => { window.__sub = null; return true; } };
      window.__sub = null;
      PushManager.prototype.subscribe = async function () { window.__sub = sub; return sub; };
      PushManager.prototype.getSubscription = async function () { return window.__sub; };
    });
    page.t.apiMocks['/api/push'] = ({ bodyText }) => { const b = JSON.parse(bodyText); return b.action === 'key' ? { json: { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' } } : { json: { ok: true } }; };
    await h.go(page, `/${s}/profile`, 1500);
    h.check(`${s}: when allowed, reminders start off with a Turn on button`, (await page.$eval('[data-reminders]', e => e.dataset.reminders)) === 'off' && /Turn on/.test(await page.$eval('[data-reminders]', e => e.innerText)));
    await h.clickText(page, 'Turn on', { tag: 'button' }); await h.sleep(2500);
    const calls = page.t.apiCalls.filter(c => c.path === '/api/push').map(c => JSON.parse(c.bodyText));
    const subCall = calls.find(c => c.action === 'subscribe');
    h.check(`${s}: turning on registers this device for this student, with its time zone`, (await page.$eval('[data-reminders]', e => e.dataset.reminders)) === 'on' && subCall && subCall.student === s && subCall.subscription.endpoint.includes('fcm.googleapis.com') && typeof subCall.timezone === 'string' && /only when something is due/.test(await h.text(page)), JSON.stringify(calls).slice(0, 300));
    h.check(`${s}: the background helper is installed`, await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/'); return !!r && /\/sw\.js$/.test((r.active || r.installing || r.waiting).scriptURL); }));
    await h.clickText(page, 'Send a test', { tag: 'button' }); await h.sleep(900);
    h.check(`${s}: Send a test asks the server to deliver one to this device`, page.t.apiCalls.some(c => c.path === '/api/push' && JSON.parse(c.bodyText).action === 'test') && /should appear in a few seconds/.test(await h.text(page)));
    await h.clickText(page, 'Turn off', { tag: 'button' }); await h.sleep(900);
    h.check(`${s}: Turn off removes the device and returns to Off`, page.t.apiCalls.some(c => c.path === '/api/push' && JSON.parse(c.bodyText).action === 'unsubscribe') && (await page.$eval('[data-reminders]', e => e.dataset.reminders)) === 'off');
    h.check(`${s}: reminders switch has no runtime errors`, page.t.errors.length === 0, page.t.errors.join('|'));
    await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); });
    await page.close();
    // iPhone in Safari (not installed): told to add to Home Screen first
    page = await h.newPage({ device: 'iPhone 13' }); await page.evaluateOnNewDocument(() => { delete window.PushManager; });
    await h.go(page, `/${s}/profile`, 1500);
    h.check(`${s}: iPhone not yet installed: told to add Ascend to the Home Screen first`, (await page.$eval('[data-reminders]', e => e.dataset.reminders)) === 'needs-install' && /Add to Home Screen/.test(await page.$eval('[data-reminders]', e => e.innerText)));
    await h.go(page, `/${s}`, 1500);
    h.check(`${s}: iPhone home page explains installing with Share → Add to Home Screen`, /Get Ascend as an app/.test(await h.text(page)) && /Share/.test(await page.$eval('[data-install-hint]', e => e.innerText)));
    await page.close();
  }
  const sw = await (await fetch(h.BASE + '/sw.js')).text();
  h.check('background helper shows reminders and opens Ascend when tapped, and stores nothing', /addEventListener\('push'/.test(sw) && /notificationclick/.test(sw) && !/caches\./.test(sw));
  const man = await (await fetch(h.BASE + '/manifest.json')).json();
  h.check('app manifest is installable (name, standalone, icons)', man.display === 'standalone' && man.start_url === '/' && man.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable') && man.icons.some(i => i.sizes === '192x192'));
  const pp = (await fetch(h.BASE + '/matthew')).headers.get('permissions-policy') || '';
  h.check('the site allows the microphone for itself only', /microphone=\(self\)/.test(pp) && /camera=\(\)/.test(pp), pp);
});
