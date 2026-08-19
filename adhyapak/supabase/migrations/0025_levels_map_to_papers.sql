-- ---------------------------------------------------------------------------
-- 0025 — a level has to find its paper in every exam, not just HTET
--
-- THE BUG THIS FIXES
--
-- The PYQ browser found a learner's paper by matching the level's name against
-- `exam_papers.post`. That works for exactly one exam. HTET labels its papers
-- PRT, TGT and PGT, so "TGT" matched. CTET labels the same papers "Paper I" and
-- "Paper II", UPTET uses "Level 1" and "Level 2", MPTET uses "Varg 3". For every
-- one of those the match failed, `listPrepSections` returned nothing, and the
-- screen rendered with no section chips and no topics — which is what a CTET
-- learner saw.
--
-- `post` is what one board prints on one of its papers. It was never the right
-- key. `exam_papers.level` already carries the shared vocabulary — primary,
-- upper-primary, secondary, senior-secondary — and every seeded paper has it.
-- So the level table says which of those it means, and the join goes through
-- that instead.
--
--   PRT → primary          (HTET Level 1, CTET Paper I)
--   TGT → upper-primary    (HTET Level 2, CTET Paper II)
--   PGT → senior-secondary (HTET Level 3)
--
-- `other` stays null: non-teaching recruitment does not map onto a teaching
-- level, and guessing one would attach somebody to a syllabus they do not sit.
--
-- Also gives CTET its exam years, so its Full Test tab has the same seven cards
-- HTET's does.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

alter table levels add column if not exists teaching_level text;

comment on column levels.teaching_level is
  'The `exam_papers.level` this level means — the shared vocabulary that lets one level find its paper in any exam, whatever that board calls it. Null where the level maps onto no teaching paper.';

update levels set teaching_level = v.tl
from (values
  ('prt', 'primary'),
  ('tgt', 'upper-primary'),
  ('pgt', 'senior-secondary')
) as v(id, tl)
where levels.id = v.id;

-- CTET runs twice a year; the browser lists years, so one row per year.
insert into pyq_years (exam_id, year, paper_questions)
select 'ctet', y, 150 from generate_series(2018, 2024) as y
on conflict (exam_id, year) do nothing;

commit;
