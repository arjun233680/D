-- ---------------------------------------------------------------------------
-- 0013 — the goal a learner picks, and the name their paper goes by
--
-- Onboarding asks three questions — exam, then level, then elective subject —
-- and two things stopped the third from being answerable.
--
--   `set_goal` took an exam and a paper and nothing else, so a TGT candidate
--   could record that they sit HTET Level 2 but not which of its twelve
--   subjects they sit. `profiles.elective_subject_id` has existed since 0009
--   and nothing has ever written to it.
--
--   `exam_papers.post` was added by 0011 and never populated. It is what a
--   candidate calls their paper — PRT, TGT, Paper 2, Level 1 — and the whole
--   second step of onboarding is a list of it. Null everywhere meant the step
--   had nothing to show.
--
-- No table changes. `goal_exam_id` and `target_paper_id` already hold what
-- onboarding needs; only the function that writes them and the column that
-- labels the choice were missing.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running rewrites the
-- same values and redefines the same function.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — set_goal learns about electives
-- =========================================================================

-- Dropped rather than replaced: `create or replace` cannot change an argument
-- list, so it would leave the two-argument version in place beside the new one
-- and every two-argument call would become ambiguous.
drop function if exists set_goal(text, text);

/**
 * Records the whole goal in one call, and marks onboarding done.
 *
 * All three parts move together on purpose. A learner switching from HTET TGT
 * to CTET Paper 1 has no elective any more, and passing null clears it — an
 * update that left the old subject behind would leave a Sanskrit choice
 * attached to a paper that does not offer Sanskrit, which is the stale-profile
 * state `subjectsForPaper` has to report as an error rather than render.
 *
 * The elective is checked against the paper that was actually chosen. The
 * client already filters the picker to the right group, but a client can be
 * asked for anything, and a wrong subject here would quietly hand somebody
 * another candidate's syllabus.
 */
create or replace function set_goal(
  p_exam_id text,
  p_paper_id text default null,
  p_elective_subject_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if not exists (select 1 from exams where id = p_exam_id) then
    raise exception 'exam % does not exist', p_exam_id;
  end if;

  if p_paper_id is not null
     and not exists (select 1 from exam_papers where id = p_paper_id and exam_id = p_exam_id) then
    raise exception 'paper % does not belong to exam %', p_paper_id, p_exam_id;
  end if;

  if p_elective_subject_id is not null then
    if p_paper_id is null then
      raise exception 'an elective subject needs a paper to belong to';
    end if;

    select eg.id into v_group_id
      from elective_groups eg
     where eg.paper_id = p_paper_id
     limit 1;

    if v_group_id is null then
      raise exception 'paper % has no elective subjects', p_paper_id;
    end if;

    if not exists (
      select 1 from elective_choices
       where group_id = v_group_id and subject_id = p_elective_subject_id
    ) then
      raise exception 'subject % is not offered by paper %', p_elective_subject_id, p_paper_id;
    end if;
  end if;

  update profiles
     set goal_exam_id = p_exam_id,
         target_paper_id = p_paper_id,
         elective_subject_id = p_elective_subject_id,
         onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();
end;
$$;

revoke all on function set_goal(text, text, text) from public;
grant execute on function set_goal(text, text, text) to authenticated;

comment on function set_goal is
  'The only supported way to record a learner''s goal. Writes exam, paper and '
  'elective subject together, because they are one choice — switching paper '
  'without clearing the elective leaves a subject the new paper does not offer.';

-- =========================================================================
-- STEP 2 — what each paper is called
-- =========================================================================

-- The post code, as the candidate says it. Deliberately not a normalised
-- vocabulary: a CTET aspirant sits "Paper 2", a REET aspirant sits "Level 2"
-- and a KVS aspirant sits "TGT", and flattening those into one scheme would
-- put a word on the screen that nobody uses for their own exam.
--
-- `level` stays as it was and still carries the cross-exam meaning — CTET
-- Paper 1, HTET Level 1 and REET Level 1 are all `primary`. That is what the
-- syllabus is shared by; this is what the paper is called.

update exam_papers set post = 'Paper 1'   where id = 'ctet-p1';
update exam_papers set post = 'Paper 2'   where id in ('ctet-p2-ms', 'ctet-p2-sst');

update exam_papers set post = 'PRT'       where id = 'htet-l1';
update exam_papers set post = 'TGT'       where id = 'htet-l2';
update exam_papers set post = 'PGT'       where id = 'htet-l3';

update exam_papers set post = 'Paper 1'   where id = 'uptet-p1';
update exam_papers set post = 'Paper 2'   where id = 'uptet-p2';

update exam_papers set post = 'Paper 1'   where id = 'bihartet-p1';
-- BPSC TRE is a recruitment exam sitting under the same banner as the state
-- TET, and its candidates say "Primary Teacher", not "Paper 1".
update exam_papers set post = 'PRT'       where id = 'bihartre-p1';

update exam_papers set post = 'PRT'       where id in ('dsssb-prt', 'kvs-prt', 'nvs-prt', 'awes-prt');
update exam_papers set post = 'TGT'       where id in ('dsssb-tgt', 'kvs-tgt', 'hssc-tgt', 'emrs-tgt');
update exam_papers set post = 'PGT'       where id = 'hssc-pgt';

update exam_papers set post = 'Level 1'   where id = 'reet-l1';
update exam_papers set post = 'Level 2'   where id = 'reet-l2';

-- Super TET recruits assistant teachers for the primary level; the post code
-- candidates use for it is PRT.
update exam_papers set post = 'PRT'       where id = 'supertet-p1';

update exam_papers set post = 'Varg 3'    where id = 'mptet-varg3';
update exam_papers set post = 'Paper 1'   where id in ('stet-p1', 'wbtet-p1');

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================
--
-- Run this after the transaction commits. It is read-only.

select
  case when count(*) filter (where post is null) = 0
       then 'PASS' else 'FAIL' end                          as status,
  'every paper has a post code'                             as check,
  count(*)                                                  as papers,
  count(*) filter (where post is null)                      as missing
from exam_papers

union all

select
  case when to_regprocedure('set_goal(text,text,text)') is not null
       then 'PASS' else 'FAIL' end,
  'set_goal takes an elective subject',
  null, null

union all

select
  case when to_regprocedure('set_goal(text,text)') is null
       then 'PASS' else 'FAIL' end,
  'the two-argument set_goal is gone',
  null, null;

-- What each paper is now called, for eyeballing against the real exam:
--
--   select e.short_name, p.post, p.level, p.name->>'en'
--     from exam_papers p join exams e on e.id = p.exam_id
--    order by e.short_name, p.sort_order;
