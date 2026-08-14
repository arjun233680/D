-- ---------------------------------------------------------------------------
-- 0009 — elective subjects
--
-- HTET Levels 2 and 3 are a single 60-mark paper whose subject is whichever one
-- the candidate applied in. There is no "TGT paper" — there are twelve, and
-- they differ only in that block. `paper_sections.subject_id` was `not null`,
-- so an elective could only be modelled by inventing a subject for it, which is
-- how Level 2 came to claim it tested Science and Mathematics.
--
-- This makes a section either a fixed subject or an elective group, never both
-- and never neither, and gives profiles and questions somewhere to record which
-- elective they belong to.
--
-- Safe to paste whole into the Supabase SQL editor: one statement per step, no
-- psql meta-commands, and re-running changes nothing.
-- ---------------------------------------------------------------------------

begin;

-- ------------------------------------------------------------- the groups

create table if not exists elective_groups (
  id       text primary key,
  paper_id text not null references exam_papers(id) on delete cascade,
  name     jsonb not null
);

create index if not exists elective_groups_paper_idx on elective_groups(paper_id);

create table if not exists elective_choices (
  group_id   text not null references elective_groups(id) on delete cascade,
  subject_id text not null references subjects(id) on delete cascade,
  sort_order int  not null default 0,
  primary key (group_id, subject_id)
);

create index if not exists elective_choices_subject_idx on elective_choices(subject_id);

-- ------------------------------------------- sections become either/or

alter table paper_sections add column if not exists elective_group_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'paper_sections_elective_group_fk'
  ) then
    alter table paper_sections
      add constraint paper_sections_elective_group_fk
      foreign key (elective_group_id) references elective_groups(id) on delete cascade;
  end if;
end;
$$;

alter table paper_sections alter column subject_id drop not null;

-- Exactly one of the two, mirroring the discriminated union in the TypeScript.
-- A section with both would be ambiguous; one with neither tests nothing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'paper_sections_subject_xor_elective'
  ) then
    alter table paper_sections
      add constraint paper_sections_subject_xor_elective
      check (num_nonnulls(subject_id, elective_group_id) = 1);
  end if;
end;
$$;

-- ------------------------------------------------- who sits which subject

alter table profiles
  add column if not exists elective_subject_id text references subjects(id);

-- Which elective a question belongs to. Null for the common blocks — CDP,
-- Hindi, Reasoning and the rest are the same paper for every candidate.
alter table questions
  add column if not exists elective_subject_id text references subjects(id);

create index if not exists questions_elective_subject_idx
  on questions(elective_subject_id)
  where elective_subject_id is not null;

-- --------------------------------------------- statistics nobody measured

-- `topics.question_count` was seeded with hardcoded figures — 420, 510, 380 —
-- and rendered to learners as "420 in bank" against a library of 67 questions.
-- Real counts come from counting `questions`.
alter table topics drop column if exists question_count;

-- Weightage is a claim about how often a topic has appeared in real papers.
-- The subjects added for the HTET electives have had no such analysis, so the
-- column has to admit "not measured" rather than force a number.
alter table topics alter column weightage drop not null;

-- --------------------------------------------------------------------- RLS

-- Same shape as every other reference table in 0002: world-readable, written
-- only by staff. The syllabus is public information; editing it is not.
alter table elective_groups enable row level security;
alter table elective_choices enable row level security;

drop policy if exists "elective_groups_public_read" on elective_groups;
create policy "elective_groups_public_read" on elective_groups
  for select using (true);

drop policy if exists "elective_groups_staff_write" on elective_groups;
create policy "elective_groups_staff_write" on elective_groups
  for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists "elective_choices_public_read" on elective_choices;
create policy "elective_choices_public_read" on elective_choices
  for select using (true);

drop policy if exists "elective_choices_staff_write" on elective_choices;
create policy "elective_choices_staff_write" on elective_choices
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- Supabase grants its API roles blanket table privileges and leaves RLS as the
-- gate; the new tables have to match or they would be unreadable.
grant select on elective_groups, elective_choices to anon, authenticated;
grant insert, update, delete on elective_groups, elective_choices to authenticated;

commit;
