-- 0035 — a subject belongs to an exam and a level, not to a level alone
--
-- WHY
--
-- `learner_subjects` was keyed on (user, level), so a learner had one subject
-- per level however many exams they sit. That cannot describe the ordinary
-- case. CTET's Paper II and HTET's TGT are both `tgt` here, and the two boards
-- offer completely different things: CTET Paper II is a choice between Maths &
-- Science and Social Studies — two options — while HTET TGT lists twelve
-- separate subjects. A candidate sitting Maths & Science at CTET and Science at
-- HTET had no way to say so; the app asked once and applied the answer to both.
--
-- WHAT CHANGES
--
-- The key becomes (user, exam, level). The subject step then asks once per
-- exam-and-level pair the learner actually holds, with that board's own list
-- in front of them, and the progress bar counts those pairs — it already
-- counts sub-steps rather than assuming three.
--
-- EXISTING ROWS
--
-- Three, all from test accounts. Each is backfilled with the learner's own
-- exam that examines that level; anything left without one is deleted rather
-- than guessed, because a subject that belongs to no exam is not answerable
-- and the learner will simply be asked again.

begin;

alter table public.learner_subjects
  add column if not exists exam_id text references public.exams(id) on delete cascade;

update public.learner_subjects ls
set exam_id = (
  select le.exam_id
  from public.learner_exams le
  join public.exam_levels el
    on el.exam_id = le.exam_id and el.level_id = ls.level_id
  where le.user_id = ls.user_id
  order by le.exam_id
  limit 1
)
where ls.exam_id is null;

delete from public.learner_subjects where exam_id is null;

alter table public.learner_subjects alter column exam_id set not null;

alter table public.learner_subjects drop constraint if exists learner_subjects_pkey;
alter table public.learner_subjects add primary key (user_id, exam_id, level_id);

comment on table public.learner_subjects is
  'One row per exam and level the learner answered. Two exams at the same level are two rows, because the boards offer different subjects.';

commit;
