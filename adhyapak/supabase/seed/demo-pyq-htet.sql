-- ---------------------------------------------------------------------------
-- Demo PYQ data — HTET Level 2 (TGT), 2018 to 2024
--
-- THIS IS NOT REAL CONTENT. Every question here is generated filler so the PYQ
-- browser can be looked at with something in it. Nothing in this file was ever
-- asked in a real HTET paper.
--
-- REMOVE IT BEFORE ANY LEARNER SEES THE APP:
--
--     delete from questions where source = 'demo-data';
--
-- That one statement takes all of it, including the `question_exams` rows,
-- which cascade. It is the same statement the existing test dataset documents
-- in docs/BACKEND-SETUP.md, and the same `source` value, so one delete clears
-- both.
--
-- WHY EVERY ROW SHOUTS
--
-- The existing test dataset dodges this problem by dating its questions 1998-99,
-- before any covered exam existed, so nothing can mistake them for a real paper.
-- These cannot do that — the whole point is to sit at 2018 to 2024 where the
-- screen expects them. So the safeguard moves into the text: every question
-- begins "[DEMO]" in English and "[नमूना]" in Hindi, and says outright that it
-- is filler. An aspirant who somehow reaches one is told immediately, rather
-- than revising against an invented fact.
--
-- SHAPE
--
-- 150 questions per year, split the way HTET Level 2 actually splits: Child
-- Development 30, Hindi 15, English 15, Quantitative Aptitude 10, Reasoning 10,
-- Haryana GK 10, and the 60-mark elective as Science. 1,050 rows in total.
-- Questions are spread round-robin across each subject's real topics, so the
-- topic-wise tab has something under every heading rather than a heap under one.
--
-- Safe to re-run: ids are deterministic and the insert is `on conflict do
-- nothing`.
-- ---------------------------------------------------------------------------

begin;

with blueprint (subject_id, n, is_elective) as (
  values ('cdp', 30, false),
         ('hindi', 15, false),
         ('english', 15, false),
         ('quantitative-aptitude', 10, false),
         ('reasoning', 10, false),
         ('haryana-gk', 10, false),
         ('science', 60, true)
),
years as (select generate_series(2018, 2024) as year),
-- Each subject's topics, numbered, so questions can be dealt round-robin
-- across them rather than piling onto whichever sorts first.
pool as (
  select subject_id,
         id as topic_id,
         name->>'en' as topic_en,
         name->>'hi' as topic_hi,
         row_number() over (partition by subject_id order by id) - 1 as rn,
         count(*) over (partition by subject_id) as topics
  from topics
),
slots as (
  select y.year, b.subject_id, b.is_elective, s.i
  from years y
  cross join blueprint b
  cross join lateral generate_series(1, b.n) as s(i)
),
dealt as (
  select s.year,
         s.subject_id,
         s.is_elective,
         p.topic_id,
         p.topic_en,
         p.topic_hi,
         row_number() over (partition by s.year order by s.subject_id, s.i) as q_no
  from slots s
  join pool p
    on p.subject_id = s.subject_id
   and p.rn = (s.i - 1) % p.topics
)
insert into questions (
  id, question_en, question_hi,
  option_a_en, option_b_en, option_c_en, option_d_en,
  option_a_hi, option_b_hi, option_c_hi, option_d_hi,
  explanation_en, explanation_hi,
  correct_answers, difficulty, paper_id, topic_id, elective_subject_id,
  year, question_no, source, status, fingerprint, avg_time_seconds, accuracy
)
select
  format('demo-htet-%s-%s', d.year, d.q_no),
  format('[DEMO] Placeholder question %s on "%s" (HTET %s). Not a real exam question — demo data only.',
         d.q_no, d.topic_en, d.year),
  format('[नमूना] "%s" पर प्लेसहोल्डर प्रश्न %s (HTET %s)। यह असली परीक्षा प्रश्न नहीं है — केवल डेमो डेटा।',
         d.topic_hi, d.q_no, d.year),
  'Demo option A', 'Demo option B', 'Demo option C', 'Demo option D',
  'डेमो विकल्प A', 'डेमो विकल्प B', 'डेमो विकल्प C', 'डेमो विकल्प D',
  -- A published question with an answer must carry an explanation — the schema
  -- enforces it, and rightly: an answer key with no reasoning is the thing
  -- aspirants complain about most. Demo rows say plainly that there is none.
  'Demo data — no real explanation. This question is a placeholder and will be replaced by a real paper.',
  'डेमो डेटा — कोई वास्तविक व्याख्या नहीं। यह प्रश्न प्लेसहोल्डर है और असली पेपर से बदला जाएगा।',
  -- Rotated so the answer key is not a column of A's, which would make any
  -- screen that charts option distribution look broken.
  array[ (array['A','B','C','D'])[1 + (d.q_no % 4)] ],
  (array['easy','medium','medium','hard'])[1 + (d.q_no % 4)]::difficulty_level,
  'htet-l2',
  d.topic_id,
  case when d.is_elective then d.subject_id else null end,
  d.year,
  d.q_no,
  'demo-data',
  'published'::content_status,
  md5(format('demo-htet-%s-%s', d.year, d.q_no)),
  40,
  0.5
from dealt d
on conflict (id) do nothing;

-- The junction is what every exam-scoped query filters on; without it these
-- questions exist but belong to no exam and the PYQ screen finds none of them.
insert into question_exams (question_id, exam_id)
select id, 'htet' from questions where source = 'demo-data'
on conflict do nothing;

commit;
