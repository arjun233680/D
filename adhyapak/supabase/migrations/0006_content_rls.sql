-- ---------------------------------------------------------------------------
-- 0006 — row level security for the content library
--
-- 0002 gave every content table `using (true)`: readable by anyone. That was
-- correct when every row was published seed data, and becomes a leak the moment
-- 0005 introduces drafts — an unreviewed question, a note being written, an
-- archived question withdrawn for being wrong, all served to any client that
-- asks.
--
-- This migration narrows public reads to published rows, and locks the new
-- staging and audit tables to staff.
-- ---------------------------------------------------------------------------

-- 0002 defines is_staff() (educator or admin). Import staging needs the
-- narrower question — an educator must not read another educator's upload —
-- so the admin-only half is defined here.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------ published-only public read

do $$
declare t text;
begin
  foreach t in array array['questions', 'notes', 'videos', 'tests']
  loop
    execute format('drop policy if exists "%s_public_read" on %I', t, t);

    -- Anyone may read published content. Staff additionally see every state, so
    -- the Studio can list drafts without a second connection or a service key.
    execute format(
      'create policy "%s_public_read" on %I for select
         using (status = ''published'' or is_staff())', t, t);
  end loop;
end;
$$;

-- Child rows follow their parent: a section of an unpublished note must not be
-- readable just because it lives in its own table.
drop policy if exists "note_sections_public_read" on note_sections;
create policy "note_sections_public_read" on note_sections
  for select using (
    exists (
      select 1 from notes n
      where n.id = note_sections.note_id
        and (n.status = 'published' or is_staff())
    )
  );

drop policy if exists "video_chapters_public_read" on video_chapters;
create policy "video_chapters_public_read" on video_chapters
  for select using (
    exists (
      select 1 from videos v
      where v.id = video_chapters.video_id
        and (v.status = 'published' or is_staff())
    )
  );

drop policy if exists "test_sections_public_read" on test_sections;
create policy "test_sections_public_read" on test_sections
  for select using (
    exists (
      select 1 from tests t
      where t.id = test_sections.test_id
        and (t.status = 'published' or is_staff())
    )
  );

-- ------------------------------------------------------ new hierarchy tables

do $$
declare t text;
begin
  foreach t in array array['units', 'subtopics']
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "%s_public_read" on %I', t, t);
    execute format('create policy "%s_public_read" on %I for select using (true)', t, t);

    execute format('drop policy if exists "%s_staff_write" on %I', t, t);
    execute format(
      'create policy "%s_staff_write" on %I for all to authenticated
         using (is_staff()) with check (is_staff())', t, t);
  end loop;
end;
$$;

-- --------------------------------------------------------- import staging
--
-- Uploads are private to whoever made them, plus admins. An import in progress
-- contains unreviewed material and, often, a contributor's mistakes; neither
-- belongs to the public, and one educator has no business reading another's.

alter table import_batches enable row level security;
alter table import_rows enable row level security;

drop policy if exists "import_batches_owner" on import_batches;
create policy "import_batches_owner" on import_batches
  for all to authenticated
  using (created_by = auth.uid() or is_admin())
  with check (created_by = auth.uid() or is_admin());

drop policy if exists "import_rows_owner" on import_rows;
create policy "import_rows_owner" on import_rows
  for all to authenticated
  using (
    exists (
      select 1 from import_batches b
      where b.id = import_rows.batch_id
        and (b.created_by = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from import_batches b
      where b.id = import_rows.batch_id
        and (b.created_by = auth.uid() or is_admin())
    )
  );

-- ------------------------------------------------------------- audit trail
--
-- Readable by staff, written only by the triggers in 0005. Nobody edits an
-- audit log: a history that can be rewritten is not a history.

alter table content_audit enable row level security;

drop policy if exists "content_audit_staff_read" on content_audit;
create policy "content_audit_staff_read" on content_audit
  for select to authenticated using (is_staff());

-- No insert/update/delete policy is defined on purpose. The status trigger is
-- SECURITY DEFINER and so bypasses RLS; every other writer is denied.

-- ---------------------------------------------------------------- publishing
--
-- Publishing is a privileged transition, not an ordinary column update: it is
-- the moment content becomes visible to every learner. Routing it through a
-- function gives one place to enforce the checks and one place that records who
-- did it.

create or replace function set_question_status(p_question_id text, p_status content_status)
returns questions
language plpgsql
security definer
set search_path = public
as $$
declare
  result questions;
  q      questions;
begin
  if not is_staff() then
    raise exception 'only educators and admins may change content status';
  end if;

  select * into q from questions where id = p_question_id;
  if not found then
    raise exception 'question % does not exist', p_question_id;
  end if;

  -- The database enforces what the TypeScript validator also checks, because
  -- the validator can be bypassed by anything that talks to Postgres directly.
  if p_status = 'published' then
    if coalesce(btrim(q.text->>'en'), '') = '' then
      raise exception 'question % has no English text and cannot be published', q.id;
    end if;
    if coalesce(btrim(q.text->>'hi'), '') = '' then
      raise exception 'question % has no Hindi text and cannot be published', q.id;
    end if;
    if jsonb_array_length(q.options) < 2 then
      raise exception 'question % has fewer than two options', q.id;
    end if;
    if q.correct_index < 0 or q.correct_index >= jsonb_array_length(q.options) then
      raise exception 'question % has a correct answer outside its options', q.id;
    end if;
  end if;

  update questions set status = p_status where id = p_question_id returning * into result;
  return result;
end;
$$;

revoke all on function set_question_status(text, content_status) from public;
grant execute on function set_question_status(text, content_status) to authenticated;

comment on function set_question_status is
  'The only supported way to publish or withdraw a question. Enforces the '
  'publish-time checks in the database rather than trusting the client, and '
  'leaves an audit row behind through the trigger in 0005.';
