-- ---------------------------------------------------------------------------
-- 0007 — the Studio import workflow
--
-- 0005 created the staging tables; nothing wrote to them, because import was a
-- CLI that emitted SQL. This adds what an in-app import needs:
--
--   * a stored fingerprint, so duplicate detection is an index lookup rather
--     than a scan of every question in the bank
--   * `commit_import_batch`, which inserts a validated chunk as drafts inside
--     one transaction and records who did it
--   * bulk publish and archive, both routed through the existing
--     `set_question_status` so the publish-time checks cannot be skipped
--
-- Nothing here weakens 0006. Every function is SECURITY DEFINER and re-checks
-- `is_staff()` itself, because a client that can call an RPC can call it with
-- any arguments it likes.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------ fingerprints

-- The normalised question text two copies of one question share. Written by the
-- application, which owns the normalisation rules (see content/duplicates.ts) —
-- keeping them in one language avoids two implementations drifting apart.
alter table questions add column if not exists fingerprint text;

create index if not exists questions_fingerprint_idx on questions(fingerprint)
  where fingerprint is not null;

comment on column questions.fingerprint is
  'Normalised question text, for duplicate detection. Deliberately not unique: '
  'a genuine repeat across two papers is a fact worth recording, not an error.';

-- ------------------------------------------------------- import batch state

alter table import_batches add column if not exists label text;
alter table import_batches add column if not exists exam_id text references exams(id) on delete set null;
alter table import_batches add column if not exists duplicate_rows int not null default 0;

comment on column import_batches.label is
  'What the educator called this import, e.g. "HTET TGT Science 2024".';

-- --------------------------------------------------------------- committing

/**
 * Inserts a validated chunk of questions as drafts.
 *
 * Takes an array so a large file arrives in a handful of round trips rather
 * than one per row, and runs as a single statement so a chunk either lands
 * whole or not at all — a half-written chunk is the one outcome that would
 * leave an educator unable to tell what happened.
 *
 * Status is forced to 'draft' regardless of what the payload says. Import is
 * not a publishing route.
 */
create or replace function commit_import_batch(
  p_batch_id uuid,
  p_questions jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  if not is_staff() then
    raise exception 'only educators and admins may import questions';
  end if;

  if not exists (
    select 1 from import_batches
    where id = p_batch_id and (created_by = auth.uid() or is_admin())
  ) then
    raise exception 'import batch % does not belong to you', p_batch_id;
  end if;

  with incoming as (
    select * from jsonb_to_recordset(p_questions) as q(
      id             text,
      kind           text,
      subject_id     text,
      unit_id        text,
      topic_id       text,
      subtopic_id    text,
      exam_ids       text[],
      levels         text[],
      text           jsonb,
      options        jsonb,
      correct_index  int,
      correct_indices int[],
      explanation    jsonb,
      difficulty     text,
      marks          numeric,
      negative_marks numeric,
      pyq_exam_id    text,
      pyq_year       int,
      pyq_session    text,
      pyq_paper_label text,
      pyq_shift      text,
      pyq_question_number int,
      source         text,
      tags           text[],
      concept_tags   text[],
      syllabus_ref   text,
      fingerprint    text
    )
  ), written as (
    insert into questions (
      id, status, kind, subject_id, unit_id, topic_id, subtopic_id, exam_ids, levels,
      text, options, correct_index, correct_indices, explanation, difficulty,
      marks, negative_marks,
      pyq_exam_id, pyq_year, pyq_session, pyq_paper_label, pyq_shift, pyq_question_number,
      source, tags, concept_tags, syllabus_ref, fingerprint, created_by
    )
    select
      i.id, 'draft'::content_status, coalesce(i.kind, 'mcq-single'),
      i.subject_id, i.unit_id, i.topic_id, i.subtopic_id,
      coalesce(i.exam_ids, '{}'), coalesce(i.levels, '{}'),
      i.text, i.options, coalesce(i.correct_index, 0), coalesce(i.correct_indices, '{}'),
      coalesce(i.explanation, '{"en":"","hi":""}'::jsonb), coalesce(i.difficulty, 'medium'),
      i.marks, i.negative_marks,
      i.pyq_exam_id, i.pyq_year, i.pyq_session, i.pyq_paper_label, i.pyq_shift,
      i.pyq_question_number,
      i.source, coalesce(i.tags, '{}'), coalesce(i.concept_tags, '{}'),
      i.syllabus_ref, i.fingerprint, auth.uid()
    from incoming i
    -- Re-running a chunk after a network failure must not create a second copy.
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into inserted from written;

  update import_batches
     set accepted_rows = accepted_rows + inserted,
         status = 'committed',
         committed_at = now()
   where id = p_batch_id;

  insert into content_audit (entity, entity_id, action, to_status, actor, detail)
  values ('question', p_batch_id::text, 'imported', 'draft', auth.uid(),
          jsonb_build_object('inserted', inserted, 'batch', p_batch_id));

  return inserted;
end;
$$;

revoke all on function commit_import_batch(uuid, jsonb) from public;
grant execute on function commit_import_batch(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------- bulk actions

/**
 * Publishes or archives many questions at once.
 *
 * Delegates to `set_question_status` per row rather than issuing one UPDATE, so
 * the publish-time checks in 0006 apply to every question and the audit trigger
 * fires for each. Returns the ids that failed with the reason, because a bulk
 * action that silently drops the rows it could not handle is worse than one
 * that refuses outright.
 */
create or replace function set_question_status_bulk(
  p_ids text[],
  p_status content_status
)
returns table (id text, ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  q_id text;
begin
  if not is_staff() then
    raise exception 'only educators and admins may change content status';
  end if;

  foreach q_id in array p_ids loop
    begin
      perform set_question_status(q_id, p_status);
      id := q_id; ok := true; message := null;
    exception when others then
      id := q_id; ok := false; message := sqlerrm;
    end;
    return next;
  end loop;
end;
$$;

revoke all on function set_question_status_bulk(text[], content_status) from public;
grant execute on function set_question_status_bulk(text[], content_status) to authenticated;

-- --------------------------------------------------------------- duplicates

/**
 * Which of these fingerprints the library already holds.
 *
 * Called with one chunk of an upload at a time, so duplicate detection never
 * requires pulling the question bank into the browser.
 */
create or replace function find_duplicate_fingerprints(p_fingerprints text[])
returns table (
  fingerprint text,
  question_id text,
  pyq_exam_id text,
  pyq_year int,
  pyq_paper_label text,
  pyq_shift text,
  status content_status
)
language sql
security definer
set search_path = public
as $$
  select q.fingerprint, q.id, q.pyq_exam_id, q.pyq_year, q.pyq_paper_label, q.pyq_shift, q.status
    from questions q
   where q.fingerprint = any(p_fingerprints)
     and is_staff();
$$;

revoke all on function find_duplicate_fingerprints(text[]) from public;
grant execute on function find_duplicate_fingerprints(text[]) to authenticated;

-- ----------------------------------------------------------------- trends

/**
 * Questions per year for a topic or subject — the PYQ trend chart.
 *
 * Only years that actually have questions come back. A year with no data is
 * absent rather than zero, so the UI cannot mistake "not collected" for "not
 * asked".
 */
create or replace view pyq_year_counts as
select
  q.pyq_exam_id      as exam_id,
  q.pyq_year         as year,
  q.topic_id,
  t.subject_id,
  count(*)           as question_count
from questions q
join topics t on t.id = q.topic_id
where q.pyq_year is not null
  and q.status = 'published'
group by q.pyq_exam_id, q.pyq_year, q.topic_id, t.subject_id;

comment on view pyq_year_counts is
  'Published previous-year questions per exam, year and topic. Years with no '
  'questions are absent, never zero — missing means not collected.';
