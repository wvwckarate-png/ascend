# Browser tests

Headless-Chrome checks that drive the real pages. Every database write and paid AI call is intercepted, so running
them can never change real data or cost money.

```bash
npx next build && npx next start -p 3112 &    # the app under test

node e2e/smoke.js          # every page renders for every student
node e2e/exam-cards.js     # practice exams + flashcards
node e2e/organize.js       # classes/GPA, add-class, dashboard, calendar, binder, folder, profile
node e2e/pipeline.js       # generate -> check -> improve -> present
node e2e/personalize.js    # theme picker, re-orderable class cards, old-exam uploads
node e2e/today.js          # Today's Plan (ring + streak), grade targeting, class context from the general screen
node e2e/loop.js           # drag preview, slimmer home page, weak-spot drill, after-exam follow-up
node e2e/files.js          # exam page shelves (from class vs made by Ascend), made-from links, Library
node e2e/accounts.js       # People & sign-ins panel (mocked, never sends email), sign-in and set-password screens
npx -y tsx e2e/unit/plan.test.ts   # the plan / streak / grade-target rules on their own (no browser)
REAL_API=1 node e2e/export.js   # study guide Print / PDF (uses the real PDF route)
```

Sign-in is pretended in local runs (see `lib.js`): every page opens as a signed-in parent unless a test sets
`page.t.account` (a student, `null` for signed out, or `'down'` for an unreachable server) or opens the page with
`newPage({ signedOut: true })`. Local runs never read the real database — a table a test didn't describe is empty.

```bash
node e2e/auth.js           # the front door: who may open what, and that the server refuses callers who are not signed in
BASE=https://… node e2e/smoke.js   # against the live site: every page sends a visitor to sign in
```

`export.js` calls the real PDF route, which now needs a real sign-in; it is skipped until it is given one.

Visual snapshots — proof that a refactor changed nothing a student can see:

```bash
node e2e/visual.js capture /tmp/before     # on the old code
node e2e/visual.js capture /tmp/after      # on the new code
node e2e/visual.js compare /tmp/before /tmp/after
```

`ONLY=matthew node e2e/…` limits a suite to one student. `VERBOSE=1` prints every passing check.
`BASE=https://… node e2e/smoke.js` runs read-only suites against the live site.
