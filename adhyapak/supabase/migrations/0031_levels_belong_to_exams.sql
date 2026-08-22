-- 0031 — which levels each exam actually has
--
-- WHY
--
-- The level chooser offered all four levels to everyone. CTET has no PGT — it
-- is Paper I and Paper II, primary and upper-primary — and a CTET candidate
-- was being asked to pick between PRT, TGT, PGT and "Other / Non-Teaching
-- Posts", three of which it does not set. HPSC PGT is the mirror image: it
-- sets one level and offered four.
--
-- "Other / Non-Teaching" was the worst of it. Most of these are teacher
-- eligibility tests and recruit nothing else; the boards that do recruit
-- clerks, wardens and engineers alongside teachers are a handful — DSSSB,
-- KVS, NVS, EMRS and HSSC.
--
-- WHY A TABLE RATHER THAN A DERIVATION
--
-- `exam_papers.level` already implies most of this, and intersecting it with
-- `levels.teaching_levels` gets the teaching levels right. Two things stop
-- that being enough. `other` has an empty `teaching_levels` by construction —
-- a non-teaching post has no class range — so no intersection can ever
-- produce it. And the paper data is itself incomplete: MPTET had only Varg 3,
-- Bihar STET only Paper 1, EMRS only TGT, APS only PRT, and HPSC PGT had no
-- paper at all. A derivation would have silently inherited every one of those
-- gaps.
--
-- The paper rows are being fixed too (0032), but the chooser should not
-- depend on that being complete forever.
--
-- SOURCES
--
-- Level structures checked against each board's current recruitment for
-- 2025-26: MPTET Varg 1/2/3 map to PGT/TGT/PRT; Bihar STET Paper 1 is classes
-- 9-10 and Paper 2 classes 11-12; EMRS recruits PGT, TGT and non-teaching but
-- no PRT; APS (AWES) screens PRT, TGT and PGT; HPSC PGT is PGT only.

begin;

create table if not exists public.exam_levels (
  exam_id  text not null references public.exams(id)  on delete cascade,
  level_id text not null references public.levels(id) on delete cascade,
  primary key (exam_id, level_id)
);

comment on table public.exam_levels is
  'Which levels an exam actually recruits for. The level chooser offers only these.';

alter table public.exam_levels enable row level security;

drop policy if exists exam_levels_public_read on public.exam_levels;
create policy exam_levels_public_read on public.exam_levels
  for select using (true);

drop policy if exists exam_levels_staff_write on public.exam_levels;
create policy exam_levels_staff_write on public.exam_levels
  for all to authenticated using (is_staff()) with check (is_staff());

-- Rebuilt from scratch each time this runs, so re-running it corrects rather
-- than accumulates.
delete from public.exam_levels;

-- The teacher eligibility tests: Paper 1 for classes 1-5, Paper 2 for 6-8.
-- Nothing above class 8 and nothing outside teaching.
insert into public.exam_levels (exam_id, level_id)
select e.id, l.level_id
from public.exams e
cross join (values ('prt'), ('tgt')) as l(level_id)
where e.id in (
  'ctet','reet','uptet','aptet','gtet','hptet','jtet','kartet','ktet',
  'mahatet','otet','pstet','sktet','tntet','tstet','utet','bihartet','wbtet'
);

-- The full-range recruiters: primary through senior secondary.
insert into public.exam_levels (exam_id, level_id)
select e.id, l.level_id
from public.exams e
cross join (values ('prt'), ('tgt'), ('pgt')) as l(level_id)
where e.id in ('htet','dsssb','kvs','nvs','awes','mptet');

-- Secondary and senior secondary only: these boards do not recruit primary.
insert into public.exam_levels (exam_id, level_id)
select e.id, l.level_id
from public.exams e
cross join (values ('tgt'), ('pgt')) as l(level_id)
where e.id in ('hssc-tgt-pgt','emrs','bihar-stet');

-- Single-level exams.
insert into public.exam_levels (exam_id, level_id)
select id, 'prt' from public.exams where id = 'supertet';

insert into public.exam_levels (exam_id, level_id)
select id, 'pgt' from public.exams where id = 'hpsc-pgt';

-- The boards that recruit outside teaching as well. DSSSB alone lists
-- patwaris, stenographers and junior engineers beside its PRT/TGT/PGT posts;
-- KVS, NVS and EMRS run librarian, warden and secretariat vacancies in the
-- same cycle as their teaching ones.
insert into public.exam_levels (exam_id, level_id)
select id, 'other' from public.exams
where id in ('dsssb','kvs','nvs','emrs','hssc-tgt-pgt');

commit;
