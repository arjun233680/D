-- Row level security.
--
-- Two rules cover almost everything:
--   Content is readable by anyone, writable only by educators and admins.
--   Learner data is readable and writable only by the learner it belongs to.
--
-- RLS is enabled on every table. Nothing is left open by default.

-- Is the caller staff? Used by the content write policies.
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('educator', 'admin')
  );
$$;

-- ------------------------------------------------- public content: read all

do $$
declare t text;
begin
  foreach t in array array[
    'subjects','topics','exams','exam_updates','exam_sources','exam_papers',
    'paper_sections','educators','questions','notes','note_sections','videos',
    'video_chapters','batches','batch_modules','tests','test_sections','current_affairs'
  ]
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "%s_public_read" on %I', t, t);
    execute format(
      'create policy "%s_public_read" on %I for select using (true)', t, t);

    execute format('drop policy if exists "%s_staff_write" on %I', t, t);
    execute format(
      'create policy "%s_staff_write" on %I for all to authenticated
         using (is_staff()) with check (is_staff())', t, t);
  end loop;
end;
$$;

-- Educators may also edit their own uploads even before a role is granted,
-- which is what makes the Studio work on a fresh account.
drop policy if exists "videos_owner_write" on videos;
create policy "videos_owner_write" on videos
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "notes_owner_write" on notes;
create policy "notes_owner_write" on notes
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "questions_owner_write" on questions;
create policy "questions_owner_write" on questions
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ------------------------------------------------------ learner-owned data

alter table profiles enable row level security;

drop policy if exists "profiles_self_read" on profiles;
create policy "profiles_self_read" on profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_self_write" on profiles;
create policy "profiles_self_write" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_self_insert" on profiles;
create policy "profiles_self_insert" on profiles
  for insert to authenticated with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['activity_days','bookmarks','saved_notes','enrolments','attempts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%s_owner" on %I', t, t);
    execute format(
      'create policy "%s_owner" on %I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end;
$$;

-- Answers are reached through the attempt, so the check follows the join.
alter table attempt_answers enable row level security;

drop policy if exists "attempt_answers_owner" on attempt_answers;
create policy "attempt_answers_owner" on attempt_answers
  for all to authenticated
  using (exists (
    select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (
    select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- ------------------------------------------------------------------ doubts

alter table doubts enable row level security;
alter table doubt_answers enable row level security;

drop policy if exists "doubts_public_read" on doubts;
create policy "doubts_public_read" on doubts for select using (true);

drop policy if exists "doubts_author_write" on doubts;
create policy "doubts_author_write" on doubts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "doubt_answers_public_read" on doubt_answers;
create policy "doubt_answers_public_read" on doubt_answers for select using (true);

drop policy if exists "doubt_answers_author_write" on doubt_answers;
create policy "doubt_answers_author_write" on doubt_answers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------- storage

-- Uploads from the Educator Studio land here.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true), ('notes', 'notes', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('videos', 'notes'));

drop policy if exists "media_authenticated_upload" on storage.objects;
create policy "media_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('videos', 'notes') and owner = auth.uid());

drop policy if exists "media_owner_manage" on storage.objects;
create policy "media_owner_manage" on storage.objects
  for all to authenticated
  using (bucket_id in ('videos', 'notes') and owner = auth.uid())
  with check (bucket_id in ('videos', 'notes') and owner = auth.uid());
