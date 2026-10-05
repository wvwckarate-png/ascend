-- Ascend v2.9.0 — PINs are checked on the server and no longer readable from the browser.
--
-- Run in the Supabase dashboard -> SQL Editor, in TWO steps:
--
--   STEP 1: run NOW (before deploying v2.9.0). Safe — it only ADDS an access right.
--   STEP 2: run AFTER v2.9.0 is live and you've confirmed you can still log in with a PIN.
--           (The old site reads the pin column directly, so running step 2 early would break its PIN screen.)

-- ───────────────────────── STEP 1 ─────────────────────────
-- The server needs to read/write the pin column using the service key. (Your project's service_role currently has
-- no privileges on `students`, so the new PIN routes would fail with "permission denied".)
GRANT ALL ON public.students TO service_role;


-- ───────────────────────── STEP 2 ─────────────────────────
-- Take the pin column away from the public (anon) key. Everything else on the students table works as before.
-- Before: anyone with the public key could read every PIN (visible in the browser's network tab) or overwrite one.
-- After:  PINs can only be read/changed by the server (the parent page + login go through /api routes).

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.students FROM anon, authenticated;

GRANT SELECT (id, name, grade, focus, track, bio, target_school, target_program, grad_year, generation_profile)
  ON public.students TO anon, authenticated;

GRANT UPDATE (name, grade, focus, track, bio, target_school, target_program, grad_year, generation_profile)
  ON public.students TO anon, authenticated;
