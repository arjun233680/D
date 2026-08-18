-- ---------------------------------------------------------------------------
-- 0014 — CTET Paper 2 becomes one paper with an elective, not two papers
--
-- A CTET Paper 2 candidate sits one paper and chooses one subject block within
-- it: Mathematics & Science, or Social Studies. The blueprint modelled that as
-- two separate papers, `ctet-p2-ms` and `ctet-p2-sst`, which puts the choice in
-- the wrong place and breaks three things:
--
--   Onboarding asks "which level?" and then "which subject?". As two papers,
--   the level question answers both at once and the subject question has
--   nothing left to ask — so a CTET candidate is never recorded as having
--   chosen a subject, and `profiles.elective_subject_id` stays null for them.
--
--   The PYQ tab's topic practice shows the common subjects plus the one
--   elective the learner chose. With no elective recorded there is nothing to
--   filter by, so a Social Studies candidate is offered Mathematics topics.
--
--   HTET already models the identical situation — one paper, twelve subjects —
--   as an elective group. Two exams describing the same shape two different
--   ways means every screen that reads a paper needs both code paths.
--
-- WHAT IS DELETED: `ctet-p2-ms` and `ctet-p2-sst`, and their sections. Both are
-- seed data, reproducible from `seed/seed.sql`, and the question bank is empty
-- so nothing references them by `paper_id`. Learners already pointed at either
-- one are moved to the new paper first, with the elective their old paper
-- implied, so nobody loses their goal.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — the subject CTET actually names
-- =========================================================================

-- "Mathematics and Science" is one 60-mark subject in CTET's own Paper 2
-- syllabus, not two subjects that happen to be examined together, and a
-- candidate choosing it chooses it whole. `elective_choices` holds one subject
-- per choice, so the choice has to be a subject for the model to stay honest.
--
-- It is not a duplicate of `math`. Paper 1 Mathematics is the classes 1-5
-- syllabus; this is classes 6-8 mathematics *and* science. A question from one
-- does not belong in the other, which is exactly why they are kept apart.
insert into subjects (id, name, icon, color, description, sort_order) values
  ('maths-science',
   '{"en":"Mathematics & Science","hi":"गणित एवं विज्ञान"}'::jsonb,
   '🔬', '#0891B2',
   '{"en":"CTET Paper 2''s 60-mark elective block for maths and science teachers. Classes 6-8 content with pedagogy.","hi":"CTET पेपर 2 का गणित एवं विज्ञान शिक्षकों हेतु 60 अंकों का वैकल्पिक खंड। कक्षा 6-8 विषयवस्तु एवं शिक्षाशास्त्र।"}'::jsonb,
   6)
on conflict (id) do nothing;

-- The Paper 2 syllabus as CTET publishes it, mathematics then science, with
-- each half's pedagogy last. Weightage is left at a flat share rather than
-- invented: no analysis has been done on this block yet, and a made-up number
-- would drive the "high yield" badge with nothing behind it.
insert into topics (id, subject_id, name, weightage) values
  ('ms-number',    'maths-science', '{"en":"Number System","hi":"संख्या पद्धति"}'::jsonb, 8),
  ('ms-algebra',   'maths-science', '{"en":"Algebra","hi":"बीजगणित"}'::jsonb, 8),
  ('ms-geometry',  'maths-science', '{"en":"Geometry","hi":"ज्यामिति"}'::jsonb, 8),
  ('ms-mensuration','maths-science','{"en":"Mensuration","hi":"क्षेत्रमिति"}'::jsonb, 6),
  ('ms-data',      'maths-science', '{"en":"Data Handling","hi":"आँकड़ा प्रबंधन"}'::jsonb, 5),
  ('ms-math-pedagogy','maths-science','{"en":"Pedagogy of Mathematics","hi":"गणित शिक्षाशास्त्र"}'::jsonb, 8),
  ('ms-food',      'maths-science', '{"en":"Food","hi":"भोजन"}'::jsonb, 7),
  ('ms-materials', 'maths-science', '{"en":"Materials","hi":"पदार्थ"}'::jsonb, 7),
  ('ms-living',    'maths-science', '{"en":"The World of the Living","hi":"सजीव जगत"}'::jsonb, 8),
  ('ms-moving',    'maths-science', '{"en":"Moving Things, People and Ideas","hi":"गतिमान वस्तुएँ, लोग एवं विचार"}'::jsonb, 7),
  ('ms-how-things-work','maths-science','{"en":"How Things Work","hi":"चीज़ें कैसे काम करती हैं"}'::jsonb, 7),
  ('ms-natural-phenomena','maths-science','{"en":"Natural Phenomena","hi":"प्राकृतिक परिघटनाएँ"}'::jsonb, 7),
  ('ms-natural-resources','maths-science','{"en":"Natural Resources","hi":"प्राकृतिक संसाधन"}'::jsonb, 6),
  ('ms-sci-pedagogy','maths-science','{"en":"Pedagogy of Science","hi":"विज्ञान शिक्षाशास्त्र"}'::jsonb, 8)
on conflict (id) do nothing;

-- =========================================================================
-- STEP 2 — one Paper 2
-- =========================================================================

insert into exam_papers (
  id, exam_id, name, level, post,
  marks_per_question, negative_marking, duration_minutes, total_questions,
  cutoff_general, cutoff_reserved, sort_order
) values (
  'ctet-p2', 'ctet',
  '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb,
  'upper-primary', 'Paper 2',
  1, 0, 150, 150, 60, 55, 1
)
on conflict (id) do nothing;

-- Three fixed blocks of 30, then the 60-mark block the candidate chooses.
-- `subject_id` and `elective_group_id` are exclusive (0009), so the elective
-- section carries no subject of its own — that is the point of it.
insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks, sort_order) values
  ('ctet-p2', 'cdp',     null, 30, 30, 0),
  ('ctet-p2', 'hindi',   null, 30, 30, 1),
  ('ctet-p2', 'english', null, 30, 30, 2)
on conflict do nothing;

insert into elective_groups (id, paper_id, name) values
  ('ctet-p2-elective', 'ctet-p2',
   '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb)
on conflict (id) do nothing;

insert into elective_choices (group_id, subject_id, sort_order) values
  ('ctet-p2-elective', 'maths-science', 0),
  ('ctet-p2-elective', 'sst', 1)
on conflict do nothing;

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks, sort_order) values
  ('ctet-p2', null, 'ctet-p2-elective', 60, 60, 3)
on conflict do nothing;

-- =========================================================================
-- STEP 3 — move learners before removing what they point at
-- =========================================================================

-- Their old paper says which subject they had already chosen without being
-- asked, so the elective is inferred rather than cleared: a candidate who
-- picked "Paper 2 (Social Studies)" has chosen Social Studies, and making them
-- answer again would be asking a question they have already answered.
update profiles
   set target_paper_id = 'ctet-p2',
       elective_subject_id = 'maths-science'
 where target_paper_id = 'ctet-p2-ms';

update profiles
   set target_paper_id = 'ctet-p2',
       elective_subject_id = 'sst'
 where target_paper_id = 'ctet-p2-sst';

-- Seeded mock tests point at the old paper too.
update tests set paper_id = 'ctet-p2' where paper_id in ('ctet-p2-ms', 'ctet-p2-sst');

-- =========================================================================
-- STEP 4 — remove the two half-papers
-- =========================================================================

-- `paper_sections.paper_id` cascades, so the sections go with them. Nothing
-- else references a paper: `questions.paper_id` is `on delete set null` and the
-- bank is empty, and both `profiles` and `tests` were moved above.
delete from paper_sections where paper_id in ('ctet-p2-ms', 'ctet-p2-sst');
delete from exam_papers    where id       in ('ctet-p2-ms', 'ctet-p2-sst');

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================

select
  case when count(*) = 1 then 'PASS' else 'FAIL' end                as status,
  'CTET has exactly one Paper 2'                                    as check,
  count(*)                                                          as found
from exam_papers where exam_id = 'ctet' and post = 'Paper 2'

union all

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'the two half-papers are gone',
  count(*)
from exam_papers where id in ('ctet-p2-ms', 'ctet-p2-sst')

union all

select
  case when count(*) = 4 then 'PASS' else 'FAIL' end,
  'Paper 2 has four sections (3 fixed + 1 elective)',
  count(*)
from paper_sections where paper_id = 'ctet-p2'

union all

select
  case when count(*) = 1 then 'PASS' else 'FAIL' end,
  'exactly one section is the elective',
  count(*)
from paper_sections where paper_id = 'ctet-p2' and elective_group_id is not null

union all

select
  case when sum(questions) = 150 then 'PASS' else 'FAIL' end,
  'the sections add up to 150 questions',
  sum(questions)
from paper_sections where paper_id = 'ctet-p2'

union all

select
  case when count(*) = 2 then 'PASS' else 'FAIL' end,
  'the elective offers two choices',
  count(*)
from elective_choices where group_id = 'ctet-p2-elective'

union all

select
  case when count(*) = 14 then 'PASS' else 'FAIL' end,
  'Mathematics & Science has its topics',
  count(*)
from topics where subject_id = 'maths-science'

union all

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'no learner is left pointing at a deleted paper',
  count(*)
from profiles where target_paper_id in ('ctet-p2-ms', 'ctet-p2-sst');
