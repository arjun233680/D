-- ---------------------------------------------------------------------------
-- 0020 — levels, the subjects each one examines, and what the learner picked
--
-- Onboarding asks three questions now: which exams, which level, which subject.
-- 0019 built the first. This builds the other two, and the shape of the answer
-- is the part worth reading carefully.
--
-- WHY A LEVEL TABLE AND NOT `exam_papers.post`
--
-- `post` already holds PRT, TGT, PGT — and also "Level 1", "Paper I", "Varg 3",
-- "PGT Tier 2". It is what one board calls one of its papers, which is the
-- right thing for a syllabus and the wrong thing for this question. An aspirant
-- preparing for HTET, CTET and DSSSB together is not preparing for three posts;
-- they are preparing to teach a set of classes, and every board has a name for
-- that. `levels` is that shared vocabulary, and it is deliberately short:
-- primary, upper-primary/secondary, senior secondary, and everything else.
--
-- WHY THE SUBJECT HANGS OFF THE LEVEL
--
-- The same word means different things at different levels. "Science" at TGT is
-- one paper covering physics, chemistry and biology; at PGT those are three
-- separate papers and "Science" is not offered at all. So the offer is
-- `level_subjects`, and the hint under each card lives there too — Chemistry
-- reads "Organic, Inorganic, Physical" at PGT and does not appear at TGT.
--
-- WHAT IS DELIBERATELY NOT MODELLED
--
-- Which subject at which level for which *exam*. That is a three-way fact and
-- the boards disagree about it in ways this table would have to invent. The
-- learner picks a level and a subject; `elective_groups` from 0009 remains the
-- authority on what a specific paper actually offers, and the goal picker still
-- consults it. This is the learner's own description of what they study.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — a subject for "none of these"
-- =========================================================================

-- The chooser needs a real row behind its "Other Subject" card. Without one the
-- selection would have to be nullable, and a null subject is indistinguishable
-- from a learner who never answered — which is the state onboarding exists to
-- leave behind.
insert into subjects (id, name, icon, color, description, sort_order) values
  ('other-subject',
   '{"en":"Other Subject","hi":"अन्य विषय"}'::jsonb,
   '⋯',
   '#64748B',
   '{"en":"For a subject this list does not carry yet. Tell us and it gets added.","hi":"ऐसे विषय के लिए जो अभी इस सूची में नहीं है। बताइए, जोड़ दिया जाएगा।"}'::jsonb,
   99)
on conflict (id) do nothing;

-- =========================================================================
-- STEP 2 — levels
-- =========================================================================

create table if not exists levels (
  id text primary key,
  name text not null,
  full_name jsonb not null,
  classes jsonb,
  icon text not null,
  color text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

comment on table levels is
  'The teaching levels an aspirant prepares for, in the vocabulary they use. Distinct from exam_papers.post, which is one board''s name for one of its papers.';

insert into levels (id, name, full_name, classes, icon, color, sort_order) values
  ('prt', 'PRT',
   '{"en":"Primary Teacher","hi":"प्राथमिक शिक्षक"}'::jsonb,
   '{"en":"Classes 1 to 5","hi":"कक्षा 1 से 5"}'::jsonb,
   '🔤', '#16A34A', 10),
  ('tgt', 'TGT',
   '{"en":"Trained Graduate Teacher","hi":"प्रशिक्षित स्नातक शिक्षक"}'::jsonb,
   '{"en":"Classes 6 to 10","hi":"कक्षा 6 से 10"}'::jsonb,
   '📘', '#6D4AED', 20),
  ('pgt', 'PGT',
   '{"en":"Post Graduate Teacher","hi":"स्नातकोत्तर शिक्षक"}'::jsonb,
   '{"en":"Classes 11 to 12","hi":"कक्षा 11 से 12"}'::jsonb,
   '📙', '#EA580C', 30),
  ('other', 'Other',
   '{"en":"Other / Non-Teaching Posts","hi":"अन्य / गैर-शिक्षण पद"}'::jsonb,
   null,
   '⋯', '#64748B', 40)
on conflict (id) do nothing;

alter table levels enable row level security;

drop policy if exists "levels_public_read" on levels;
create policy "levels_public_read" on levels for select using (true);

-- Content, like every other content table since 0002: staff write, everybody
-- reads. A level is not a learner's data.
drop policy if exists "levels_staff_write" on levels;
create policy "levels_staff_write" on levels
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- =========================================================================
-- STEP 3 — which subjects each level examines
-- =========================================================================

create table if not exists level_subjects (
  level_id text not null references levels(id) on delete cascade,
  subject_id text not null references subjects(id) on delete cascade,
  /* The line under the subject's name on the chooser card. Lives here rather
     than on `subjects` because it differs by level: Science reads "Physics,
     Chemistry, Biology" at TGT, and at PGT those are three separate papers. */
  hint jsonb,
  sort_order integer not null default 100,
  primary key (level_id, subject_id)
);

comment on table level_subjects is
  'The subjects offered at each teaching level, with the per-level hint shown on the chooser card.';

insert into level_subjects (level_id, subject_id, hint, sort_order) values
  -- Primary is taught as a whole rather than by subject, so the offer here is
  -- the primary paper's own blocks.
  ('prt', 'cdp',  '{"en":"Child psychology, learning, inclusive education","hi":"बाल मनोविज्ञान, अधिगम, समावेशी शिक्षा"}'::jsonb, 10),
  ('prt', 'math', '{"en":"Number sense, geometry, measurement","hi":"संख्या ज्ञान, ज्यामिति, मापन"}'::jsonb, 20),
  ('prt', 'evs',  '{"en":"Family, plants, animals, our surroundings","hi":"परिवार, पौधे, जंतु, हमारा परिवेश"}'::jsonb, 30),
  ('prt', 'hindi','{"en":"व्याकरण, बोधगम्यता, भाषा शिक्षाशास्त्र","hi":"व्याकरण, बोधगम्यता, भाषा शिक्षाशास्त्र"}'::jsonb, 40),
  ('prt', 'english', '{"en":"Language, grammar, comprehension","hi":"भाषा, व्याकरण, बोधगम्यता"}'::jsonb, 50),
  ('prt', 'other-subject', '{"en":"Select if your subject is not listed above","hi":"यदि आपका विषय ऊपर नहीं है तो चुनें"}'::jsonb, 900),

  ('tgt', 'science', '{"en":"Physics, Chemistry, Biology","hi":"भौतिकी, रसायन, जीव विज्ञान"}'::jsonb, 10),
  ('tgt', 'math',    '{"en":"Algebra, Geometry, Arithmetic","hi":"बीजगणित, ज्यामिति, अंकगणित"}'::jsonb, 20),
  ('tgt', 'sst',     '{"en":"History, Geography, Civics, Economics","hi":"इतिहास, भूगोल, नागरिकशास्त्र, अर्थशास्त्र"}'::jsonb, 30),
  ('tgt', 'english', '{"en":"Language, Grammar, Comprehension","hi":"भाषा, व्याकरण, बोधगम्यता"}'::jsonb, 40),
  ('tgt', 'hindi',   '{"en":"व्याकरण, साहित्य, भाषा अध्ययन","hi":"व्याकरण, साहित्य, भाषा अध्ययन"}'::jsonb, 50),
  ('tgt', 'sanskrit','{"en":"व्याकरण, साहित्य, संस्कृत भाषा","hi":"व्याकरण, साहित्य, संस्कृत भाषा"}'::jsonb, 60),
  ('tgt', 'computer-science', '{"en":"Computer Fundamentals, Programming, IT","hi":"कंप्यूटर मूलभूत, प्रोग्रामिंग, आईटी"}'::jsonb, 70),
  ('tgt', 'art',     '{"en":"Drawing, Painting, Visual Arts","hi":"चित्रकला, पेंटिंग, दृश्य कला"}'::jsonb, 80),
  ('tgt', 'physical-education', '{"en":"Sports, Fitness, Health Education","hi":"खेल, स्वास्थ्य, शारीरिक शिक्षा"}'::jsonb, 90),
  ('tgt', 'other-subject', '{"en":"Select if your subject is not listed above","hi":"यदि आपका विषय ऊपर नहीं है तो चुनें"}'::jsonb, 900),

  ('pgt', 'chemistry', '{"en":"Organic, Inorganic, Physical, Analytical","hi":"कार्बनिक, अकार्बनिक, भौतिक, विश्लेषणात्मक"}'::jsonb, 10),
  ('pgt', 'physics',   '{"en":"Mechanics, Electricity, Magnetism, Modern Physics","hi":"यांत्रिकी, विद्युत, चुंबकत्व, आधुनिक भौतिकी"}'::jsonb, 20),
  ('pgt', 'biology',   '{"en":"Botany, Zoology, Genetics, Microbiology","hi":"वनस्पति, प्राणि, आनुवंशिकी, सूक्ष्मजीव विज्ञान"}'::jsonb, 30),
  ('pgt', 'math',      '{"en":"Algebra, Calculus, Statistics, Geometry","hi":"बीजगणित, कलन, सांख्यिकी, ज्यामिति"}'::jsonb, 40),
  ('pgt', 'computer-science', '{"en":"Data Structures, DBMS, Algorithms","hi":"डेटा संरचना, DBMS, एल्गोरिद्म"}'::jsonb, 50),
  ('pgt', 'geography', '{"en":"Physical, Human, Environmental Geography","hi":"भौतिक, मानव, पर्यावरणीय भूगोल"}'::jsonb, 60),
  ('pgt', 'history',   '{"en":"Ancient, Medieval, Modern, World History","hi":"प्राचीन, मध्यकालीन, आधुनिक, विश्व इतिहास"}'::jsonb, 70),
  ('pgt', 'political-science', '{"en":"Indian Government, Comparative Politics","hi":"भारतीय शासन, तुलनात्मक राजनीति"}'::jsonb, 80),
  ('pgt', 'english',   '{"en":"Literature, Language, Grammar, Comprehension","hi":"साहित्य, भाषा, व्याकरण, बोधगम्यता"}'::jsonb, 90),
  ('pgt', 'sociology', '{"en":"Society, Social Institutions, Research Methods","hi":"समाज, सामाजिक संस्थाएँ, शोध पद्धति"}'::jsonb, 100),
  ('pgt', 'economics', '{"en":"Micro Economics, Macro Economics, Indian Economy","hi":"सूक्ष्म अर्थशास्त्र, समष्टि अर्थशास्त्र, भारतीय अर्थव्यवस्था"}'::jsonb, 110),
  ('pgt', 'other-subject', '{"en":"Select if your subject is not listed above","hi":"यदि आपका विषय ऊपर नहीं है तो चुनें"}'::jsonb, 900),

  -- Non-teaching recruitment is examined on the general papers rather than on a
  -- teaching subject, so this level offers those.
  ('other', 'gk',        '{"en":"Current affairs, static GK","hi":"समसामयिकी, स्थैतिक सामान्य ज्ञान"}'::jsonb, 10),
  ('other', 'reasoning', '{"en":"Verbal and non-verbal reasoning","hi":"शाब्दिक एवं अशाब्दिक तर्कशक्ति"}'::jsonb, 20),
  ('other', 'quantitative-aptitude', '{"en":"Arithmetic, data interpretation","hi":"अंकगणित, आँकड़ा निर्वचन"}'::jsonb, 30),
  ('other', 'computer',  '{"en":"Computer fundamentals, MS Office","hi":"कंप्यूटर मूलभूत, MS Office"}'::jsonb, 40),
  ('other', 'other-subject', '{"en":"Select if your subject is not listed above","hi":"यदि आपका विषय ऊपर नहीं है तो चुनें"}'::jsonb, 900)
on conflict (level_id, subject_id) do nothing;

alter table level_subjects enable row level security;

drop policy if exists "level_subjects_public_read" on level_subjects;
create policy "level_subjects_public_read" on level_subjects for select using (true);

drop policy if exists "level_subjects_staff_write" on level_subjects;
create policy "level_subjects_staff_write" on level_subjects
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- =========================================================================
-- STEP 4 — what the learner picked
-- =========================================================================

create table if not exists learner_levels (
  user_id uuid not null references profiles(id) on delete cascade,
  level_id text not null references levels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

/**
 * The subject chosen for each level.
 *
 * Keyed by level as well as by learner, because the question is asked once per
 * level: somebody sitting both TGT and PGT answers "Science" and "Chemistry",
 * and the dashboard shows those as two separate lines of preparation. One row
 * per level, so choosing again replaces rather than accumulates.
 */
create table if not exists learner_subjects (
  user_id uuid not null references profiles(id) on delete cascade,
  level_id text not null references levels(id) on delete cascade,
  subject_id text not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create index if not exists learner_levels_level_id_idx on learner_levels (level_id);
create index if not exists learner_subjects_subject_id_idx on learner_subjects (subject_id);

alter table learner_levels enable row level security;
alter table learner_subjects enable row level security;

drop policy if exists "learner_levels_own" on learner_levels;
create policy "learner_levels_own" on learner_levels
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "learner_subjects_own" on learner_subjects;
create policy "learner_subjects_own" on learner_subjects
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- STEP 5 — writing the answers
-- =========================================================================

/**
 * Replaces the learner's set of levels.
 *
 * Dropping a level takes its subject with it, in the same statement. A TGT
 * subject left behind by a learner who no longer sits TGT would render on the
 * dashboard as a line of preparation for a level they have told us they are not
 * preparing for, which is worse than losing the answer.
 */
create or replace function set_learner_levels(p_level_ids text[])
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

  delete from learner_subjects
  where user_id = v_user
    and level_id <> all (coalesce(p_level_ids, '{}'));

  delete from learner_levels
  where user_id = v_user
    and level_id <> all (coalesce(p_level_ids, '{}'));

  insert into learner_levels (user_id, level_id)
  select v_user, l.id
  from levels l
  where l.id = any (coalesce(p_level_ids, '{}'))
  on conflict (user_id, level_id) do nothing;
end;
$$;

/**
 * Records the subject for one level.
 *
 * Checked against `level_subjects` rather than trusted: the client filters the
 * grid to the right level, but a client can be asked for anything, and a PGT
 * subject saved against TGT would put a syllabus on the dashboard that the
 * level does not teach.
 */
create or replace function set_learner_subject(p_level_id text, p_subject_id text)
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

  if not exists (
    select 1 from level_subjects
    where level_id = p_level_id and subject_id = p_subject_id
  ) then
    raise exception 'subject % is not offered at level %', p_subject_id, p_level_id;
  end if;

  -- Only for a level the learner actually sits, so a stale open tab cannot
  -- resurrect a level they removed a moment ago.
  if not exists (
    select 1 from learner_levels where user_id = v_user and level_id = p_level_id
  ) then
    raise exception 'level % is not one of yours', p_level_id;
  end if;

  insert into learner_subjects (user_id, level_id, subject_id)
  values (v_user, p_level_id, p_subject_id)
  on conflict (user_id, level_id)
  do update set subject_id = excluded.subject_id, created_at = now();
end;
$$;

revoke all on function set_learner_levels(text[]) from public, anon;
revoke all on function set_learner_subject(text, text) from public, anon;
grant execute on function set_learner_levels(text[]) to authenticated;
grant execute on function set_learner_subject(text, text) to authenticated;

commit;
