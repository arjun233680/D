# Adhyapak backend

Postgres on Supabase: schema, row-level security, server-side grading, and a seed
generator that loads the researched content.

## Setting it up

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run these four files in order:

   | File | What it does |
   | --- | --- |
   | `migrations/0001_schema.sql` | Tables, indexes, sign-up trigger |
   | `migrations/0002_rls.sql` | Row-level security, policies, storage buckets |
   | `migrations/0003_grading.sql` | Server-side marking, ranking and analytics |
   | `seed/seed.sql` | All exams, questions, notes, tests and current affairs |

3. Copy **Settings → API → Project URL** and **anon public key** into `.env`
   files as shown in `.env.example` at the repo root.
4. Restart the apps. `isBackendConfigured()` now returns `true` and every read
   and write goes to Postgres.

With the Supabase CLI instead: `supabase link` then `supabase db push`.

## Two modes, one API

Screens never learn where data came from. `packages/core/src/api/repository.ts`
serves Postgres when credentials exist, and the content bundled into the app when
they do not — so the app works on a train with no signal, and a dropped
connection degrades to offline rather than to an error screen.

## Why grading happens in the database

`submit_attempt()` marks the paper against the answer key inside Postgres. That
matters for three reasons:

- **The client cannot fake a score.** The correct answers never need to be sent
  to the device before submission.
- **Rank is real.** Percentile is computed against every other submitted attempt
  on that test, replacing the simulated curve the offline build uses.
- **Analysis follows the learner, not the paper.** `my_topic_accuracy()` reads
  every attempt the learner has made, so weak topics reflect their history.

`refresh_question_accuracy()` recomputes the difficulty signal on each question
once at least 20 learners have answered it. Run it on a schedule.

## Security model

Two rules cover everything, and RLS is enabled on every table:

- **Content** — anyone may read; only educators and admins may write. Uploads are
  the exception: a signed-in user may always edit rows they created, which is
  what makes the Educator Studio work on a fresh account.
- **Learner data** — attempts, answers, bookmarks, saved notes, enrolments and
  activity are readable and writable only by their owner.

Verified against a live Postgres before shipping:

| Check | Result |
| --- | --- |
| Learner B reads learner A's attempts | 0 rows |
| Learner B reads learner A's answers | 0 rows |
| Learner B reads published content | 67 questions |
| Learner writes to the question bank | refused by policy |
| Learner forges an attempt owned by someone else | refused by policy |
| Learner submits someone else's paper | refused by `submit_attempt` |

Keep the `service_role` key out of both apps. It bypasses RLS entirely.

## Changing content

Content is authored in TypeScript under `packages/core/src/data/`, where it is
typechecked and reviewable in a diff, then compiled to SQL:

```bash
npm run seed:generate     # rewrites seed/seed.sql from the core package
```

Re-run `seed/seed.sql` afterwards. Inserts use `on conflict do nothing`, so
re-seeding never overwrites live rows; delete the row first to replace it.

## Storage

Two public buckets, `videos` and `notes`, are created by `0002_rls.sql`. Any
signed-in user may upload to their own folder and edit only their own objects.
`uploadMedia()` in the repository returns the public URL that goes into
`videos.storage_path` or `notes.file_path`.
