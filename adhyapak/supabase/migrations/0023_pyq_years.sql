-- ---------------------------------------------------------------------------
-- 0023 — which past papers exist, apart from which have been collected
--
-- The PYQ browser derived its year list from `questions.year`, so with an empty
-- bank it listed nothing and said "no papers loaded yet". That conflated two
-- different facts:
--
--   HTET has been held every year from 2018 to 2024. That is true whatever is
--   in our database.
--
--   How many of those questions we have typed up. That is currently none.
--
-- An aspirant opening "Previous Year" wants to see the seven years — that is
-- the shape of what they are preparing against — and then wants to know how
-- much of each we actually have. Hiding the year because the count is zero
-- answers the second question by deleting the first.
--
-- So the years are their own table, and the counts stay derived from the bank.
-- A year card reads "2019 · 0 questions" until a paper is imported, and then
-- reads the real figure without anything here changing.
--
-- Deliberately not `exam_papers`: that is the blueprint of a paper's shape —
-- Level 2, 150 questions, these sections — and it does not repeat per year. A
-- session is a different thing: the year the board actually held the exam.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

create table if not exists pyq_years (
  exam_id text not null references exams(id) on delete cascade,
  year integer not null,
  /* What the board's own paper carried that year, where it is known. Null
     rather than a guess: it is used to say "40 of 150 collected", and a made-up
     denominator would make a real numerator lie. */
  paper_questions integer,
  primary key (exam_id, year)
);

comment on table pyq_years is
  'Years an exam was actually held, independent of how many of its questions are in the bank. The PYQ browser lists these; counts come from `questions`.';

create index if not exists pyq_years_exam_idx on pyq_years (exam_id, year desc);

alter table pyq_years enable row level security;

drop policy if exists "pyq_years_public_read" on pyq_years;
create policy "pyq_years_public_read" on pyq_years for select using (true);

drop policy if exists "pyq_years_staff_write" on pyq_years;
create policy "pyq_years_staff_write" on pyq_years
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- HTET, 2018 to 2024. Every level of the paper carries 150 questions, which is
-- stable across these years and is the one figure worth stating.
insert into pyq_years (exam_id, year, paper_questions)
select 'htet', y, 150 from generate_series(2018, 2024) as y
on conflict (exam_id, year) do nothing;

commit;
