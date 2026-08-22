-- 0032 — the papers these boards actually set, and the subjects behind them
--
-- WHY
--
-- 0031 gave each exam its real levels. Six of them then offered a level with
-- nothing behind it, because `exam_papers` had never been filled in for those
-- posts: EMRS had a TGT paper and no PGT one, APS only PRT, MPTET only Varg 3,
-- Bihar STET only Paper 1, and HPSC PGT had no paper at all. A learner picking
-- PGT for any of those reached a subject screen with an empty grid.
--
-- WHAT IS RESEARCHED AND WHAT IS ASSUMED — read this before trusting a number
--
-- The *structure* is checked against each board's 2025-26 recruitment: MPTET
-- Varg 1 and Varg 2 are the senior-secondary and upper-primary papers, Bihar
-- STET Paper 2 covers classes 11-12, EMRS recruits PGTs, APS screens TGT and
-- PGT alongside PRT, and HPSC PGT sets one senior-secondary paper.
--
-- The *subject lists* are the standard national TGT and PGT sets — the same
-- twelve and twenty-one already carried by HTET, DSSSB, KVS and NVS. Every one
-- of these boards recruits against that pattern, and `other-subject` is in
-- both lists as the escape hatch. They are NOT each board's individually
-- verified notification list, and should be checked against a live
-- notification before launch. An approximate list beats an empty grid; it does
-- not beat the real one.
--
-- The paper *metadata* — duration, question count, cutoffs — is plausible for
-- each board rather than sourced, and is the first thing to correct. It drives
-- the test player, so a wrong cutoff is a wrong result.

begin;

insert into public.exam_papers
  (id, exam_id, name, level, post, duration_minutes, total_questions,
   cutoff_general, cutoff_reserved, marks_per_question, negative_marking, sort_order)
values
  ('emrs-pgt', 'emrs',
   '{"en":"PGT — Post Graduate Teacher","hi":"PGT — स्नातकोत्तर शिक्षक"}'::jsonb,
   'senior-secondary', 'PGT', 180, 150, 40, 35, 1, 0, 1),

  ('awes-tgt', 'awes',
   '{"en":"TGT — Screening Test","hi":"TGT — स्क्रीनिंग परीक्षा"}'::jsonb,
   'secondary', 'TGT', 180, 180, 50, 45, 1, 0.25, 1),

  ('awes-pgt', 'awes',
   '{"en":"PGT — Screening Test","hi":"PGT — स्क्रीनिंग परीक्षा"}'::jsonb,
   'senior-secondary', 'PGT', 180, 180, 50, 45, 1, 0.25, 2),

  ('mptet-varg2', 'mptet',
   '{"en":"Varg 2 — Middle School Teacher","hi":"वर्ग 2 — माध्यमिक शिक्षक"}'::jsonb,
   'upper-primary', 'Varg 2', 150, 150, 60, 50, 1, 0, 1),

  ('mptet-varg1', 'mptet',
   '{"en":"Varg 1 — High School Teacher","hi":"वर्ग 1 — उच्च माध्यमिक शिक्षक"}'::jsonb,
   'senior-secondary', 'Varg 1', 150, 150, 60, 50, 1, 0, 2),

  ('stet-p2', 'bihar-stet',
   '{"en":"Paper 2 — Classes 11 to 12","hi":"पेपर 2 — कक्षा 11 से 12"}'::jsonb,
   'senior-secondary', 'Paper 2', 150, 150, 50, 45, 1, 0, 1),

  ('hpsc-pgt-screening', 'hpsc-pgt',
   '{"en":"PGT — Screening Test","hi":"PGT — स्क्रीनिंग परीक्षा"}'::jsonb,
   'senior-secondary', 'PGT', 120, 100, 50, 45, 1, 0, 0)
on conflict (id) do nothing;

-- One elective group per paper that has a subject to choose.
insert into public.elective_groups (id, paper_id, name)
values
  ('emrs-tgt-elective',   'emrs-tgt',           '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('emrs-pgt-elective',   'emrs-pgt',           '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb),
  ('awes-tgt-elective',   'awes-tgt',           '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('awes-pgt-elective',   'awes-pgt',           '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb),
  ('hssc-tgt-elective',   'hssc-tgt',           '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('hssc-pgt-elective',   'hssc-pgt',           '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb),
  ('mptet-varg2-elective','mptet-varg2',        '{"en":"Varg 2 subject","hi":"वर्ग 2 विषय"}'::jsonb),
  ('mptet-varg1-elective','mptet-varg1',        '{"en":"Varg 1 subject","hi":"वर्ग 1 विषय"}'::jsonb),
  ('stet-p1-elective',    'stet-p1',            '{"en":"Paper 1 subject","hi":"पेपर 1 विषय"}'::jsonb),
  ('stet-p2-elective',    'stet-p2',            '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('hpsc-pgt-elective',   'hpsc-pgt-screening', '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb)
on conflict (id) do nothing;

-- The standard TGT twelve, copied from the set HTET already uses so the two
-- cannot drift apart.
insert into public.elective_choices (group_id, subject_id, sort_order)
select g.id, c.subject_id, c.sort_order
from (values
  ('emrs-tgt-elective'), ('awes-tgt-elective'), ('hssc-tgt-elective'),
  ('mptet-varg2-elective'), ('stet-p1-elective')
) as g(id)
cross join (
  select subject_id, sort_order from public.elective_choices
  where group_id = 'htet-l2-elective'
) as c
on conflict do nothing;

-- The standard PGT twenty-one, likewise.
insert into public.elective_choices (group_id, subject_id, sort_order)
select g.id, c.subject_id, c.sort_order
from (values
  ('emrs-pgt-elective'), ('awes-pgt-elective'), ('hssc-pgt-elective'),
  ('mptet-varg1-elective'), ('stet-p2-elective'), ('hpsc-pgt-elective')
) as g(id)
cross join (
  select subject_id, sort_order from public.elective_choices
  where group_id = 'htet-l3-elective'
) as c
on conflict do nothing;

commit;

-- ---------------------------------------------------------------------------
-- BiharTET and WBTET, which 0031 gave a TGT level and which had no Paper 2.
--
-- Both set the standard two-paper TET: Paper 1 for classes 1-5 and Paper 2 for
-- 6-8, the second offering the Maths-and-Science or Social Studies choice that
-- every other TET in the table already offers.
-- ---------------------------------------------------------------------------

begin;

insert into public.exam_papers
  (id, exam_id, name, level, post, duration_minutes, total_questions,
   cutoff_general, cutoff_reserved, marks_per_question, negative_marking, sort_order)
values
  ('bihartet-p2', 'bihartet',
   '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb,
   'upper-primary', 'Paper 2', 150, 150, 60, 55, 1, 0, 2),
  ('wbtet-p2', 'wbtet',
   '{"en":"Upper Primary — Classes 6 to 8","hi":"उच्च प्राथमिक — कक्षा 6 से 8"}'::jsonb,
   'upper-primary', 'Paper 2', 150, 150, 60, 55, 1, 0, 1)
on conflict (id) do nothing;

insert into public.elective_groups (id, paper_id, name)
values
  ('bihartet-p2-elective', 'bihartet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('wbtet-p2-elective',    'wbtet-p2',    '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb)
on conflict (id) do nothing;

insert into public.elective_choices (group_id, subject_id, sort_order)
select g.id, c.subject_id, c.sort_order
from (values ('bihartet-p2-elective'), ('wbtet-p2-elective')) as g(id)
cross join (
  select subject_id, sort_order from public.elective_choices where group_id = 'ctet-p2-elective'
) as c
on conflict do nothing;

commit;
