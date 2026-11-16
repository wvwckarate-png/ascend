-- ASCEND LOCK-DOWN, STEP 2 of 2  (this is the switch)
-- Run ONLY after step 1 has been run and Ascend v2.19.0 is live and everyone can still sign in and see their classes.
-- Paste all of this into the Supabase SQL Editor and press Run. Expected result: one row per table, all "true".
-- After this, nobody can read or change anything without being signed in, and each student can reach only their own data.

alter table public.students            enable row level security;
alter table public.classes             enable row level security;
alter table public.exam_folders        enable row level security;
alter table public.resources           enable row level security;
alter table public.grades              enable row level security;
alter table public.tasks               enable row level security;
alter table public.study_guides        enable row level security;
alter table public.flashcard_decks     enable row level security;
alter table public.flashcard_cards     enable row level security;
alter table public.flashcard_items     enable row level security;
alter table public.practice_exams      enable row level security;
alter table public.practice_exam_items enable row level security;

-- Visitors who are not signed in lose all access to the tables and to the per-deck counter.
revoke all on public.students, public.classes, public.exam_folders, public.resources, public.grades, public.tasks, public.study_guides,
  public.flashcard_decks, public.flashcard_cards, public.flashcard_items, public.practice_exams, public.practice_exam_items, public.study_days from anon;
revoke all on public.study_days from authenticated;
revoke execute on function public.study_plan_decks(text, timestamptz) from anon;

-- Stored files: not-signed-in visitors can no longer upload, replace, delete or list files.
-- (A file can still be opened by someone who already has its exact, long link — that is how the app shows files.)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Allow uploads to card-images" on storage.objects;

select relname as "table", relrowsecurity as locked from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' and relname not in ('keepalive') order by relname;

-- TO UNDO in an emergency (opens the tables to signed-in people without per-student rules; visitors stay locked out):
--   alter table public.classes disable row level security;   -- repeat for any table that misbehaves
