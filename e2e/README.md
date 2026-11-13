# Browser tests

Headless-Chrome checks that drive the real pages. Every database write and paid AI call is intercepted, so running
them can never change real data or cost money.

```bash
npx next build && PARENT_PASSWORD=testpw123 npx next start -p 3112 &    # the app under test

node e2e/smoke.js          # every page renders for every student
node e2e/exam-cards.js     # practice exams + flashcards
node e2e/organize.js       # classes/GPA, add-class, dashboard, calendar, binder, folder, profile
node e2e/pipeline.js       # generate -> check -> improve -> present
node e2e/personalize.js    # theme picker, re-orderable class cards, old-exam uploads
node e2e/today.js          # Today's Plan (ring + streak), grade targeting, class context from the general screen
node e2e/loop.js           # drag preview, slimmer home page, weak-spot drill, after-exam follow-up
node e2e/accounts.js       # People & sign-ins panel (mocked, never sends email), sign-in and set-password screens
npx -y tsx e2e/unit/plan.test.ts   # the plan / streak / grade-target rules on their own (no browser)
REAL_API=1 node e2e/export.js   # study guide Print / PDF (uses the real PDF route)
```

`auth.js` (PIN login + parent dashboard) needs a build pointed at the fake backend so real PINs are never touched:

```bash
node e2e/fake-supabase.js &
NEXT_PUBLIC_SUPABASE_URL=http://localhost:4010 SUPABASE_SERVICE_ROLE_KEY=fake npx next build
PARENT_PASSWORD=testpw123 NEXT_PUBLIC_SUPABASE_URL=http://localhost:4010 SUPABASE_SERVICE_ROLE_KEY=fake npx next start -p 3112 &
node e2e/auth.js
rm -rf .next && npx next build      # back to a normal build
```

Visual snapshots — proof that a refactor changed nothing a student can see:

```bash
node e2e/visual.js capture /tmp/before     # on the old code
node e2e/visual.js capture /tmp/after      # on the new code
node e2e/visual.js compare /tmp/before /tmp/after
```

`ONLY=matthew node e2e/…` limits a suite to one student. `VERBOSE=1` prints every passing check.
`BASE=https://… node e2e/smoke.js` runs read-only suites against the live site.
