-- Development seed: activity for one developer's own account.
--
-- WHY THIS EXISTS
--
-- The content tables are full — 2,100 questions, 29 exams, 344 topics, 57
-- papers — but every learner-owned table was empty, so the dashboard, the
-- profile and the performance screen all rendered honest zeros and there was
-- nothing to look at while building them. This fills the learner side only.
--
-- WHAT IT IS NOT
--
-- Not a fixture for tests, not something to run in production, and not
-- something to run for somebody else. Every statement is scoped by the email in
-- the `me` clause, so it can only ever touch the one account named there.
-- CHANGE THAT EMAIL TO YOUR OWN before running it, and do not let `me` return
-- more than one row.
--
-- The address is repeated inline rather than bound once with psql's \set,
-- because these files are pasted into the Supabase SQL editor, which speaks
-- Postgres and not psql — a meta-command there is a syntax error, and there is
-- a test in this repository that fails if one reappears.
--
-- Everything is derived from rows that already exist: attempts point at real
-- tests, bookmarks at real published questions, saved notes at real notes,
-- enrolments at real batches. No id is invented and no number is asserted that
-- the schema could not have produced.
--
-- Idempotent — `on conflict do nothing` throughout, so re-running adds nothing.
-- To undo it, see dev-learner-activity-undo.sql beside this file.

begin;

with me as (
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
),

-- Twenty-eight days of a believable habit: practice on most days, a rest every
-- Sunday and one midweek gap, so the streak calendar has a shape rather than
-- being a solid block that no real person produces.
days as (
  insert into public.activity_days (user_id, day)
  select me.id, d::date
  from me, generate_series(current_date - 27, current_date, interval '1 day') d
  where extract(dow from d) <> 0
    and (d::date - (current_date - 27)) % 7 <> 3
  on conflict do nothing
  returning 1
),

-- One graded attempt per test belonging to an exam this learner actually
-- chose, spaced three days apart so the history reads as a habit rather than
-- as everything having happened at once.
sat as (
  insert into public.attempts (
    user_id, test_id, started_at, submitted_at, remaining_ms, language,
    score, max_score, percentage, correct, incorrect, skipped, accuracy, total_time_ms
  )
  select
    (select id from me),
    t.id,
    now() - (n * interval '3 days'),
    now() - (n * interval '3 days') + (t.duration_minutes * interval '1 minute'),
    0,
    'hi',
    0, 0, 0, 0, 0, 0, 0,
    t.duration_minutes * 60000
  from (
    select t.*, row_number() over (order by t.id) as n
    from public.tests t
    where t.exam_id in (
      select exam_id from public.learner_exams where user_id = (select id from me)
    )
  ) t
  on conflict do nothing
  returning 1
),

marks as (
  insert into public.bookmarks (user_id, question_id)
  select (select id from me), q.id
  from public.questions q
  where q.status = 'published'
  order by q.id
  limit 12
  on conflict do nothing
  returning 1
),

kept as (
  insert into public.saved_notes (user_id, note_id)
  select (select id from me), n.id from public.notes n order by n.id limit 4
  on conflict do nothing
  returning 1
),

joined as (
  insert into public.enrolments (user_id, batch_id)
  select (select id from me), b.id from public.batches b order by b.id limit 2
  on conflict do nothing
  returning 1
)

select
  (select count(*) from days)   as activity_days,
  (select count(*) from sat)    as attempts,
  (select count(*) from marks)  as bookmarks,
  (select count(*) from kept)   as saved_notes,
  (select count(*) from joined) as enrolments;

commit;

-- The attempts above are deliberately scored zero.
--
-- Filling in a score means writing `attempt_answers`, and an answer row has to
-- name a question the test actually contains. Until migration 0027 repoints
-- `test_sections.question_ids` at questions that exist, there are none to name:
-- the sections point at an older bank whose ids no row carries. Run 0027 first,
-- then dev-learner-answers.sql, which grades these attempts from real answers
-- instead of declaring a percentage nobody computed.
