-- ASCEND LOCK-DOWN, STEP 1 of 2  (safe: nothing changes for anyone yet)
-- Paste all of this into the Supabase SQL Editor and press Run. Expected result: "Success. No rows returned".
-- It prepares the rules. They do nothing until STEP 2 switches them on.

-- Which students may the signed-in person see? A student: only themselves. A parent: everyone.
create or replace function public.my_student_ids() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(case
    when exists (select 1 from accounts where user_id = auth.uid() and role = 'parent') then (select array_agg(id) from students)
    else (select array_agg(student_id) from accounts where user_id = auth.uid() and student_id is not null)
  end, '{}'::text[]);
$$;
revoke all on function public.my_student_ids() from public, anon;
grant execute on function public.my_student_ids() to authenticated, service_role;

-- Signed-in people use the same tables the app uses today.
grant select, insert, update, delete on public.classes, public.exam_folders, public.resources, public.grades, public.tasks,
  public.study_guides, public.flashcard_decks, public.flashcard_cards, public.flashcard_items, public.practice_exams, public.practice_exam_items to authenticated;
grant execute on function public.study_plan_decks(text, timestamptz) to authenticated;

-- The rules (inactive until step 2).
do $$
declare t text;
begin
  foreach t in array array['classes','grades','tasks','study_guides','flashcard_decks','flashcard_items','practice_exams','practice_exam_items'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (student_id = any ((select public.my_student_ids()))) with check (student_id = any ((select public.my_student_ids())))', t);
  end loop;
end $$;

drop policy if exists own_row on public.students;
create policy own_row on public.students for select to authenticated using (id = any ((select public.my_student_ids())));
drop policy if exists own_row_update on public.students;
create policy own_row_update on public.students for update to authenticated using (id = any ((select public.my_student_ids()))) with check (id = any ((select public.my_student_ids())));

drop policy if exists own_rows on public.exam_folders;
create policy own_rows on public.exam_folders for all to authenticated
  using (exists (select 1 from public.classes c where c.id = exam_folders.class_id and c.student_id = any ((select public.my_student_ids()))))
  with check (exists (select 1 from public.classes c where c.id = exam_folders.class_id and c.student_id = any ((select public.my_student_ids()))));

drop policy if exists own_rows on public.resources;
create policy own_rows on public.resources for all to authenticated
  using (exists (select 1 from public.exam_folders f join public.classes c on c.id = f.class_id where f.id = resources.folder_id and c.student_id = any ((select public.my_student_ids()))))
  with check (exists (select 1 from public.exam_folders f join public.classes c on c.id = f.class_id where f.id = resources.folder_id and c.student_id = any ((select public.my_student_ids()))));

drop policy if exists own_rows on public.flashcard_cards;
create policy own_rows on public.flashcard_cards for all to authenticated
  using (exists (select 1 from public.flashcard_decks d where d.id = flashcard_cards.deck_id and d.student_id = any ((select public.my_student_ids()))))
  with check (exists (select 1 from public.flashcard_decks d where d.id = flashcard_cards.deck_id and d.student_id = any ((select public.my_student_ids()))));

-- Stored files: a signed-in person may add, replace and remove files only inside their own student folder.
drop policy if exists ascend_own_files on storage.objects;
create policy ascend_own_files on storage.objects for all to authenticated
  using (bucket_id in ('resources', 'card-images') and (storage.foldername(name))[1] = any ((select public.my_student_ids())))
  with check (bucket_id in ('resources', 'card-images') and (storage.foldername(name))[1] = any ((select public.my_student_ids())));
