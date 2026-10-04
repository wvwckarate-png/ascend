-- Ascend v2.8.0 — fix "permission denied" on two tables
--
-- Found during the v2.8.0 end-to-end pass: with the public (anon) key, Supabase answers
--   42501 permission denied for table grades
--   42501 permission denied for table flashcard_items
-- so, for ALL three students:
--   * the Grade Tracker in every class binder can't load, save, or delete grades
--   * the GPA widget on the Classes page can't count graded (non-"GPA class") courses
--   * spaced repetition (next_review / due-today / weak cards) silently records nothing
--
-- Run this once in the Supabase dashboard -> SQL Editor. It mirrors the earlier practice_exam_items fix
-- (RLS off + grants), which matches how every other table in this app is already accessed (anon key, no auth).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_items TO anon, authenticated;

ALTER TABLE public.grades          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_items DISABLE ROW LEVEL SECURITY;

-- Verify (should return rows / [] instead of a permission error):
--   select count(*) from public.grades;
--   select count(*) from public.flashcard_items;
