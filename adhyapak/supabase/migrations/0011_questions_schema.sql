-- ---------------------------------------------------------------------------
-- 0011 — the flat question schema
--
-- Replaces the jsonb question model with flat, per-language columns and a
-- letter-based answer key. Three things forced this:
--
--   * `text`/`options`/`explanation` were jsonb, so "questions missing a Hindi
--     explanation" could not be asked without unpacking every row, and nothing
--     stopped a half-written bilingual pair from being stored.
--   * `correct_index int` cannot express a paper whose answer key says "2 & 4",
--     nor one where a question was dropped after the key was challenged. Both
--     are ordinary events in Indian recruitment exams, and both were previously
--     unrepresentable — so they were entered as single answers and silently
--     marked wrong for everybody who did not guess the withdrawn option.
--   * Which exams a question serves is a many-to-many fact. `exam_ids text[]`
--     carried no foreign key, so a misspelled slug was accepted in silence and
--     the question simply stopped appearing for that exam.
--
-- ===========================================================================
-- THIS DESTROYS THE EXISTING QUESTION BANK. PERMANENTLY.
--
-- `drop table questions cascade` takes every row with it, and the cascade takes
-- every bookmark and every answered question in every past attempt along too.
-- There is no rename, no legacy copy, and nothing in this file can bring any of
-- it back. The only surviving copy of the 907-row live bank is the JSON export
-- taken before this was written. Do not paste this without that file in hand.
--
-- The new table is created empty and stays empty until something imports into
-- it: no seed, no conversion, no bundled questions.
-- ===========================================================================
--
-- Paste order: this file, then 0012, in the same sitting. Seven functions read
-- columns this migration removes and fail at their next call rather than at
-- migration time.
--
-- Safe to paste whole into the Supabase SQL editor: one statement per step, no
-- psql meta-commands. Re-running drops and recreates an empty table, which is a
-- no-op on an empty bank and a second deletion on a full one.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — vocabulary the new table needs
-- =========================================================================

-- Difficulty was a text column with a check constraint. It is a closed set that
-- the importer, the practice filters and the analytics all branch on, so it
-- earns a type: a typo now fails at the boundary rather than becoming a fourth
-- difficulty nobody queries for.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'difficulty_level') then
    create type difficulty_level as enum ('easy', 'medium', 'hard');
  end if;
end;
$$;

-- Which post a paper recruits for — PRT, TGT, PGT, "Paper 1", whatever the
-- board prints on it.
--
-- This existed only in TypeScript (`ExamPaper.post`) and never reached the
-- database, which is why the importer could not validate "Paper not found under
-- TGT": there was nothing to match against. Deliberately separate from `level`.
-- `level` is the vocabulary shared across exams — CTET Paper 1 and HTET Level 1
-- are both `primary` — while the post code is what the candidate and the answer
-- key actually call it. Neither is derivable from the other for every exam.
--
-- Free text, with no whitelist. Boards invent their own codes, and a
-- database-level list would reject a valid new exam until somebody shipped a
-- migration to widen it. Nothing is lost: the importer's check is stronger than
-- a whitelist could be, because it resolves the post against the papers that
-- actually exist for that exam. A whitelist would have passed a spelling that
-- matches no paper.
alter table exam_papers add column if not exists post text;

create index if not exists exam_papers_post_idx on exam_papers(exam_id, post)
  where post is not null;

comment on column exam_papers.post is
  'The teaching post this paper recruits for — PRT, TGT, PGT and whatever else '
  'a board calls it. Free text on purpose: the importer validates it against '
  'real papers, which a fixed list cannot. Null for exams that number papers.';

-- =========================================================================
-- STEP 2 — remove the old bank
-- =========================================================================

-- Views bind to the table and would block the drop. Both are recreated against
-- the new shape in step 7.
drop view if exists pyq_year_counts;
drop view if exists pyq_topic_frequency;

-- CASCADE also removes:
--   * bookmarks.question_id      — every saved question, for every learner
--   * attempt_answers.question_id — every answer in every past attempt
--
-- Both foreign keys are recreated in step 6 against the new table, but the rows
-- they pointed at are gone and are not coming back. `attempts` survives with
-- its totals; the per-question detail underneath does not, so the analysis
-- screen for an old attempt will show a submitted paper with no questions in it.
drop table if exists questions cascade;

-- =========================================================================
-- STEP 3 — the new table
-- =========================================================================

create table questions (
  id            text primary key,

  -- ------------------------------------------------------------ content
  --
  -- Nullable per language, because the bank genuinely holds both: a Haryana GK
  -- question written only in Hindi is not a defective English question. What is
  -- forbidden is a question with no text at all, and an option with no text in
  -- any language.
  question_en   text,
  question_hi   text,

  option_a_en   text,
  option_b_en   text,
  option_c_en   text,
  option_d_en   text,
  option_a_hi   text,
  option_b_hi   text,
  option_c_hi   text,
  option_d_hi   text,

  -- ------------------------------------------------------------- answers
  --
  -- Letters rather than indexes, because letters are what the answer key, the
  -- candidate and the coaching sheet all use. An index is a fact about our
  -- storage order; a letter is a fact about the paper.
  --
  -- An array because "2 & 4" is a real answer key. Empty when the answer is not
  -- available — which `answer_status` explains, rather than leaving the reader
  -- to guess whether the key is missing or the question was withdrawn.
  correct_answers text[] not null default '{}',
  answer_status   text   not null default 'ok'
                    check (answer_status in ('ok', 'dropped', 'key_pending')),

  -- A question the commission withdrew still has to be graded, and the two
  -- conventions differ: some boards award the marks to everyone, others strike
  -- the question from the total. Both are recorded because a single paper can
  -- do one of each, and one boolean would force one convention onto every exam.
  grace_marks_awarded boolean not null default false,
  excluded_from_total boolean not null default false,

  -- --------------------------------------------------------- explanation
  explanation_en text,
  explanation_hi text,

  difficulty     difficulty_level not null,

  -- ------------------------------------------------- placement in the syllabus
  --
  -- `paper_id` is provenance: the paper this question was actually asked in.
  -- Nullable, and deliberately so. Most of a teaching-exam bank is syllabus
  -- content shared across many exams and was never asked in one particular
  -- paper; forcing a paper on it would be inventing a fact. Where a question
  -- did come from a paper, this says which, and question_no/paper_set/year
  -- describe where in it.
  --
  -- Which exams a question is *useful* for is a different relationship
  -- altogether, and lives in `question_exams`.
  paper_id      text references exam_papers(id) on delete set null,

  -- Null is allowed so an import is never rejected for a missing topic — the
  -- row lands as a draft with a warning instead. Publishing without one is
  -- blocked in `set_question_status`, not here, because a draft is exactly
  -- where an unclassified question belongs while somebody sorts it out.
  topic_id      text references topics(id),

  -- Which elective a question belongs to, for the HTET papers whose subject is
  -- whichever one the candidate applied in. Null for the common blocks — CDP,
  -- Hindi and Reasoning are the same paper for every candidate. Carried over
  -- from 0009; without it the twelve TGT variants collapse back into one.
  elective_subject_id text references subjects(id),

  year          int,

  -- ------------------------------------------------------- internal only
  --
  -- None of this is ever rendered to a learner. It is what an educator needs to
  -- trace a question back to the sheet it came from.
  question_no   int,
  -- Which printed set the question came from — Set A/B/C/D of the same paper,
  -- which shuffle the order. NOT the option labels A/B/C/D in `correct_answers`;
  -- the two are unrelated and the names collide by accident of the alphabet.
  paper_set     text,
  source        text,

  status        content_status not null default 'draft',

  -- Normalised question text, for duplicate detection. Written by the
  -- application, which owns the normalisation rules (content/duplicates.ts).
  fingerprint   text,

  -- Not content: measurements. The analysis screens read them and
  -- `refresh_question_accuracy` writes them.
  avg_time_seconds int not null default 40,
  accuracy      numeric(4,3) not null default 0.5,

  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- constraints
--
-- Added separately and by name so re-running neither duplicates them nor
-- silently skips one.

do $$
begin
  -- A question has to be asked in at least one language.
  if not exists (select 1 from pg_constraint where conname = 'questions_has_text') then
    alter table questions add constraint questions_has_text
      check (question_en is not null or question_hi is not null);
  end if;

  -- A question needs two answerable options — text in either language, because
  -- the apps fall back through `inLang` and an option carried only in English
  -- still renders for a Hindi reader.
  --
  -- Deliberately weaker than "options in the same language as the question",
  -- which is what this was first specified as. The real HTET CDP sheet is
  -- bilingual in its questions and explanations and English-only in its
  -- options, because the options are proper nouns — "Piaget – Cognitive
  -- Development Theory" is not translated by anybody. That rule rejected 630
  -- correct rows. The importer still reports the gap, as a warning, so a
  -- half-finished translation is visible without being thrown away.
  if not exists (select 1 from pg_constraint where conname = 'questions_two_options') then
    alter table questions add constraint questions_two_options
      check (
        (option_a_en is not null or option_a_hi is not null)
        and
        (option_b_en is not null or option_b_hi is not null)
      );
  end if;

  -- Only real option labels.
  if not exists (select 1 from pg_constraint where conname = 'questions_answers_are_labels') then
    alter table questions add constraint questions_answers_are_labels
      check (correct_answers <@ array['A','B','C','D']::text[]);
  end if;

  -- 'ok' means an answer is known; the other two mean it is not. Allowing an
  -- 'ok' question with an empty key is how a paper ships with unanswerable
  -- questions that look fine in the list view.
  if not exists (select 1 from pg_constraint where conname = 'questions_answer_status_agrees') then
    alter table questions add constraint questions_answer_status_agrees
      check (
        (answer_status = 'ok'  and coalesce(array_length(correct_answers, 1), 0) >= 1)
        or
        (answer_status <> 'ok' and coalesce(array_length(correct_answers, 1), 0) = 0)
      );
  end if;

  -- Every letter in the key must point at an option that exists. This is the
  -- check that catches a key of 'C' on a two-option question — the defect that
  -- reads as "the app marked me wrong for the right answer".
  if not exists (select 1 from pg_constraint where conname = 'questions_answers_have_options') then
    alter table questions add constraint questions_answers_have_options
      check (
        (not ('A' = any(correct_answers)) or option_a_en is not null or option_a_hi is not null)
        and
        (not ('B' = any(correct_answers)) or option_b_en is not null or option_b_hi is not null)
        and
        (not ('C' = any(correct_answers)) or option_c_en is not null or option_c_hi is not null)
        and
        (not ('D' = any(correct_answers)) or option_d_en is not null or option_d_hi is not null)
      );
  end if;

  -- An explanation is required when the answer is known. It is not required
  -- when it is not: writing an explanation for a question whose correct answer
  -- nobody has established would be inventing reasoning to fit a guess.
  if not exists (select 1 from pg_constraint where conname = 'questions_explained_when_answered') then
    alter table questions add constraint questions_explained_when_answered
      check (
        answer_status <> 'ok'
        or explanation_en is not null
        or explanation_hi is not null
      );
  end if;

  -- Years outside this range are transcription errors, not history.
  if not exists (select 1 from pg_constraint where conname = 'questions_year_sane') then
    alter table questions add constraint questions_year_sane
      check (year is null or (year between 2000 and 2030));
  end if;

  -- Grace marks and exclusion only mean anything for a question that was
  -- actually withdrawn.
  if not exists (select 1 from pg_constraint where conname = 'questions_grace_needs_dropped') then
    alter table questions add constraint questions_grace_needs_dropped
      check (
        answer_status = 'dropped'
        or (grace_marks_awarded = false and excluded_from_total = false)
      );
  end if;
end;
$$;

-- ------------------------------------------------------------------ indexes

-- The two the practice filters actually use, both partial on published: the
-- bank will hold far more drafts than live questions, and a learner never sees
-- one.
create index if not exists questions_paper_difficulty_idx
  on questions(paper_id, difficulty) where status = 'published';

create index if not exists questions_topic_live_idx
  on questions(topic_id) where status = 'published';

create index if not exists questions_status_idx      on questions(status);
create index if not exists questions_fingerprint_idx on questions(fingerprint)
  where fingerprint is not null;
create index if not exists questions_elective_idx    on questions(elective_subject_id)
  where elective_subject_id is not null;
create index if not exists questions_year_idx        on questions(year)
  where year is not null;

-- Duplicate detection by position in a paper, which is what the importer warns
-- on. Not unique: re-importing a corrected sheet has to be allowed to overwrite.
create index if not exists questions_paper_number_idx
  on questions(paper_id, question_no)
  where paper_id is not null and question_no is not null;

-- =========================================================================
-- STEP 4 — which exams a question is useful for
-- =========================================================================

-- Replaces `exam_ids text[]`.
--
-- The array had no foreign key, so a misspelled slug was accepted in silence
-- and the question stopped appearing for that exam — a failure with no error
-- and no way to notice it except by counting. A junction row cannot be written
-- for an exam that does not exist.
--
-- This is applicability, not provenance: "a CDP question worth practising for
-- CTET" is a different claim from "this was asked in CTET Dec 2022", and only
-- the second belongs in `questions.paper_id`.
create table if not exists question_exams (
  question_id text not null references questions(id) on delete cascade,
  exam_id     text not null references exams(id)     on delete cascade,
  primary key (question_id, exam_id)
);

create index if not exists question_exams_exam_idx on question_exams(exam_id);

comment on table question_exams is
  'Which exams a question is worth practising for. Many-to-many: most of a '
  'teaching-exam bank is syllabus content shared across every such exam. '
  'Distinct from questions.paper_id, which records the paper it was asked in.';

-- =========================================================================
-- STEP 5 — what the learner picked
-- =========================================================================

-- `selected_index int` becomes `selected_option text`, holding the same letters
-- the answer key uses. One vocabulary across the system: grading compares
-- `selected_option = any(correct_answers)` rather than translating between an
-- index and a letter at every call site, which is where an off-by-one would
-- eventually mark a right answer wrong.
--
-- Renamed rather than reused because the column no longer holds an index, and a
-- column called `selected_index` containing 'B' is a trap for the next reader.
--
-- No conversion of old values: the cascade in step 2 already emptied this table.
alter table attempt_answers add column if not exists selected_option text;
alter table attempt_answers drop column if exists selected_index;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempt_answers_option_is_label') then
    alter table attempt_answers
      add constraint attempt_answers_option_is_label
      check (selected_option is null or selected_option in ('A','B','C','D'));
  end if;
end;
$$;

comment on column attempt_answers.selected_option is
  'The option label the learner chose — A, B, C or D. Null means skipped. Same '
  'vocabulary as questions.correct_answers, so grading is a direct comparison.';

-- =========================================================================
-- STEP 6 — re-point the learner tables
-- =========================================================================

-- The cascade in step 2 dropped both constraints along with the old table.
alter table bookmarks
  add constraint bookmarks_question_id_fkey
  foreign key (question_id) references questions(id) on delete cascade;

alter table attempt_answers
  add constraint attempt_answers_question_id_fkey
  foreign key (question_id) references questions(id) on delete cascade;

-- =========================================================================
-- STEP 7 — row-level security, grants, triggers, views
-- =========================================================================

-- Identical to what 0002 and 0006 gave the old table: world-readable once
-- published, staff see every state, staff alone write. A new table starts with
-- RLS off, so omitting this would publish the entire draft bank.
alter table questions      enable row level security;
alter table question_exams enable row level security;

drop policy if exists "questions_public_read" on questions;
create policy "questions_public_read" on questions
  for select using (status = 'published' or is_staff());

drop policy if exists "questions_staff_write" on questions;
create policy "questions_staff_write" on questions
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- Educators may edit their own uploads even before a role is granted, which is
-- what makes the Studio work on a fresh account.
drop policy if exists "questions_owner_write" on questions;
create policy "questions_owner_write" on questions
  for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- A tag is readable exactly when its question is.
drop policy if exists "question_exams_public_read" on question_exams;
create policy "question_exams_public_read" on question_exams
  for select using (
    exists (
      select 1 from questions q
       where q.id = question_exams.question_id
         and (q.status = 'published' or is_staff())
    )
  );

drop policy if exists "question_exams_staff_write" on question_exams;
create policy "question_exams_staff_write" on question_exams
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- Supabase grants its API roles blanket table privileges and leaves RLS as the
-- gate; a new table has to match or it would be unreadable.
grant select on questions, question_exams to anon, authenticated;
grant insert, update, delete on questions, question_exams to authenticated;

-- The triggers from 0005, which went with the old table.
drop trigger if exists questions_touch_updated_at on questions;
create trigger questions_touch_updated_at
  before update on questions
  for each row execute function touch_updated_at();

-- `log_question_status_change` is 0005's, and the name matters: it is what the
-- function is actually called. An earlier draft of this file invented
-- `audit_content_status`, which reads like the right name and does not exist,
-- so the whole migration failed here at the last step.
drop trigger if exists questions_audit_status on questions;
create trigger questions_audit_status
  after update on questions
  for each row execute function log_question_status_change();

-- ------------------------------------------------------------------- views

-- Published previous-year questions per exam, year and topic. Years with no
-- questions are absent, never zero — missing means not collected.
--
-- Driven by question_exams rather than a single exam column, so a question
-- shared across fourteen exams counts once for each, which is what the trend
-- chart is asking about.
create or replace view pyq_year_counts as
select
  qe.exam_id,
  q.year,
  q.topic_id,
  t.subject_id,
  count(*) as question_count
from questions q
join question_exams qe on qe.question_id = q.id
join topics t          on t.id = q.topic_id
where q.year is not null
  and q.status = 'published'
group by qe.exam_id, q.year, q.topic_id, t.subject_id;

comment on view pyq_year_counts is
  'Published previous-year questions per exam, year and topic. Years with no '
  'questions are absent, never zero — missing means not collected.';

-- How often each topic has appeared in real papers. Drives the weightage badges
-- and the "high yield" ordering, replacing the hand-written weightage numbers.
create or replace view pyq_topic_frequency as
select
  qe.exam_id,
  q.topic_id,
  t.subject_id,
  count(*)                as question_count,
  min(q.year)             as first_seen,
  max(q.year)             as last_seen,
  count(distinct q.year)  as years_seen
from questions q
join question_exams qe on qe.question_id = q.id
join topics t          on t.id = q.topic_id
where q.year is not null
  and q.status = 'published'
group by qe.exam_id, q.topic_id, t.subject_id;

comment on view pyq_topic_frequency is
  'How often each topic has appeared in real papers. Drives weightage badges and '
  'the "high yield" ordering, replacing the hand-written weightage numbers.';

commit;
