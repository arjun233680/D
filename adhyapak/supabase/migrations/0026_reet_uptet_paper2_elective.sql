-- ---------------------------------------------------------------------------
-- 0026 — REET Level 2 and UPTET Paper 2 have a choice, not a fixed subject
--
-- Both blueprints modelled the 60-mark subject block as fixed, which states
-- something false about the paper and shows half the candidates the wrong
-- syllabus:
--
--   REET Level 2 carried a fixed 60-mark Social Studies section, so the app
--   claimed every REET Level 2 candidate sits Social Studies. A maths and
--   science candidate sits sixty marks of maths and science.
--
--   UPTET Paper 2 carried fixed Mathematics 30 + Science 30, so it claimed the
--   opposite: that everybody sits maths and science. A social studies candidate
--   was shown a syllabus they will not be examined on at all.
--
-- Under the NCTE template both papers ask the candidate to choose one of two
-- blocks — Mathematics & Science, or Social Studies/Social Science — the same
-- way CTET Paper II and the thirteen state TETs already modelled here do. This
-- makes those two papers say so.
--
-- The comment on `ExamSection` in packages/core/src/types.ts describes this
-- exact failure: "an elective could only be modelled by inventing a subject for
-- it — which is exactly how HTET Level 2 came to claim it tested Science and
-- Mathematics." HTET was fixed; these two were not.
--
-- WHAT IS NOT HERE
--
-- The other nine exams with no elective data — SuperTET, HSSC, HPSC PGT, Bihar
-- STET, APS, EMRS, Bihar TET, MPTET, WBTET. Those are subject-wise recruitments
-- or papers this repository has not modelled a Paper 2 for, and their subject
-- lists come from each notification. Guessing them from a neighbouring state's
-- list would be inventing content, so the gap stays visible: the subject step
-- falls back to the generic per-level list for them, which is approximate and
-- says nothing false about a specific board.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- ------------------------------------------------------------ REET Level 2

insert into elective_groups (id, paper_id, name) values
  ('reet-l2-elective', 'reet-l2',
   '{"en":"Subject of choice","hi":"वैकल्पिक विषय"}'::jsonb)
on conflict (id) do nothing;

insert into elective_choices (group_id, subject_id, sort_order) values
  ('reet-l2-elective', 'maths-science', 1),
  ('reet-l2-elective', 'sst', 2)
on conflict (group_id, subject_id) do nothing;

-- The fixed Social Studies block becomes the choice it always was.
delete from paper_sections where paper_id = 'reet-l2' and subject_id = 'sst';

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks)
values ('reet-l2', null, 'reet-l2-elective', 60, 60)
on conflict do nothing;

-- ----------------------------------------------------------- UPTET Paper 2

insert into elective_groups (id, paper_id, name) values
  ('uptet-p2-elective', 'uptet-p2',
   '{"en":"Subject of choice","hi":"वैकल्पिक विषय"}'::jsonb)
on conflict (id) do nothing;

insert into elective_choices (group_id, subject_id, sort_order) values
  ('uptet-p2-elective', 'maths-science', 1),
  ('uptet-p2-elective', 'sst', 2)
on conflict (group_id, subject_id) do nothing;

-- Maths 30 + Science 30 was one 60-mark choice written as two fixed halves.
delete from paper_sections where paper_id = 'uptet-p2' and subject_id in ('math', 'science');

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks)
values ('uptet-p2', null, 'uptet-p2-elective', 60, 60)
on conflict do nothing;

commit;
