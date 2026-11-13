// Parent dashboard "People & sign-ins" (server replies mocked — no email is ever sent) plus the sign-in / set-password screens.
// The real sign-in round trip is exercised separately against the auth service with a throwaway address.
const h = require('./lib');
h.run('accounts', async () => {
  let page = await h.newPage({ width: 430, height: 1700 });
  let people = [];
  const calls = [];
  page.t.apiMocks['/api/admin/accounts'] = ({ bodyText }) => {
    const b = JSON.parse(bodyText); calls.push(b);
    if (b.password !== 'testpw123') return { status: 401, json: { error: 'Unauthorized' } };
    if (b.action === 'invite') {
      if (people.some(p => p.email === b.email.toLowerCase())) return { status: 409, json: { error: 'That email is already invited. Use Resend to send the link again.' } };
      if (/slow/.test(b.email)) { people.push({ email: b.email, role: b.role, studentId: b.student || null, invitedAt: 'x', lastInviteAt: null, signedIn: false }); return { status: 502, json: { error: 'Saved, but the email could not be sent yet: only a few emails can go out per hour. Use Resend in a little while.', accounts: people } }; }
      people.push({ email: b.email.toLowerCase(), role: b.role, studentId: b.student || null, invitedAt: 'x', lastInviteAt: 'x', signedIn: b.role === 'parent' });
    }
    if (b.action === 'remove') people = people.filter(p => p.email !== b.email);
    return { json: { accounts: people } };
  };
  await h.go(page, '/parent');
  h.check('locked dashboard offers email sign-in as well as the password', /Sign in with email/.test(await h.text(page)) && !!(await page.$('a[href="/login"]')));
  await h.setInput(page, 'input[type=password]', 'testpw123'); await page.keyboard.press('Enter'); await h.sleep(2500);
  const panel = () => page.$eval('[data-people-panel]', e => e.innerText.replace(/\n+/g, ' | ')).catch(() => '');
  let t = await panel();
  h.check('People panel shows, empty, with every student and Parent as choices', /People & sign-ins/i.test(t) && /Nobody is invited yet/.test(t) && /Matthew/.test(t) && /Michael/.test(t) && /Brynne/.test(t) && /Parent/.test(t), t);
  h.check('Send is disabled until there is an email and a choice', await page.$eval('[data-people-panel] button[type=submit]', b => b.disabled));
  await page.type('#invite-email', 'Dad@Example.com'); await page.click('[data-people-panel] [role=radio]:last-child'); await page.click('[data-people-panel] button[type=submit]'); await h.sleep(600);
  t = await panel(); let last = calls[calls.length - 1];
  h.check('inviting a parent sends email + role, then lists them', last.action === 'invite' && last.email === 'Dad@Example.com' && last.role === 'parent' && last.student === undefined && /Invitation sent to Dad@Example.com/.test(t) && /dad@example\.com/.test(t) && /Signed in/.test(t), JSON.stringify(last) + t.slice(0, 200));
  await page.type('#invite-email', 'kid@example.com'); await page.evaluate(() => [...document.querySelectorAll('[data-people-panel] [role=radio]')].find(b => b.innerText === 'Michael').click()); await page.click('[data-people-panel] button[type=submit]'); await h.sleep(600);
  t = await panel(); last = calls[calls.length - 1];
  h.check('inviting a student ties the email to that student', last.role === 'student' && last.student === 'michael' && /Michael \| Invited/.test(t.replace(/ +/g, ' ')) || (/Michael/.test(t) && /Invited/.test(t) && last.student === 'michael'), JSON.stringify(last));
  h.check('a student who already has a sign-in can no longer be picked', await page.evaluate(() => [...document.querySelectorAll('[data-people-panel] [role=radio]')].find(b => b.innerText === 'Michael').disabled) && !(await page.evaluate(() => [...document.querySelectorAll('[data-people-panel] [role=radio]')].find(b => b.innerText === 'Brynne').disabled)));
  await page.type('#invite-email', 'kid@example.com'); await page.evaluate(() => [...document.querySelectorAll('[data-people-panel] [role=radio]')].find(b => b.innerText === 'Brynne').click()); await page.click('[data-people-panel] button[type=submit]'); await h.sleep(600);
  h.check('a duplicate email is refused with the reason, and the form keeps what was typed', /already invited/.test(await panel()) && (await page.$eval('#invite-email', e => e.value)) === 'kid@example.com');
  await page.$eval('#invite-email', e => e.select()); await page.type('#invite-email', 'slow@example.com'); await page.click('[data-people-panel] button[type=submit]'); await h.sleep(600); t = await panel();
  h.check('email limit: invitation is kept and the parent is told to resend later', /only a few emails can go out per hour/.test(t) && /slow@example\.com/.test(t));
  await page.evaluate(() => [...document.querySelectorAll('[data-person="kid@example.com"] button')].find(b => /Resend/.test(b.innerText)).click()); await h.sleep(600);
  last = calls[calls.length - 1];
  h.check('Resend asks for a new link for that email', last.action === 'resend' && last.email === 'kid@example.com' && /new link is on its way to kid@example\.com/.test(await panel()));
  const before = calls.length;
  await page.click('button[aria-label="Remove kid@example.com"]'); await h.sleep(250);
  h.check('Remove asks first', calls.length === before && /Remove this sign-in\?/.test(await panel()));
  await page.evaluate(() => [...document.querySelectorAll('[data-person="kid@example.com"] button')].find(b => /Yes, remove/.test(b.innerText)).click()); await h.sleep(600);
  t = await panel(); last = calls[calls.length - 1];
  h.check('confirming removes only the sign-in and says so', last.action === 'remove' && last.email === 'kid@example.com' && !/kid@example\.com \|/.test(t.replace('can no longer', '')) && /can no longer sign in\. Nothing else was deleted/.test(t), t.slice(0, 300));
  h.check('PIN management still works below it', /PIN Management/i.test(await h.text(page)) && /PIN active|No PIN set/.test(await h.text(page)));
  h.check('dashboard has no runtime errors', page.t.errors.length === 0, page.t.errors.join('|'));
  await page.close();

  page = await h.newPage(); await h.go(page, '/login'); t = await h.text(page);
  h.check('sign-in page renders with email + password', /Sign in/.test(t) && !!(await page.$('#login-email')) && !!(await page.$('#login-password')) && await page.$eval('button[type=submit]', b => b.disabled));
  await h.clickText(page, 'Forgot password?', { tag: 'button' }); await h.sleep(200);
  h.check('forgot password asks only for the email', /Reset your password/.test(await h.text(page)) && !(await page.$('#login-password')));
  await page.close();
  page = await h.newPage(); await h.go(page, '/welcome', 4800);
  h.check('opening the set-password page without a valid link explains and points to sign in', /This link has expired/.test(await h.text(page)) && !!(await page.$('a[href="/login"]')));
  await page.close();
  page = await h.newPage(); await h.go(page, '/welcome#error=access_denied&error_code=otp_expired', 600);
  h.check('an expired link says so immediately', /This link has expired/.test(await h.text(page)));
  await page.close();
  page = await h.newPage(); await h.go(page, '/'); 
  h.check('home screen has a Sign in button', !!(await page.$('a[href="/login"]')) && /Sign in/.test(await h.text(page)));
  await h.go(page, '/matthew', 1500);
  h.check('student pages work exactly as before with nobody signed in', /Hey, Matthew/.test(await h.text(page)) && page.t.errors.length === 0, page.t.errors.join('|'));
  await page.close();
});
