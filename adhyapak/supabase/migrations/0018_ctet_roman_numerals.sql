-- ---------------------------------------------------------------------------
-- 0018 — CTET's papers are Paper I and Paper II
--
-- CBSE numbers them with Roman numerals in its own notification, and a
-- candidate searching for "CTET Paper II" should find the paper they sat spelt
-- the way the board spelt it. The blueprint used Arabic numerals throughout,
-- which 0013 then copied into `post`.
--
-- Only CTET is changed here.
--
-- Seventeen other exams also carry "Paper 1" / "Paper 2" — the state TETs added
-- in 0015 and 0016, plus UPTET, Bihar TET, Bihar STET and WBTET. Their
-- conventions have not been checked against their own notifications, and boards
-- genuinely differ: some print Roman, some Arabic, some neither. Changing them
-- to match CBSE would be applying one board's style to sixteen others on no
-- evidence, so they are left alone and named here so the gap is visible rather
-- than assumed closed.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running rewrites the
-- same values.
-- ---------------------------------------------------------------------------

begin;

update exam_papers
   set post = 'Paper I',
       name = '{"en":"Paper I — Classes 1 to 5 (PRT)","hi":"पेपर I — कक्षा 1 से 5 (PRT)"}'::jsonb
 where id = 'ctet-p1';

update exam_papers
   set post = 'Paper II',
       name = '{"en":"Paper II — Classes 6 to 8","hi":"पेपर II — कक्षा 6 से 8"}'::jsonb
 where id = 'ctet-p2';

-- The elective group is named after the paper, so it moves too.
update elective_groups
   set name = '{"en":"Paper II subject","hi":"पेपर II विषय"}'::jsonb
 where id = 'ctet-p2-elective';

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================

select
  case when count(*) = 2 then 'PASS' else 'FAIL' end        as status,
  'CTET reads Paper I and Paper II'                         as check,
  count(*)                                                  as found
from exam_papers
 where exam_id = 'ctet' and post in ('Paper I', 'Paper II')

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'no CTET paper still reads Paper 1 or Paper 2', count(*)
from exam_papers
 where exam_id = 'ctet' and post in ('Paper 1', 'Paper 2')

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'the displayed names match the post codes', count(*)
from exam_papers
 where exam_id = 'ctet' and (name->>'en' like 'Paper 1%' or name->>'en' like 'Paper 2%')

union all
-- Not a failure. A count of the exams left on Arabic numerals, so the size of
-- the unchecked gap is on screen next to the fix rather than buried in a
-- comment.
select 'NOTE',
  'other exams still using Paper 1 / Paper 2 — conventions unverified',
  count(distinct exam_id)
from exam_papers where post in ('Paper 1', 'Paper 2');
