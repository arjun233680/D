-- Undoes dev-learner-activity.sql.
--
-- Scoped by the same email and nothing else, so it cannot reach another
-- learner's rows. Set it to the account you seeded before running — it appears
-- once per statement, because the Supabase SQL editor has no psql variables.
--
-- This deletes ALL of that account's activity, not only the seeded part: there
-- is no marker distinguishing a seeded attempt from a real one, and inventing
-- one would mean carrying a column in the schema that exists for a script. Run
-- it on a developer account you are willing to empty, which is the only kind of
-- account the seed should ever have been run against.

begin;

with me as (
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.attempt_answers
where attempt_id in (select id from public.attempts where user_id = (select id from me));

with me as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.attempts where user_id = (select id from me);

with me as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.bookmarks where user_id = (select id from me);

with me as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.saved_notes where user_id = (select id from me);

with me as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.enrolments where user_id = (select id from me);

with me as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
  where u.email = 'creativelearningk12@gmail.com'
)
delete from public.activity_days where user_id = (select id from me);

commit;
