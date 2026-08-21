-- 0030 — retire Bihar STET
--
-- WHY
--
-- The chooser listed Bihar twice. `bihartet` and `bihar-stet` are set by the
-- same board, sit next to each other in the grid, and a candidate reading
-- "BiharTET" and "STET" has to already know the difference to pick. The
-- product owner's call is that BiharTET covers it.
--
-- WHAT GOES WITH IT
--
-- Everything that points at the exam. Each of those foreign keys was declared
-- `on delete cascade` or `on delete set null` in 0001, 0005, 0007, 0011, 0019
-- and 0023, so one delete is enough and nothing is left dangling: its papers
-- (stet-p1 and stet-p2, in exam_papers, and the paper_sections under them),
-- its updates, sources, PYQ years and any learner who had selected it.
-- Content that merely referenced it — library rows, imports — keeps its own
-- row and loses only the exam pointer.
--
-- Note `levels` is untouched by design: that table is the shared PRT/TGT/PGT
-- vocabulary, not a per-exam list, so there is nothing of Bihar STET's in it.
--
-- A learner who had chosen Bihar STET and nothing else lands back on the exam
-- chooser at next sign-in, which is the correct place for them to be.
--
-- Idempotent: deleting a row that is already gone is a no-op.

begin;

delete from public.exams where id = 'bihar-stet';

commit;

-- Check afterwards — both should return zero:
--
--   select count(*) from public.exams       where id = 'bihar-stet';
--   select count(*) from public.exam_papers where exam_id = 'bihar-stet';
