-- 0029 — point every test section at questions that exist
--
-- WHAT WAS WRONG
--
-- `test_sections.question_ids` held ids from the original bundled bank —
-- 'q-cdp-001', 'q-cdp-002', and so on. The questions actually in the database
-- arrived through the importer and carry ids of the form 'demo-ctet-2018-14'.
-- The two sets have never overlapped: expanding every section's array gives 163
-- ids, and exactly zero of them match a row in `questions`.
--
-- So every test in the database was an empty paper. `testQuestionCount` counted
-- ids rather than questions, which is why the catalogue still advertised "15
-- Questions" for a section that could not produce one, and the emptiness only
-- showed at the moment somebody pressed Start.
--
-- WHAT THIS DOES
--
-- Repoints each section at published questions belonging to that section's own
-- subject, keeping the number of questions the section already declared — a
-- 15-question CDP section becomes 15 real CDP questions. Sections whose subject
-- has no published questions are left exactly as they are rather than emptied,
-- so this can only improve a section, never blank one.
--
-- The choice is ordered by `md5(section_id || question_id)` rather than by
-- random(): re-running the migration selects the same questions again, so two
-- environments that apply it end up with the same papers, and a re-run is a
-- no-op instead of a reshuffle that invalidates everybody's saved attempts.
--
-- Idempotent. Safe to run more than once.

begin;

with wanted as (
  select
    s.id            as section_id,
    s.subject_id,
    coalesce(array_length(s.question_ids, 1), 0) as want
  from public.test_sections s
  where coalesce(array_length(s.question_ids, 1), 0) > 0
),
pool as (
  select
    w.section_id,
    w.want,
    q.id as question_id,
    row_number() over (
      partition by w.section_id
      order by md5(w.section_id::text || q.id)
    ) as rn
  from wanted w
  join public.topics    t on t.subject_id = w.subject_id
  join public.questions q on q.topic_id   = t.id
                         and q.status     = 'published'
),
chosen as (
  select
    section_id,
    array_agg(question_id order by question_id) as ids,
    max(want)                                   as want
  from pool
  where rn <= want
  group by section_id
)
update public.test_sections s
set question_ids = c.ids
from chosen c
where c.section_id = s.id
  -- Never trade a full section for a shorter one: if the subject could not
  -- supply as many questions as the section declares, leave the section alone
  -- and let the catalogue keep saying what it always said.
  and array_length(c.ids, 1) = c.want
  and s.question_ids is distinct from c.ids;

commit;

-- Check afterwards — every row should report matched = declared:
--
--   select s.test_id, s.subject_id,
--          coalesce(array_length(s.question_ids,1),0) as declared,
--          count(q.id)                                as matched
--   from public.test_sections s
--   cross join lateral unnest(s.question_ids) as u(qid)
--   left join public.questions q on q.id = u.qid
--   group by s.id, s.test_id, s.subject_id
--   order by matched - coalesce(array_length(s.question_ids,1),0), s.test_id;
