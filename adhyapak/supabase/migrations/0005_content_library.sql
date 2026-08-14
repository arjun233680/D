-- ---------------------------------------------------------------------------
-- 0005 — the content library
--
-- The schema up to 0004 stores exactly what the seed data happened to contain:
-- a question knows its subject and topic, and remembers where it came from in a
-- free-text column called previous_year holding prose like
-- 'CTET Dec 2022 Paper 1'. That is readable and useless — you cannot ask it for
-- 2023 papers, count how often a topic repeats, or separate the two shifts of
-- one exam without parsing English back apart.
--
-- This migration adds what a real question bank needs:
--
--   * the two missing levels of syllabus — units above topics, subtopics below
--   * structured previous-year metadata, replacing the prose column
--   * an editorial lifecycle, so nothing reaches a learner unreviewed
--   * staging tables, so a bulk import can be inspected before it is committed
--
-- It is additive. Every existing row keeps working: status defaults to
-- 'published' so today's content stays live, and previous_year is preserved
-- rather than dropped, because prose cannot be parsed into metadata without
-- guessing and a wrong guess is worse than a null.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------- lifecycle

do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'review', 'published', 'archived');
  end if;
end $$;

-- ------------------------------------------------------------- hierarchy

-- A unit/chapter sits between a subject and its topics. Optional: an exam whose
-- syllabus is a flat topic list simply has none.
create table if not exists units (
  id          text primary key,
  subject_id  text not null references subjects(id) on delete cascade,
  name        jsonb not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists units_subject_idx on units(subject_id, sort_order);

alter table topics add column if not exists unit_id text references units(id) on delete set null;
create index if not exists topics_unit_idx on topics(unit_id);

-- The finest addressable level: 'Mole Concept' inside 'Some Basic Concepts'.
create table if not exists subtopics (
  id          text primary key,
  topic_id    text not null references topics(id) on delete cascade,
  name        jsonb not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists subtopics_topic_idx on subtopics(topic_id, sort_order);

-- ------------------------------------------------------- questions, extended

alter table questions add column if not exists status content_status not null default 'published';
alter table questions add column if not exists kind text not null default 'mcq-single';
alter table questions add column if not exists unit_id text references units(id) on delete set null;
alter table questions add column if not exists subtopic_id text references subtopics(id) on delete set null;
alter table questions add column if not exists levels text[] not null default '{}';

-- Structured previous-year metadata. Null for anything that is not a PYQ.
alter table questions add column if not exists pyq_exam_id text references exams(id) on delete set null;
alter table questions add column if not exists pyq_year int;
alter table questions add column if not exists pyq_session text;
alter table questions add column if not exists pyq_paper_id text;
alter table questions add column if not exists pyq_paper_label text;
alter table questions add column if not exists pyq_shift text;
alter table questions add column if not exists pyq_question_number int;

alter table questions add column if not exists marks numeric(5,2);
alter table questions add column if not exists negative_marks numeric(5,2);
alter table questions add column if not exists source text;
alter table questions add column if not exists tags text[] not null default '{}';
alter table questions add column if not exists concept_tags text[] not null default '{}';
alter table questions add column if not exists syllabus_ref text;
alter table questions add column if not exists updated_at timestamptz not null default now();

-- Answers live in an array so a multiple-correct question does not need a second
-- table. correct_index stays as the single-answer fast path the app already reads.
alter table questions add column if not exists correct_indices int[] not null default '{}';
update questions set correct_indices = array[correct_index] where correct_indices = '{}';

alter table questions drop constraint if exists questions_pyq_year_sane;
alter table questions add constraint questions_pyq_year_sane
  check (pyq_year is null or (pyq_year between 1990 and extract(year from now())::int + 1));

alter table questions drop constraint if exists questions_marks_positive;
alter table questions add constraint questions_marks_positive
  check (marks is null or marks > 0);

alter table questions drop constraint if exists questions_negative_marks_sane;
alter table questions add constraint questions_negative_marks_sane
  check (negative_marks is null or negative_marks >= 0);

-- The indexes that make PYQ analysis possible at all.
create index if not exists questions_status_idx      on questions(status);
create index if not exists questions_pyq_year_idx    on questions(pyq_exam_id, pyq_year)
  where pyq_year is not null;
create index if not exists questions_unit_idx        on questions(unit_id);
create index if not exists questions_subtopic_idx    on questions(subtopic_id);
create index if not exists questions_concept_idx     on questions using gin(concept_tags);
-- Practice reads published questions for one topic; this is that query.
create index if not exists questions_live_topic_idx  on questions(topic_id)
  where status = 'published';

-- ----------------------------------------------------------- notes, extended

alter table notes add column if not exists status content_status not null default 'published';
alter table notes add column if not exists unit_id text references units(id) on delete set null;
alter table notes add column if not exists subtopic_id text references subtopics(id) on delete set null;
alter table notes add column if not exists levels text[] not null default '{}';
alter table notes add column if not exists version int not null default 1;
alter table notes add column if not exists sort_order int not null default 0;
alter table notes add column if not exists source text;
create index if not exists notes_status_idx on notes(status);

alter table videos add column if not exists status content_status not null default 'published';
alter table tests  add column if not exists status content_status not null default 'published';

-- ------------------------------------------------------------ import staging
--
-- A bulk import lands here first. The rows are inspected, corrected and only
-- then promoted into `questions`, so a 4,000-row file with 12 bad rows does not
-- become 12 bad questions in production — or block the other 3,988.

create table if not exists import_batches (
  id            uuid primary key default gen_random_uuid(),
  filename      text,
  kind          text not null default 'questions'
                  check (kind in ('questions', 'notes', 'tests')),
  status        text not null default 'pending'
                  check (status in ('pending', 'validated', 'committed', 'discarded')),
  total_rows    int not null default 0,
  accepted_rows int not null default 0,
  rejected_rows int not null default 0,
  -- The full report from the importer, kept so a rejection can be explained
  -- long after the upload.
  report        jsonb,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  committed_at  timestamptz
);
create index if not exists import_batches_creator_idx on import_batches(created_by, created_at desc);

create table if not exists import_rows (
  id          bigserial primary key,
  batch_id    uuid not null references import_batches(id) on delete cascade,
  -- 1-based line number in the uploaded file, so an error names the row the
  -- contributor can actually see in their spreadsheet.
  row_number  int not null,
  raw         jsonb not null,
  mapped      jsonb,
  valid       boolean not null default false,
  issues      jsonb not null default '[]'::jsonb
);
create index if not exists import_rows_batch_idx on import_rows(batch_id, row_number);
create index if not exists import_rows_invalid_idx on import_rows(batch_id) where not valid;

-- --------------------------------------------------------------- audit trail
--
-- Who published what, and when. Education content that turns out to be wrong
-- has to be traceable to the change that introduced it.

create table if not exists content_audit (
  id          bigserial primary key,
  entity      text not null check (entity in ('question', 'note', 'video', 'test')),
  entity_id   text not null,
  action      text not null check (action in ('created', 'updated', 'status_changed', 'imported')),
  from_status content_status,
  to_status   content_status,
  actor       uuid references auth.users(id) on delete set null,
  detail      jsonb,
  at          timestamptz not null default now()
);
create index if not exists content_audit_entity_idx on content_audit(entity, entity_id, at desc);

-- --------------------------------------------------------------- maintenance

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists questions_touch_updated_at on questions;
create trigger questions_touch_updated_at
  before update on questions
  for each row execute function touch_updated_at();

-- Records every status transition without the application having to remember to.
create or replace function log_question_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into content_audit (entity, entity_id, action, from_status, to_status, actor)
    values ('question', new.id, 'status_changed', old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists questions_audit_status on questions;
create trigger questions_audit_status
  after update on questions
  for each row execute function log_question_status_change();

-- ------------------------------------------------------------------ queries
--
-- PYQ analysis, as a view rather than as application code, so the web app, the
-- mobile app and any future admin tool all get the same numbers.

create or replace view pyq_topic_frequency as
select
  q.pyq_exam_id            as exam_id,
  q.topic_id,
  t.subject_id,
  count(*)                 as question_count,
  min(q.pyq_year)          as first_seen,
  max(q.pyq_year)          as last_seen,
  count(distinct q.pyq_year) as years_seen
from questions q
join topics t on t.id = q.topic_id
where q.pyq_year is not null
  and q.status = 'published'
group by q.pyq_exam_id, q.topic_id, t.subject_id;

comment on view pyq_topic_frequency is
  'How often each topic has appeared in real papers. Drives weightage badges and '
  'the "high yield" ordering, replacing the hand-written weightage numbers.';
