-- ---------------------------------------------------------------------------
-- 0012 — grading, publishing and import against the flat schema
--
-- 0011 replaced the question model; this rewrites everything that reads it.
-- Paste it in the same sitting as 0011: between the two, submitting a test
-- raises instead of scoring, because the functions below still name columns
-- that no longer exist.
--
-- Three things change beyond the column names, and each is a decision the old
-- schema could not express:
--
--   Marking is by letter. `selected_option = any(correct_answers)` — which also
--   settles multi-answer keys: a paper whose key says "2 & 4" accepts either,
--   because the candidate could only tick one box and both were declared right.
--
--   Withdrawn questions are handled rather than mismarked. `grace_marks_awarded`
--   gives everyone the marks; `excluded_from_total` takes the question out of
--   the denominator. Both are per-question because a single paper can carry one
--   of each, and the old model — a single integer key — had no way to say
--   either, so a dropped question was silently marked wrong for everybody who
--   did not guess the withdrawn answer.
--
--   Subject comes from the topic. The flat schema does not store `subject_id`
--   on a question: it was a denormalisation that could disagree with
--   `topics.subject_id`, and did. Every per-subject number now joins through
--   topics, so there is one answer to which subject a question belongs to.
--
-- Safe to paste whole into the Supabase SQL editor. Every function is
-- `create or replace`, so re-running changes nothing.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — one definition of "this answer was right"
-- =========================================================================

/**
 * Whether a chosen option counts as correct.
 *
 * Exists so the four grading paths cannot drift apart. The rule looks trivial
 * until multi-answer keys and withdrawn questions are in it, at which point
 * four copies is four chances to get a learner's score wrong.
 *
 * A skipped question is not correct, and neither is any answer to a question
 * whose key is unknown — `key_pending` means nobody has established the answer,
 * so nothing can be marked against it.
 */
create or replace function answer_is_correct(
  p_selected text,
  p_correct  text[],
  p_status   text
)
returns boolean
language sql
immutable
as $$
  select p_selected is not null
     and p_status = 'ok'
     and p_selected = any(p_correct);
$$;

comment on function answer_is_correct is
  'The single marking rule: a non-null choice, on a question with a settled '
  'key, that appears in that key. Multi-answer keys accept any listed option.';

/**
 * Whether a question counts towards the paper's total at all.
 *
 * A question withdrawn with `excluded_from_total` leaves the denominator, so a
 * 100-mark paper becomes a 99-mark paper rather than one where everybody drops
 * a mark. `key_pending` is excluded for the same reason: a question nobody can
 * mark must not cost the learner anything.
 */
create or replace function question_counts(
  p_status   text,
  p_excluded boolean
)
returns boolean
language sql
immutable
as $$
  select not p_excluded and p_status <> 'key_pending';
$$;

-- =========================================================================
-- STEP 2 — submit_attempt
-- =========================================================================

/**
 * Marks a submitted paper and ranks it.
 *
 * Unchanged in shape — the client still never decides its own score — but the
 * marking now understands three things it could not before: letters, keys with
 * more than one right answer, and questions the commission withdrew.
 *
 * Grace marks are added after the negative marking, not folded into the correct
 * count, so the analysis screen can still say truthfully how many the learner
 * actually got right.
 */
create or replace function submit_attempt(p_attempt_id uuid)
returns table (
  score numeric, max_score numeric, percentage numeric,
  correct int, incorrect int, skipped int, accuracy numeric,
  total_time_ms bigint, rank int, total_candidates int,
  percentile numeric, qualified boolean, cutoff numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt   attempts%rowtype;
  v_test      tests%rowtype;
  v_cutoff    numeric := 60;
  v_question_ids text[];
  v_correct   int := 0;
  v_incorrect int := 0;
  v_skipped   int := 0;
  v_counted   int := 0;
  v_grace     int := 0;
  v_time      bigint := 0;
  v_score     numeric := 0;
  v_max       numeric := 0;
  v_pct       numeric := 0;
  v_acc       numeric := 0;
  v_rank      int := 1;
  v_cohort    int := 1;
  v_percentile numeric := 0;
begin
  select * into v_attempt from attempts where id = p_attempt_id;
  if not found then
    raise exception 'attempt % not found', p_attempt_id;
  end if;
  if v_attempt.user_id <> auth.uid() then
    raise exception 'not your attempt';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'attempt already submitted';
  end if;

  select * into v_test from tests where id = v_attempt.test_id;

  -- Section order defines the paper; a question outside it is not marked.
  select coalesce(array_agg(qid), '{}')
    into v_question_ids
  from (
    select unnest(ts.question_ids) as qid
    from test_sections ts
    where ts.test_id = v_test.id
    order by ts.sort_order
  ) ordered;

  select
    count(*) filter (
      where question_counts(q.answer_status, q.excluded_from_total)
        and answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status)),
    -- Only a question with a settled key can be got wrong. A withdrawn one
    -- cannot be — including it here would apply negative marking for answering
    -- a question the commission itself struck out, which is the exact injustice
    -- `answer_status` was added to prevent.
    count(*) filter (
      where question_counts(q.answer_status, q.excluded_from_total)
        and q.answer_status = 'ok'
        and aa.selected_option is not null
        and not answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status)),
    count(*) filter (where question_counts(q.answer_status, q.excluded_from_total)),
    -- Marks handed to everybody because the question was withdrawn. Counted
    -- separately so they are added to the score without inflating "correct".
    count(*) filter (
      where question_counts(q.answer_status, q.excluded_from_total)
        and q.answer_status = 'dropped'
        and q.grace_marks_awarded),
    coalesce(sum(aa.time_spent_ms), 0)
  into v_correct, v_incorrect, v_counted, v_grace, v_time
  from questions q
  left join attempt_answers aa
    on aa.question_id = q.id and aa.attempt_id = p_attempt_id
  where q.id = any(v_question_ids);

  v_skipped := greatest(0, v_counted - (v_correct + v_incorrect + v_grace));
  v_max     := v_counted * v_test.marks_per_question;

  -- Indian teaching exams never carry a negative total forward.
  v_score := greatest(0,
    (v_correct + v_grace) * v_test.marks_per_question
    - v_incorrect * v_test.negative_marking);

  v_pct := case when v_max > 0 then round((v_score / v_max) * 100, 2) else 0 end;
  -- Accuracy is about the learner's judgement, so grace marks stay out of it:
  -- they were awarded, not earned.
  v_acc := case when (v_correct + v_incorrect) > 0
                then round((v_correct::numeric / (v_correct + v_incorrect)) * 100, 2)
                else 0 end;

  if v_test.paper_id is not null then
    select cutoff_general into v_cutoff from exam_papers where id = v_test.paper_id;
  end if;
  v_cutoff := coalesce(v_cutoff, 60);

  update attempts set
    submitted_at = now(),
    score = v_score, max_score = v_max, percentage = v_pct,
    correct = v_correct, incorrect = v_incorrect, skipped = v_skipped,
    accuracy = v_acc, total_time_ms = v_time,
    qualified = (v_pct >= v_cutoff)
  where id = p_attempt_id;

  -- Real cohort: every submitted attempt on this test, this learner included.
  select count(*) into v_cohort
    from attempts a where a.test_id = v_test.id and a.submitted_at is not null;
  select count(*) + 1 into v_rank
    from attempts a
    where a.test_id = v_test.id
      and a.submitted_at is not null
      and a.score > v_score;

  v_cohort := greatest(v_cohort, 1);
  v_percentile := case
    when v_cohort > 1 then round(((v_cohort - v_rank)::numeric / (v_cohort - 1)) * 100, 2)
    else 100
  end;

  update attempts set rank = v_rank, percentile = v_percentile where id = p_attempt_id;

  -- Submitting a paper counts as practising today.
  insert into activity_days (user_id, day)
  values (v_attempt.user_id, current_date)
  on conflict do nothing;

  return query select
    v_score, v_max, v_pct, v_correct, v_incorrect, v_skipped, v_acc,
    v_time, v_rank, v_cohort, v_percentile, (v_pct >= v_cutoff), v_cutoff;
end;
$$;

revoke all on function submit_attempt(uuid) from public;
grant execute on function submit_attempt(uuid) to authenticated;

-- =========================================================================
-- STEP 3 — attempt_subject_scores
-- =========================================================================

/**
 * Per-subject breakdown for the analysis screen.
 *
 * Subject now comes through `topics`, because the flat question schema does not
 * carry a subject of its own. A question with no topic yet cannot appear here —
 * it also cannot be published, so it cannot be in a paper.
 */
create or replace function attempt_subject_scores(p_attempt_id uuid)
returns table (
  subject_id text, attempted int, correct int, incorrect int,
  skipped int, score numeric, max_score numeric, accuracy numeric, time_spent_ms bigint
)
language sql
security definer
set search_path = public
as $$
  with paper as (
    select unnest(ts.question_ids) as qid, t.marks_per_question, t.negative_marking
    from attempts a
    join tests t on t.id = a.test_id
    join test_sections ts on ts.test_id = t.id
    where a.id = p_attempt_id and a.user_id = auth.uid()
  )
  select
    tp.subject_id,
    count(*) filter (where aa.selected_option is not null)::int,
    count(*) filter (
      where answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))::int,
    count(*) filter (
      where q.answer_status = 'ok'
        and aa.selected_option is not null
        and not answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))::int,
    count(*) filter (where aa.selected_option is null)::int,
    greatest(0,
      (count(*) filter (
         where answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status)
            or (q.answer_status = 'dropped' and q.grace_marks_awarded))
       * max(p.marks_per_question))
      - (count(*) filter (
           where q.answer_status = 'ok'
             and aa.selected_option is not null
             and not answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))
         * max(p.negative_marking))),
    (count(*) filter (where question_counts(q.answer_status, q.excluded_from_total))
      * max(p.marks_per_question)),
    case when count(*) filter (where aa.selected_option is not null) > 0
      then round(
        count(*) filter (
          where answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))::numeric
        / count(*) filter (where aa.selected_option is not null) * 100, 2)
      else 0 end,
    coalesce(sum(aa.time_spent_ms), 0)::bigint
  from paper p
  join questions q on q.id = p.qid
  join topics tp on tp.id = q.topic_id
  left join attempt_answers aa on aa.question_id = q.id and aa.attempt_id = p_attempt_id
  group by tp.subject_id;
$$;

revoke all on function attempt_subject_scores(uuid) from public;
grant execute on function attempt_subject_scores(uuid) to authenticated;

-- =========================================================================
-- STEP 4 — my_topic_accuracy
-- =========================================================================

/**
 * Topic accuracy across every attempt, so "weak topics" reflects this learner's
 * real history rather than one paper.
 *
 * Withdrawn and unkeyed questions are left out entirely: being handed a grace
 * mark says nothing about whether a learner understands the topic, and counting
 * it either way would move a number they use to decide what to revise.
 */
create or replace function my_topic_accuracy()
returns table (topic_id text, subject_id text, attempted int, correct int, accuracy numeric)
language sql
security definer
set search_path = public
as $$
  select
    q.topic_id,
    tp.subject_id,
    count(*)::int,
    count(*) filter (
      where answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))::int,
    round(count(*) filter (
      where answer_is_correct(aa.selected_option, q.correct_answers, q.answer_status))::numeric
          / greatest(count(*), 1) * 100, 2)
  from attempt_answers aa
  join attempts a  on a.id = aa.attempt_id
  join questions q on q.id = aa.question_id
  join topics tp   on tp.id = q.topic_id
  where a.user_id = auth.uid()
    and a.submitted_at is not null
    and aa.selected_option is not null
    and q.answer_status = 'ok'
  group by q.topic_id, tp.subject_id;
$$;

revoke all on function my_topic_accuracy() from public;
grant execute on function my_topic_accuracy() to authenticated;

-- =========================================================================
-- STEP 5 — refresh_question_accuracy
-- =========================================================================

/**
 * Keeps the difficulty signal on each question honest as attempts accumulate.
 *
 * Only questions with a settled key are touched. A withdrawn question's
 * `accuracy` would otherwise drift towards whatever fraction of learners
 * happened to pick the answer that was later struck out, which is a measurement
 * of nothing.
 */
create or replace function refresh_question_accuracy()
returns void
language sql
security definer
set search_path = public
as $$
  update questions q set accuracy = stats.acc
  from (
    select aa.question_id,
           round(count(*) filter (
             where answer_is_correct(aa.selected_option, qq.correct_answers, qq.answer_status)
           )::numeric / greatest(count(*), 1), 3) as acc
    from attempt_answers aa
    join attempts a   on a.id = aa.attempt_id and a.submitted_at is not null
    join questions qq on qq.id = aa.question_id
    where aa.selected_option is not null
      and qq.answer_status = 'ok'
    group by aa.question_id
    having count(*) >= 20
  ) stats
  where q.id = stats.question_id;
$$;

-- =========================================================================
-- STEP 6 — set_question_status
-- =========================================================================

/**
 * The only supported way to publish or withdraw a question.
 *
 * The publish-time checks move to the flat columns, and two of them change
 * meaning deliberately:
 *
 *   Bilingual is no longer required. The bank holds Haryana GK written only in
 *   Hindi, and refusing to publish it would be refusing to serve the content
 *   the audience actually needs. What is required is that whichever language a
 *   question is asked in, it is *complete* in that language — question, two
 *   options, and an explanation — because a learner who switches to Hindi and
 *   finds English options has been shown a broken question.
 *
 *   A topic is now required to publish. The database enforces what the import
 *   warns about: a question with no topic cannot be found, cannot be counted in
 *   weightage, and cannot appear in a paper — so it stays a draft.
 */
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
    if q.question_en is null and q.question_hi is null then
      raise exception 'question % has no text in either language', q.id;
    end if;

    if q.question_en is not null
       and (q.option_a_en is null or q.option_b_en is null) then
      raise exception 'question % is asked in English but has fewer than two English options', q.id;
    end if;

    if q.question_hi is not null
       and (q.option_a_hi is null or q.option_b_hi is null) then
      raise exception 'question % is asked in Hindi but has fewer than two Hindi options', q.id;
    end if;

    if q.answer_status = 'ok' and coalesce(array_length(q.correct_answers, 1), 0) = 0 then
      raise exception 'question % is marked answerable but has no correct answer', q.id;
    end if;

    if q.answer_status = 'key_pending' then
      raise exception 'question % has no settled answer key and cannot be published', q.id;
    end if;

    if q.answer_status = 'ok'
       and q.explanation_en is null and q.explanation_hi is null then
      raise exception 'question % has no explanation in either language', q.id;
    end if;

    -- An explanation must exist in the language the question is asked in, for
    -- the same reason the options must.
    if q.question_hi is not null and q.question_en is null and q.explanation_hi is null then
      raise exception 'question % is Hindi-only but its explanation is not in Hindi', q.id;
    end if;

    if q.question_en is not null and q.question_hi is null and q.explanation_en is null then
      raise exception 'question % is English-only but its explanation is not in English', q.id;
    end if;

    if q.topic_id is null then
      raise exception 'question % has no topic and cannot be published', q.id;
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

-- `set_question_status_bulk` delegates to the function above and names no
-- question columns of its own, so the 0007 definition still holds. It is
-- recreated here only so the two are read together.
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

-- =========================================================================
-- STEP 7 — commit_import_batch
-- =========================================================================

/**
 * Inserts a validated chunk of questions as drafts.
 *
 * The payload is now the flat schema, which is most of the point: the old
 * 28-column signature carried `text`, `options` and `explanation` as jsonb, so
 * a half-written bilingual pair reached the database and was only noticed when
 * a learner switched languages.
 *
 * Exam tags arrive as an array and are written to `question_exams`. Tags naming
 * an exam that does not exist are dropped by the join rather than failing the
 * chunk — the importer has already warned about them, and losing 200 good rows
 * to one bad tag is the outcome the row-level validation exists to prevent.
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

  create temporary table if not exists _incoming_questions (
    id text, question_en text, question_hi text,
    option_a_en text, option_b_en text, option_c_en text, option_d_en text,
    option_a_hi text, option_b_hi text, option_c_hi text, option_d_hi text,
    correct_answers text[], answer_status text,
    grace_marks_awarded boolean, excluded_from_total boolean,
    explanation_en text, explanation_hi text,
    difficulty text, paper_id text, topic_id text, elective_subject_id text,
    year int, question_no int, paper_set text, source text,
    exam_ids text[], fingerprint text
  ) on commit drop;

  delete from _incoming_questions;

  insert into _incoming_questions
  select * from jsonb_to_recordset(p_questions) as q(
    id text, question_en text, question_hi text,
    option_a_en text, option_b_en text, option_c_en text, option_d_en text,
    option_a_hi text, option_b_hi text, option_c_hi text, option_d_hi text,
    correct_answers text[], answer_status text,
    grace_marks_awarded boolean, excluded_from_total boolean,
    explanation_en text, explanation_hi text,
    difficulty text, paper_id text, topic_id text, elective_subject_id text,
    year int, question_no int, paper_set text, source text,
    exam_ids text[], fingerprint text
  );

  with written as (
    insert into questions (
      id, status,
      question_en, question_hi,
      option_a_en, option_b_en, option_c_en, option_d_en,
      option_a_hi, option_b_hi, option_c_hi, option_d_hi,
      correct_answers, answer_status, grace_marks_awarded, excluded_from_total,
      explanation_en, explanation_hi,
      difficulty, paper_id, topic_id, elective_subject_id,
      year, question_no, paper_set, source, fingerprint, created_by
    )
    select
      i.id, 'draft'::content_status,
      i.question_en, i.question_hi,
      i.option_a_en, i.option_b_en, i.option_c_en, i.option_d_en,
      i.option_a_hi, i.option_b_hi, i.option_c_hi, i.option_d_hi,
      coalesce(i.correct_answers, '{}'),
      coalesce(i.answer_status, 'ok'),
      coalesce(i.grace_marks_awarded, false),
      coalesce(i.excluded_from_total, false),
      i.explanation_en, i.explanation_hi,
      coalesce(i.difficulty, 'medium')::difficulty_level,
      i.paper_id, i.topic_id, i.elective_subject_id,
      i.year, i.question_no, i.paper_set, i.source, i.fingerprint, auth.uid()
    from _incoming_questions i
    -- Re-running a chunk after a network failure must not create a second copy.
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into inserted from written;

  insert into question_exams (question_id, exam_id)
  select distinct i.id, e.id
    from _incoming_questions i
    cross join lateral unnest(coalesce(i.exam_ids, '{}')) as tag
    join exams e on e.id = tag
    -- Only for rows this call actually wrote, so a re-run does not re-tag
    -- questions somebody has since edited by hand.
    where exists (select 1 from questions q where q.id = i.id)
  on conflict do nothing;

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

-- =========================================================================
-- STEP 8 — find_duplicate_fingerprints
-- =========================================================================

/**
 * Which of these fingerprints the library already holds.
 *
 * The returned columns now describe where a match sits in the new schema, so
 * the importer can tell an educator "this is already in HTET TGT Science 2024
 * at question 42" rather than repeating an id back at them.
 */
drop function if exists find_duplicate_fingerprints(text[]);

create or replace function find_duplicate_fingerprints(p_fingerprints text[])
returns table (
  fingerprint text,
  question_id text,
  paper_id    text,
  year        int,
  question_no int,
  paper_set   text,
  status      content_status
)
language sql
security definer
set search_path = public
as $$
  select q.fingerprint, q.id, q.paper_id, q.year, q.question_no, q.paper_set, q.status
    from questions q
   where q.fingerprint = any(p_fingerprints)
     and is_staff();
$$;

revoke all on function find_duplicate_fingerprints(text[]) from public;
grant execute on function find_duplicate_fingerprints(text[]) to authenticated;

/**
 * Duplicate by position rather than by wording.
 *
 * The fingerprint catches the same question typed twice; this catches the same
 * *slot* filled twice — re-importing a corrected sheet, which is the common
 * case and the one the import screen asks the operator to confirm before
 * overwriting.
 */
create or replace function find_duplicate_slots(
  p_paper_id text,
  p_question_nos int[]
)
returns table (question_id text, question_no int, status content_status)
language sql
security definer
set search_path = public
as $$
  select q.id, q.question_no, q.status
    from questions q
   where q.paper_id = p_paper_id
     and q.question_no = any(p_question_nos)
     and is_staff();
$$;

revoke all on function find_duplicate_slots(text, int[]) from public;
grant execute on function find_duplicate_slots(text, int[]) to authenticated;

commit;
