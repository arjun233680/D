-- Adhyapak — core schema
--
-- Content tables (exams … tests) are world-readable and written only by
-- educators and admins. User tables (profiles … attempts) are private to their
-- owner. Every bilingual string is stored as a jsonb `{ "en": …, "hi": … }`
-- object so the API returns exactly the `Bilingual` shape the apps already use.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- taxonomy

create table if not exists subjects (
  id            text primary key,
  name          jsonb not null,
  icon          text  not null,
  color         text  not null,
  description   jsonb not null,
  sort_order    int   not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists topics (
  id            text primary key,
  subject_id    text not null references subjects(id) on delete cascade,
  name          jsonb not null,
  -- Historical share of questions, drives the "high yield" badge.
  weightage     int  not null check (weightage between 0 and 100),
  question_count int not null default 0
);
create index if not exists topics_subject_idx on topics(subject_id);

-- ------------------------------------------------------------------- exams

create table if not exists exams (
  id             text primary key,
  slug           text not null unique,
  name           jsonb not null,
  short_name     text  not null,
  authority      jsonb not null,
  scope          text  not null check (scope in ('national','state')),
  state          jsonb,
  about          jsonb not null,
  frequency      jsonb not null,
  color          text  not null,
  emoji          text  not null,
  learners       bigint not null default 0,
  next_exam_date date,
  eligibility    jsonb not null default '[]'::jsonb,
  highlights     jsonb not null default '[]'::jsonb,
  official_site  text  not null,
  vacancies      int,
  updated_at     timestamptz not null default now()
);

-- A dated, cited fact in the exam's cycle.
create table if not exists exam_updates (
  id         uuid primary key default gen_random_uuid(),
  exam_id    text not null references exams(id) on delete cascade,
  date       date not null,
  kind       text not null check (kind in ('notification','application','exam','result','vacancy')),
  title      jsonb not null,
  detail     jsonb not null
);
create index if not exists exam_updates_exam_idx on exam_updates(exam_id, date desc);

-- Where a claim was verified. Surfaced to the learner, so it is content, not metadata.
create table if not exists exam_sources (
  id         uuid primary key default gen_random_uuid(),
  exam_id    text not null references exams(id) on delete cascade,
  label      text not null,
  url        text not null,
  checked_on date not null
);
create index if not exists exam_sources_exam_idx on exam_sources(exam_id);

create table if not exists exam_papers (
  id                text primary key,
  exam_id           text not null references exams(id) on delete cascade,
  name              jsonb not null,
  level             text not null check (level in
                      ('primary','upper-primary','secondary','senior-secondary','eligibility')),
  marks_per_question numeric(4,2) not null default 1,
  negative_marking  numeric(4,2) not null default 0,
  duration_minutes  int not null,
  total_questions   int not null,
  cutoff_general    numeric(5,2) not null,
  cutoff_reserved   numeric(5,2) not null,
  sort_order        int not null default 0
);
create index if not exists exam_papers_exam_idx on exam_papers(exam_id);

create table if not exists paper_sections (
  id         uuid primary key default gen_random_uuid(),
  paper_id   text not null references exam_papers(id) on delete cascade,
  subject_id text not null references subjects(id),
  questions  int not null,
  marks      int not null,
  sort_order int not null default 0
);
create index if not exists paper_sections_paper_idx on paper_sections(paper_id);

-- --------------------------------------------------------------- educators

create table if not exists educators (
  id               text primary key,
  name             text not null,
  avatar           text not null,
  headline         jsonb not null,
  bio              jsonb not null,
  subjects         text[] not null default '{}',
  experience_years int not null default 0,
  rating           numeric(2,1) not null default 0,
  learners         bigint not null default 0,
  languages        text[] not null default '{hi,en}',
  -- Set once an educator signs in, so Studio uploads can be attributed.
  user_id          uuid unique references auth.users(id) on delete set null
);

-- --------------------------------------------------------------- questions

create table if not exists questions (
  id            text primary key,
  subject_id    text not null references subjects(id),
  topic_id      text not null references topics(id),
  exam_ids      text[] not null default '{}',
  text          jsonb not null,
  -- Ordered array of bilingual options.
  options       jsonb not null,
  correct_index int not null check (correct_index >= 0),
  explanation   jsonb not null,
  difficulty    text not null check (difficulty in ('easy','medium','hard')),
  previous_year text,
  avg_time_seconds int not null default 40,
  -- Share of learners answering correctly, 0-1. Recomputed from attempts.
  accuracy      numeric(4,3) not null default 0.5,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists questions_subject_idx on questions(subject_id);
create index if not exists questions_topic_idx   on questions(topic_id);
create index if not exists questions_exams_idx   on questions using gin(exam_ids);
create index if not exists questions_pyq_idx     on questions(previous_year)
  where previous_year is not null;

-- ------------------------------------------------------------------ notes

create table if not exists notes (
  id          text primary key,
  title       jsonb not null,
  subject_id  text not null references subjects(id),
  topic_id    text references topics(id),
  exam_ids    text[] not null default '{}',
  educator_id text references educators(id) on delete set null,
  -- Storage object path in the `notes` bucket, when a PDF was uploaded.
  file_path   text,
  pages       int not null default 1,
  downloads   bigint not null default 0,
  access      text not null default 'free' check (access in ('free','plus','iconic')),
  language    text not null default 'both' check (language in ('en','hi','both')),
  tags        jsonb not null default '[]'::jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);
create index if not exists notes_subject_idx on notes(subject_id);
create index if not exists notes_exams_idx   on notes using gin(exam_ids);

create table if not exists note_sections (
  id         uuid primary key default gen_random_uuid(),
  note_id    text not null references notes(id) on delete cascade,
  heading    jsonb not null,
  body       jsonb not null,
  callout    jsonb,
  bullets    jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);
create index if not exists note_sections_note_idx on note_sections(note_id, sort_order);

-- ----------------------------------------------------------------- videos

create table if not exists videos (
  id            text primary key,
  title         jsonb not null,
  description   jsonb not null,
  educator_id   text references educators(id) on delete set null,
  subject_id    text not null references subjects(id),
  topic_id      text references topics(id),
  exam_ids      text[] not null default '{}',
  -- Storage object path in the `videos` bucket, or an external HLS/MP4 URL.
  storage_path  text,
  external_url  text,
  thumbnail     text not null default '#4F46E5',
  duration_seconds int not null default 0,
  views         bigint not null default 0,
  published_at  date not null default current_date,
  access        text not null default 'free' check (access in ('free','plus','iconic')),
  language      text not null default 'hi' check (language in ('en','hi')),
  is_live       boolean not null default false,
  live_starts_at timestamptz,
  created_by    uuid references auth.users(id) on delete set null,
  -- A video must be playable from somewhere.
  constraint videos_have_a_source check (storage_path is not null or external_url is not null)
);
create index if not exists videos_subject_idx on videos(subject_id);
create index if not exists videos_exams_idx   on videos using gin(exam_ids);
create index if not exists videos_live_idx     on videos(is_live) where is_live;

create table if not exists video_chapters (
  id       uuid primary key default gen_random_uuid(),
  video_id text not null references videos(id) on delete cascade,
  at_seconds int not null,
  title    jsonb not null
);
create index if not exists video_chapters_video_idx on video_chapters(video_id, at_seconds);

-- ---------------------------------------------------------------- batches

create table if not exists batches (
  id           text primary key,
  title        jsonb not null,
  exam_id      text not null references exams(id) on delete cascade,
  paper_id     text references exam_papers(id) on delete set null,
  educator_ids text[] not null default '{}',
  starts_at    date not null,
  ends_at      date not null,
  schedule     jsonb not null,
  language     text not null default 'hi' check (language in ('en','hi')),
  enrolled     bigint not null default 0,
  access       text not null default 'free' check (access in ('free','plus','iconic')),
  color        text not null default '#4F46E5',
  includes     jsonb not null default '[]'::jsonb
);
create index if not exists batches_exam_idx on batches(exam_id);

create table if not exists batch_modules (
  id           text primary key,
  batch_id     text not null references batches(id) on delete cascade,
  title        jsonb not null,
  subject_id   text not null references subjects(id),
  video_ids    text[] not null default '{}',
  note_ids     text[] not null default '{}',
  question_ids text[] not null default '{}',
  sort_order   int not null default 0
);
create index if not exists batch_modules_batch_idx on batch_modules(batch_id, sort_order);

-- ------------------------------------------------------------------ tests

create table if not exists tests (
  id                text primary key,
  title             jsonb not null,
  exam_id           text not null references exams(id) on delete cascade,
  paper_id          text references exam_papers(id) on delete set null,
  type              text not null check (type in ('mock','pyq','sectional','daily-quiz')),
  duration_minutes  int not null,
  marks_per_question numeric(4,2) not null default 1,
  negative_marking  numeric(4,2) not null default 0,
  access            text not null default 'free' check (access in ('free','plus','iconic')),
  attempts          bigint not null default 0,
  year              int,
  instructions      jsonb not null default '[]'::jsonb
);
create index if not exists tests_exam_idx on tests(exam_id);

create table if not exists test_sections (
  id           text primary key,
  test_id      text not null references tests(id) on delete cascade,
  name         jsonb not null,
  subject_id   text not null references subjects(id),
  question_ids text[] not null default '{}',
  sort_order   int not null default 0
);
create index if not exists test_sections_test_idx on test_sections(test_id, sort_order);

-- --------------------------------------------------------------- learners

-- One row per signed-in user, created automatically on sign-up.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default 'Learner',
  avatar        text not null default '🧑‍🎓',
  role          text not null default 'learner' check (role in ('learner','educator','admin')),
  phone         text,
  goal_exam_id  text references exams(id) on delete set null,
  target_paper_id text references exam_papers(id) on delete set null,
  language      text not null default 'hi' check (language in ('en','hi')),
  state         text,
  subscription  text not null default 'free' check (subscription in ('free','plus','iconic')),
  created_at    timestamptz not null default now()
);

-- One row per day the learner practised; the streak is derived from these.
create table if not exists activity_days (
  user_id uuid not null references profiles(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

create table if not exists bookmarks (
  user_id     uuid not null references profiles(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists saved_notes (
  user_id    uuid not null references profiles(id) on delete cascade,
  note_id    text not null references notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, note_id)
);

create table if not exists enrolments (
  user_id    uuid not null references profiles(id) on delete cascade,
  batch_id   text not null references batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, batch_id)
);

-- ---------------------------------------------------------------- attempts

create table if not exists attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  test_id       text not null references tests(id) on delete cascade,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  -- Authoritative clock: the server decides when time is up, not the device.
  remaining_ms  int not null,
  current_question_id text,
  language      text not null default 'hi' check (language in ('en','hi')),
  -- Denormalised result, written once on submit.
  score         numeric(6,2),
  max_score     numeric(6,2),
  percentage    numeric(5,2),
  correct       int,
  incorrect     int,
  skipped       int,
  accuracy      numeric(5,2),
  total_time_ms bigint,
  percentile    numeric(5,2),
  rank          int,
  qualified     boolean
);
create index if not exists attempts_user_idx on attempts(user_id, started_at desc);
create index if not exists attempts_test_idx on attempts(test_id);
-- At most one paper in progress per test per learner.
create unique index if not exists attempts_one_live_per_test
  on attempts(user_id, test_id) where submitted_at is null;

create table if not exists attempt_answers (
  attempt_id       uuid not null references attempts(id) on delete cascade,
  question_id      text not null references questions(id) on delete cascade,
  selected_index   int,
  marked_for_review boolean not null default false,
  time_spent_ms    int not null default 0,
  primary key (attempt_id, question_id)
);

-- ------------------------------------------------------------------ feeds

create table if not exists current_affairs (
  id       text primary key,
  title    jsonb not null,
  summary  jsonb not null,
  date     date not null,
  tags     jsonb not null default '[]'::jsonb,
  exam_ids text[] not null default '{}'
);
create index if not exists current_affairs_date_idx on current_affairs(date desc);

create table if not exists doubts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete set null,
  asked_by   text not null,
  avatar     text not null default '🙋',
  subject_id text not null references subjects(id),
  question   jsonb not null,
  asked_at   timestamptz not null default now(),
  upvotes    int not null default 0
);
create index if not exists doubts_subject_idx on doubts(subject_id, asked_at desc);

create table if not exists doubt_answers (
  id          uuid primary key default gen_random_uuid(),
  doubt_id    uuid not null references doubts(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  by_name     text not null,
  is_educator boolean not null default false,
  body        jsonb not null,
  answered_at timestamptz not null default now(),
  upvotes     int not null default 0
);
create index if not exists doubt_answers_doubt_idx on doubt_answers(doubt_id, answered_at);

-- ------------------------------------------------------------- automation

-- Give every new auth user a profile so the app never renders a null user.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'learner'), '@', 1)),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Practising anything marks the day, which is what the streak counts.
create or replace function mark_active_today()
returns void
language sql
security definer
set search_path = public
as $$
  insert into activity_days (user_id, day)
  values (auth.uid(), current_date)
  on conflict do nothing;
$$;
