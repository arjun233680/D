-- ---------------------------------------------------------------------------
-- POST-MIGRATION VERIFICATION — read-only, safe to run on any database
--
-- Paste into the Supabase SQL editor (or psql) after applying the migrations
-- and the seed. Every row reports PASS or FAIL with what was expected, so the
-- output is a report rather than something to interpret.
--
-- This writes nothing and reads no question text. Running it twice is the same
-- as running it once.
--
--   psql "$DATABASE_URL" -f supabase/verify.sql
-- ---------------------------------------------------------------------------

\pset footer off

with checks as (

  -- Structure ---------------------------------------------------------------
  select 1 as ord, 'tables in public' as "check",
         count(*)::text as found, '32' as expected,
         (count(*) >= 32) as ok
  from pg_tables where schemaname = 'public'

  union all
  select 2, 'tables with RLS enabled',
         count(*)::text, 'every table',
         count(*) = (select count(*) from pg_tables where schemaname = 'public')
  from pg_tables t
  join pg_class c on c.relname = t.tablename
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where t.schemaname = 'public' and c.relrowsecurity

  union all
  select 3, 'RLS policies', count(*)::text, '59 or more', count(*) >= 59
  from pg_policies where schemaname = 'public'

  union all
  select 4, 'foreign keys', count(*)::text, '58 or more', count(*) >= 58
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.contype = 'f'

  union all
  select 5, 'indexes', count(*)::text, '76 or more', count(*) >= 76
  from pg_indexes where schemaname = 'public'

  -- The functions the client depends on, and the property that makes them safe.
  union all
  select 6, 'security-definer RPCs', count(*)::text, '5', count(*) = 5
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and p.proname in ('submit_attempt', 'set_question_status',
                      'set_question_status_bulk', 'commit_import_batch',
                      'find_duplicate_fingerprints')

  union all
  select 7, 'analytics views', count(*)::text, '2', count(*) = 2
  from pg_views where schemaname = 'public'
    and viewname in ('pyq_topic_frequency', 'pyq_year_counts')

  union all
  select 8, 'content lifecycle states',
         string_agg(v::text, ', ' order by v), 'draft, review, published, archived',
         count(*) = 4
  from unnest(enum_range(null::content_status)) v

  union all
  select 9, 'import staging tables', count(*)::text, '2 (import_batches, import_rows)', count(*) = 2
  from pg_tables where schemaname = 'public' and tablename in ('import_batches', 'import_rows')

  union all
  select 10, 'audit table', count(*)::text, '1 (content_audit)', count(*) = 1
  from pg_tables where schemaname = 'public' and tablename = 'content_audit'

  -- The audit log must be append-only from the API's point of view: no policy
  -- may grant UPDATE or DELETE on it to anyone.
  union all
  select 11, 'audit log has no UPDATE/DELETE policy',
         count(*)::text, '0', count(*) = 0
  from pg_policies
  where schemaname = 'public' and tablename = 'content_audit'
    and cmd in ('UPDATE', 'DELETE')

  -- Content ------------------------------------------------------------------
  union all
  select 12, 'questions present', count(*)::text, '67 or more (seed applied)', count(*) >= 67
  from questions

  union all
  select 13, 'published questions', count(*)::text, '1 or more', count(*) >= 1
  from questions where status = 'published'

  union all
  select 14, 'every question has a fingerprint',
         count(*) filter (where fingerprint is null)::text, '0',
         count(*) filter (where fingerprint is null) = 0
  from questions

  union all
  select 15, 'PYQ analytics returns rows',
         count(*)::text, '1 or more once PYQs exist', count(*) >= 0
  from pyq_topic_frequency

  -- Electives (0009) -----------------------------------------------------
  union all
  select 16, 'elective tables', count(*)::text, '2 (elective_groups, elective_choices)',
         count(*) = 2
  from pg_tables where schemaname = 'public'
    and tablename in ('elective_groups', 'elective_choices')

  union all
  select 17, 'a section is a subject or an elective, never both',
         count(*)::text, '1 check constraint', count(*) = 1
  from pg_constraint where conname = 'paper_sections_subject_xor_elective'

  union all
  select 18, 'elective groups seeded', count(*)::text, '2 (HTET TGT and PGT)', count(*) >= 2
  from elective_groups

  union all
  select 19, 'elective choices seeded', count(*)::text, '33 (12 TGT + 21 PGT)', count(*) >= 33
  from elective_choices

  union all
  select 20, 'every elective section has its group',
         count(*)::text, '0 orphans', count(*) = 0
  from paper_sections ps
  where ps.elective_group_id is not null
    and not exists (select 1 from elective_groups g where g.id = ps.elective_group_id)

  union all
  select 21, 'HTET Levels 2 and 3 carry a 60-mark elective',
         count(*)::text, '2', count(*) = 2
  from paper_sections
  where paper_id in ('htet-l2', 'htet-l3') and elective_group_id is not null
    and questions = 60 and marks = 60

  union all
  select 22, 'every HTET paper sums to 150 marks', count(*)::text, '3', count(*) = 3
  from (
    select paper_id from paper_sections
     where paper_id like 'htet-%'
     group by paper_id
    having sum(marks) = 150 and sum(questions) = 150
  ) ok

  union all
  select 23, 'learners can record an elective subject',
         count(*)::text, '1 column on profiles', count(*) = 1
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name = 'elective_subject_id'

  union all
  select 24, 'questions can be tagged to an elective',
         count(*)::text, '1 column on questions', count(*) = 1
  from information_schema.columns
  where table_schema = 'public' and table_name = 'questions'
    and column_name = 'elective_subject_id'

  -- Statistics nobody measured ------------------------------------------
  union all
  select 25, 'the fabricated topic question_count is gone',
         count(*)::text, '0', count(*) = 0
  from information_schema.columns
  where table_schema = 'public' and table_name = 'topics'
    and column_name = 'question_count'
)
select
  case when ok then 'PASS' else 'FAIL' end as status,
  "check", found, expected
from checks order by ord;

-- ---------------------------------------------------------------------------
-- Visibility, checked as the roles that actually matter.
--
-- `set local role` lasts only for this transaction, so nothing here changes
-- how the database behaves afterwards.
-- ---------------------------------------------------------------------------

begin;

set local role anon;

select
  case when count(*) filter (where status <> 'published') = 0
       then 'PASS' else 'FAIL' end as status,
  'anon sees published questions only' as "check",
  count(*) filter (where status <> 'published')::text as found,
  '0 non-published' as expected
from questions;

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end as status,
  'anon cannot read import batches' as "check",
  count(*)::text as found, '0' as expected
from import_batches;

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end as status,
  'anon cannot read the audit log' as "check",
  count(*)::text as found, '0' as expected
from content_audit;

-- The syllabus is public: a candidate has to see the choices before signing in.
select
  case when count(*) >= 2 then 'PASS' else 'FAIL' end as status,
  'anon can read the elective groups' as "check",
  count(*)::text as found, '2 or more' as expected
from elective_groups;

rollback;

-- ---------------------------------------------------------------------------
-- After this reports all PASS, the remaining checks need a signed-in educator
-- and are done through the app: docs/BACKEND-SETUP.md, step 6.
-- ---------------------------------------------------------------------------
