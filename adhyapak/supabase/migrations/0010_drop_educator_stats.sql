-- ---------------------------------------------------------------------------
-- 0010 — educator ratings and follower counts
--
-- `educators.rating` was hand-written in the seed (4.9, 4.8, 4.7) and rendered
-- to users as "★ 4.9" on the video page, the batch page and the mobile video
-- screen. Nobody has rated these educators. It is the same defect as
-- `exams.learners`, dropped in 0009, on a different entity.
--
-- `educators.learners` (412,000-634,000) was never rendered anywhere, so it is
-- dead data as well as invented.
--
-- `experience_years` stays: a person's years of teaching is a fact about them,
-- not a measurement of an audience this product does not have.
--
-- Safe to paste whole into the Supabase SQL editor: no psql meta-commands, and
-- re-running changes nothing.
-- ---------------------------------------------------------------------------

begin;

alter table educators drop column if exists rating;
alter table educators drop column if exists learners;

commit;
