-- ---------------------------------------------------------------------------
-- 0019 — the exam chooser
--
-- The first screen after sign-in asks which teaching exams the learner is
-- preparing for, and lets them pick more than one. Three things were missing
-- for it, and none of them are cosmetic:
--
--   1. An order. `listExams` sorted by `short_name`, which is alphabetical and
--      therefore puts AP TET above CTET. A chooser opens on a grid of a dozen
--      cards, and the dozen a teaching aspirant most often wants are not the
--      dozen that sort first. `sort_order` makes that order data rather than a
--      hardcoded list in the client.
--
--   2. A way to say "important". The screen filters by All / Centre / State /
--      Important. The first three `scope` already answers; the fourth is an
--      editorial judgement about which exams draw the most candidates, so it
--      gets a column of its own rather than being inferred from vacancies or
--      guessed in the client.
--
--   3. Somewhere to keep the answer. `profiles.goal_exam_id` holds exactly one
--      exam and is the target the whole app is scoped to — which paper, which
--      electives, which cut-off. That is deliberately singular and stays so.
--      What it cannot record is the honest situation of most aspirants: they
--      sit CTET *and* their own state's TET *and* whichever recruitment opens.
--      `learner_exams` records that set. The goal remains the one exam the app
--      is pointed at; this is the wider net the learner is fishing with, and it
--      is what the chooser writes.
--
-- Also adds HPSC PGT, which the chooser lists and the table did not have.
--
-- BPSC TRE is deliberately NOT added as its own row. It already lives inside
-- `bihartet` ("Bihar TET / BPSC TRE"), which owns the papers and sections that
-- exam_papers rows point at. Splitting it would orphan them, and a second Bihar
-- row would put two nearly identical cards next to each other in the chooser.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — exams learn where they sit in a grid, and whether they headline
-- =========================================================================

alter table exams add column if not exists sort_order integer not null default 500;
alter table exams add column if not exists featured boolean not null default false;

comment on column exams.sort_order is
  'Position in the exam chooser grid. Lower sorts first; 500 is the unranked default, which then falls back to short_name.';
comment on column exams.featured is
  'Shown under the chooser''s "Important" filter. Editorial: the exams that draw the most candidates, not a computed figure.';

-- ------------------------------------------------------------ HPSC PGT
--
-- Haryana's PGT recruitment, run by the state public service commission rather
-- than by the school board that runs HTET. A candidate needs HTET to qualify
-- and then sits this to be recruited, so the two are different exams and both
-- belong in the list.
--
-- `updates` and `sources` are left empty, as in 0015 and 0016: the paper
-- pattern is stable enough to state, a cycle's dates are not, and `sources` is
-- rendered to the learner as where each claim was checked. An invented citation
-- would be worse than an honest gap.

insert into exams (
  id, slug, name, short_name, authority, scope, state, about, frequency,
  color, emoji, next_exam_date, eligibility, highlights, official_site, vacancies
) values (
  'hpsc-pgt',
  'hpsc-pgt',
  '{"en":"HPSC PGT — Haryana Post Graduate Teacher","hi":"HPSC PGT — हरियाणा स्नातकोत्तर शिक्षक"}'::jsonb,
  'HPSC PGT',
  '{"en":"Haryana Public Service Commission","hi":"हरियाणा लोक सेवा आयोग"}'::jsonb,
  'state',
  '{"en":"Haryana","hi":"हरियाणा"}'::jsonb,
  '{"en":"Recruitment to Post Graduate Teacher posts in Haryana government schools, conducted by HPSC. HTET qualification is a prerequisite; this exam is the recruitment stage that follows it.","hi":"हरियाणा के सरकारी विद्यालयों में स्नातकोत्तर शिक्षक (PGT) पदों पर भर्ती हेतु HPSC द्वारा आयोजित। HTET उत्तीर्ण होना अनिवार्य पूर्व-शर्त है; यह परीक्षा उसके बाद की भर्ती अवस्था है।"}'::jsonb,
  '{"en":"As vacancies are notified","hi":"रिक्तियों की अधिसूचना के अनुसार"}'::jsonb,
  '#BE123C',
  '📕',
  null,
  '[{"en":"Post-graduation in the subject with 50%, plus B.Ed","hi":"संबंधित विषय में स्नातकोत्तर 50% अंकों सहित, तथा B.Ed"},{"en":"HTET (Level 3 / PGT) qualification","hi":"HTET (स्तर 3 / PGT) उत्तीर्ण"}]'::jsonb,
  '[{"en":"Subject knowledge carries the largest share of the paper","hi":"विषय ज्ञान का पेपर में सबसे बड़ा भाग"},{"en":"Includes Haryana general knowledge","hi":"हरियाणा सामान्य ज्ञान सम्मिलित"},{"en":"Negative marking applies","hi":"नकारात्मक अंकन लागू"}]'::jsonb,
  'https://hpsc.gov.in',
  null
)
on conflict (id) do nothing;

-- --------------------------------------------------------------- the order
--
-- Written as one values list rather than thirteen updates so the intended
-- reading order is visible in one glance, and so re-running restates it exactly
-- rather than drifting. Everything not named here keeps sort_order 500 and
-- sorts alphabetically after these, which is the right answer for the long
-- tail of state TETs — no editorial claim is being made about them.

update exams e
set sort_order = v.sort_order,
    featured = true
from (values
  ('ctet',         10),
  ('htet',         20),
  ('dsssb',        30),
  ('reet',         40),
  ('uptet',        50),
  ('kvs',          60),
  ('nvs',          70),
  ('supertet',     80),
  ('hssc-tgt-pgt', 90),
  ('hpsc-pgt',    100),
  ('bihartet',    110),
  ('mptet',       120),
  ('mahatet',     130)
) as v(id, sort_order)
where e.id = v.id;

-- The remaining central exams outrank the long tail of state TETs without
-- being headlined: they are open to candidates from every state, so they are
-- relevant to more of the audience than any single state's test.
update exams
set sort_order = 200
where scope = 'national' and sort_order = 500;

-- =========================================================================
-- STEP 2 — the exams a learner is preparing for
-- =========================================================================

/**
 * The set of exams a learner is working towards.
 *
 * Distinct from `profiles.goal_exam_id`, which is the single exam the app is
 * scoped to — the countdown, the syllabus, the cut-off and the PYQ filters all
 * read that one. This table is the wider set the learner told us about, and it
 * is what the chooser writes. Keeping them apart means picking five exams does
 * not make five dashboards, and dropping one from this list does not silently
 * repoint the app at a different syllabus.
 *
 * A composite primary key rather than a surrogate id: the pair *is* the fact,
 * and it makes "already chosen" an insert conflict rather than a query.
 */
create table if not exists learner_exams (
  user_id uuid not null references profiles(id) on delete cascade,
  exam_id text not null references exams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

comment on table learner_exams is
  'Exams a learner said they are preparing for. The app is still scoped to profiles.goal_exam_id; this is the wider set, written by the exam chooser.';

-- Reading "who else is preparing for CTET" is not something any screen does
-- today, but the foreign key needs the index for cascading deletes to stay
-- cheap as the table grows.
create index if not exists learner_exams_exam_id_idx on learner_exams (exam_id);

alter table learner_exams enable row level security;

-- Nobody sees anybody else's choices, and nobody writes to another row. There
-- is deliberately no staff read policy: which exams an aspirant is preparing
-- for is theirs, and no screen in the Studio asks.
drop policy if exists "learner_exams_own_read" on learner_exams;
create policy "learner_exams_own_read" on learner_exams
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "learner_exams_own_write" on learner_exams;
create policy "learner_exams_own_write" on learner_exams
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- STEP 3 — writing the whole set in one call
-- =========================================================================

/**
 * Replaces the learner's exam set.
 *
 * One call rather than a delete followed by inserts from the client, because
 * the two halves must not be separable: a client that deleted and then lost
 * its connection would leave an aspirant with no exams at all, and the screen
 * that asks this question is the one standing between them and the app.
 *
 * `security definer` for the same reason `set_goal` is — it writes only ever to
 * `auth.uid()`'s own rows, which the body enforces rather than trusting a
 * parameter, so there is nothing a caller can pass to reach another learner.
 *
 * Unknown exam ids are dropped rather than raising. The chooser sends what it
 * rendered, and an id that no longer exists means content moved underneath a
 * screen someone left open — failing the whole call there would strand them on
 * a form they cannot submit, for a row they never asked about.
 */
create or replace function set_learner_exams(p_exam_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;

  delete from learner_exams
  where user_id = v_user
    and exam_id <> all (coalesce(p_exam_ids, '{}'));

  insert into learner_exams (user_id, exam_id)
  select v_user, e.id
  from exams e
  where e.id = any (coalesce(p_exam_ids, '{}'))
  on conflict (user_id, exam_id) do nothing;
end;
$$;

revoke all on function set_learner_exams(text[]) from public, anon;
grant execute on function set_learner_exams(text[]) to authenticated;

commit;
