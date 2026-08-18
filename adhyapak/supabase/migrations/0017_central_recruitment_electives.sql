-- ---------------------------------------------------------------------------
-- 0017 — the central recruitment exams get the subject choice they always had
--
-- DSSSB, KVS and NVS recruit for a post *and* a subject: a TGT vacancy is a TGT
-- Science vacancy or a TGT Hindi vacancy, and the second half of the paper is
-- whichever one the candidate applied for. The blueprint hard-coded that half
-- to a single subject:
--
--     ('dsssb-tgt', 'sst',     null, 100, 100, 5)
--     ('kvs-tgt',   'science', null,  80,  80, 6)
--
-- which says every DSSSB TGT candidate sits Social Studies and every KVS TGT
-- candidate sits Science. Both are false for most candidates, and the effect is
-- the one 0009 described for HTET: a learner is shown another candidate's
-- syllabus, with nothing on screen admitting it.
--
-- Those blocks become elective groups, the same shape HTET, CTET and the
-- thirteen state TETs now use. The subject lists are copied from the HTET
-- groups by selecting from them rather than being retyped, so the three cannot
-- drift apart and a subject added to one is a subject added to all.
--
-- Tier 1 papers are added for KVS and NVS, and DSSSB gains its PGT papers.
--
-- ===========================================================================
-- LEAST VERIFIED WORK IN THIS SERIES. The state TETs follow the NCTE template,
-- which is published and stable. These three do not: DSSSB, KVS and NVS change
-- their pattern between recruitment cycles, and the question counts and mark
-- totals below are the ones specified for this task, not ones read off a
-- notification. The *structure* — a common tier plus a subject-specific one —
-- is right. The numbers should be checked against the current advertisement
-- before any of it is shown as a mock test.
-- ===========================================================================
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — new papers
-- =========================================================================

-- Dependencies first: papers before the elective groups that hang off them,
-- and groups before the sections that reference them. Batch 1 of the state TETs
-- shipped with that order inverted and the foreign key failed the transaction.

insert into exam_papers (
  id, exam_id, name, level, post,
  marks_per_question, negative_marking, duration_minutes, total_questions,
  cutoff_general, cutoff_reserved, sort_order
) values
  -- DSSSB PGT, two tiers as the commission runs them.
  ('dsssb-pgt-t1', 'dsssb', '{"en":"PGT Tier 1 — General","hi":"PGT टियर 1 — सामान्य"}'::jsonb,
   'senior-secondary', 'PGT Tier 1', 1, 0, 120, 200, 60, 55, 2),
  ('dsssb-pgt-t2', 'dsssb', '{"en":"PGT Tier 2 — Subject","hi":"PGT टियर 2 — विषय"}'::jsonb,
   'senior-secondary', 'PGT Tier 2', 1, 0, 180, 300, 60, 55, 3),

  -- KVS and NVS: one common tier sat by every candidate, whatever the post.
  ('kvs-tier1', 'kvs', '{"en":"Tier 1 — Common","hi":"टियर 1 — सामान्य"}'::jsonb,
   'primary', 'Tier 1', 3, 0, 150, 100, 60, 55, 0),
  ('nvs-tier1', 'nvs', '{"en":"Tier 1 — Common","hi":"टियर 1 — सामान्य"}'::jsonb,
   'primary', 'Tier 1', 3, 0, 150, 100, 60, 55, 0),

  -- The posts KVS and NVS recruit for but the blueprint never modelled.
  ('kvs-pgt', 'kvs', '{"en":"PGT — Post Graduate Teacher","hi":"PGT — स्नातकोत्तर शिक्षक"}'::jsonb,
   'senior-secondary', 'PGT', 1, 0, 150, 150, 60, 55, 4),
  ('nvs-tgt', 'nvs', '{"en":"TGT — Trained Graduate Teacher","hi":"TGT — प्रशिक्षित स्नातक शिक्षक"}'::jsonb,
   'secondary', 'TGT', 1, 0, 150, 150, 60, 55, 2),
  ('nvs-pgt', 'nvs', '{"en":"PGT — Post Graduate Teacher","hi":"PGT — स्नातकोत्तर शिक्षक"}'::jsonb,
   'senior-secondary', 'PGT', 1, 0, 150, 150, 60, 55, 3)
on conflict (id) do nothing;

-- =========================================================================
-- STEP 2 — the subject choices
-- =========================================================================

insert into elective_groups (id, paper_id, name) values
  ('dsssb-tgt-elective',   'dsssb-tgt',   '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('dsssb-pgt-elective',   'dsssb-pgt-t2','{"en":"PGT subject","hi":"PGT विषय"}'::jsonb),
  ('kvs-tgt-elective',     'kvs-tgt',     '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('kvs-pgt-elective',     'kvs-pgt',     '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb),
  ('nvs-tgt-elective',     'nvs-tgt',     '{"en":"TGT subject","hi":"TGT विषय"}'::jsonb),
  ('nvs-pgt-elective',     'nvs-pgt',     '{"en":"PGT subject","hi":"PGT विषय"}'::jsonb)
on conflict (id) do nothing;

-- Copied from the HTET groups by selecting from them, not retyped. A TGT
-- subject list is a TGT subject list whichever body is recruiting, and two
-- hand-written copies would differ the first time one of them was edited.
insert into elective_choices (group_id, subject_id, sort_order)
select g.id, c.subject_id, c.sort_order
  from elective_choices c
  cross join (values ('dsssb-tgt-elective'), ('kvs-tgt-elective'), ('nvs-tgt-elective')) as g(id)
 where c.group_id = 'htet-l2-elective'
on conflict do nothing;

insert into elective_choices (group_id, subject_id, sort_order)
select g.id, c.subject_id, c.sort_order
  from elective_choices c
  cross join (values ('dsssb-pgt-elective'), ('kvs-pgt-elective'), ('nvs-pgt-elective')) as g(id)
 where c.group_id = 'htet-l3-elective'
on conflict do nothing;

-- =========================================================================
-- STEP 3 — sections
-- =========================================================================

-- The hard-coded subject blocks go. `paper_sections` has no natural key, so
-- these are deleted by what they are rather than by id: the one section on each
-- paper that names a subject and is bigger than any of the general blocks.
delete from paper_sections where paper_id = 'dsssb-tgt' and subject_id = 'sst';
delete from paper_sections where paper_id = 'kvs-tgt'   and subject_id = 'science';

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks, sort_order) values
  -- DSSSB TGT Section B: the candidate's own subject, in place of the Social
  -- Studies block that every candidate was being shown.
  ('dsssb-tgt', null, 'dsssb-tgt-elective', 100, 100, 5),

  -- DSSSB PGT Tier 1: general ability, common to every subject.
  ('dsssb-pgt-t1', 'gk', null, 40, 40, 0),
  ('dsssb-pgt-t1', 'reasoning', null, 40, 40, 1),
  ('dsssb-pgt-t1', 'math', null, 40, 40, 2),
  ('dsssb-pgt-t1', 'hindi', null, 40, 40, 3),
  ('dsssb-pgt-t1', 'english', null, 40, 40, 4),
  -- Tier 2 is the subject, whole.
  ('dsssb-pgt-t2', null, 'dsssb-pgt-elective', 300, 300, 0),

  -- KVS and NVS Tier 1, sat by every candidate whatever the post.
  ('kvs-tier1', 'gk', null, 20, 60, 0),
  ('kvs-tier1', 'reasoning', null, 20, 60, 1),
  ('kvs-tier1', 'computer', null, 10, 30, 2),
  ('kvs-tier1', 'cdp', null, 30, 90, 3),
  ('kvs-tier1', 'english', null, 10, 30, 4),
  ('kvs-tier1', 'hindi', null, 10, 30, 5),
  ('nvs-tier1', 'gk', null, 20, 60, 0),
  ('nvs-tier1', 'reasoning', null, 20, 60, 1),
  ('nvs-tier1', 'computer', null, 10, 30, 2),
  ('nvs-tier1', 'cdp', null, 30, 90, 3),
  ('nvs-tier1', 'english', null, 10, 30, 4),
  ('nvs-tier1', 'hindi', null, 10, 30, 5),

  -- KVS TGT keeps its general blocks; only the subject half becomes a choice.
  ('kvs-tgt', null, 'kvs-tgt-elective', 80, 80, 6),

  -- KVS PGT and the two NVS posts, built the same way.
  ('kvs-pgt', 'english', null, 10, 10, 0),
  ('kvs-pgt', 'hindi', null, 10, 10, 1),
  ('kvs-pgt', 'gk', null, 10, 10, 2),
  ('kvs-pgt', 'reasoning', null, 10, 10, 3),
  ('kvs-pgt', 'computer', null, 10, 10, 4),
  ('kvs-pgt', 'cdp', null, 20, 20, 5),
  ('kvs-pgt', null, 'kvs-pgt-elective', 80, 80, 6),

  -- Same general blocks NVS PRT already carries, so the three posts differ
  -- only in the half that is actually different.
  ('nvs-tgt', 'reasoning', null, 15, 15, 0),
  ('nvs-tgt', 'gk', null, 15, 15, 1),
  ('nvs-tgt', 'cdp', null, 20, 20, 2),
  ('nvs-tgt', 'computer', null, 10, 10, 3),
  ('nvs-tgt', 'hindi', null, 15, 15, 4),
  ('nvs-tgt', 'english', null, 15, 15, 5),
  ('nvs-tgt', null, 'nvs-tgt-elective', 60, 60, 6),

  ('nvs-pgt', 'reasoning', null, 15, 15, 0),
  ('nvs-pgt', 'gk', null, 15, 15, 1),
  ('nvs-pgt', 'cdp', null, 20, 20, 2),
  ('nvs-pgt', 'computer', null, 10, 10, 3),
  ('nvs-pgt', 'hindi', null, 15, 15, 4),
  ('nvs-pgt', 'english', null, 15, 15, 5),
  ('nvs-pgt', null, 'nvs-pgt-elective', 60, 60, 6)
on conflict do nothing;

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end                as status,
  'no paper still hard-codes its subject block'                     as check,
  count(*)                                                          as found
from paper_sections
 where (paper_id = 'dsssb-tgt' and subject_id = 'sst')
    or (paper_id = 'kvs-tgt'   and subject_id = 'science')

union all
select case when count(*) = 6 then 'PASS' else 'FAIL' end,
  'six new elective groups exist', count(*)
from elective_groups
 where id in ('dsssb-tgt-elective','dsssb-pgt-elective','kvs-tgt-elective',
              'kvs-pgt-elective','nvs-tgt-elective','nvs-pgt-elective')

union all
select case when count(*) = 3 then 'PASS' else 'FAIL' end,
  'every TGT group offers the same twelve subjects', count(*)
from (
  select group_id from elective_choices
   where group_id in ('dsssb-tgt-elective','kvs-tgt-elective','nvs-tgt-elective')
   group by group_id having count(*) = 12) t

union all
select case when count(*) = 3 then 'PASS' else 'FAIL' end,
  'every PGT group offers the same twenty-one subjects', count(*)
from (
  select group_id from elective_choices
   where group_id in ('dsssb-pgt-elective','kvs-pgt-elective','nvs-pgt-elective')
   group by group_id having count(*) = 21) t

union all
select case when count(*) = 7 then 'PASS' else 'FAIL' end,
  'the seven new papers exist', count(*)
from exam_papers
 where id in ('dsssb-pgt-t1','dsssb-pgt-t2','kvs-tier1','nvs-tier1',
              'kvs-pgt','nvs-tgt','nvs-pgt')

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'every touched paper adds up to its stated total', count(*)
from (
  select p.id
    from exam_papers p join paper_sections ps on ps.paper_id = p.id
   where p.exam_id in ('dsssb','kvs','nvs')
   group by p.id, p.total_questions
  having sum(ps.questions) <> p.total_questions) bad

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'no elective section points at a group that does not exist', count(*)
from paper_sections ps
 left join elective_groups g on g.id = ps.elective_group_id
 where ps.elective_group_id is not null and g.id is null;
