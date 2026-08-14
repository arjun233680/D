# Activating the backend

Everything in this repository runs today without a database — the live site
serves bundled content. This runbook turns on the real backend. It is the one
step that needs a human, because it needs credentials the repository must never
contain. Budget ten minutes.

## 1. Create the Supabase project

[supabase.com](https://supabase.com) → New project. Any region; Mumbai
(`ap-south-1`) is closest to the audience. Note two values from
**Project Settings → API**:

- Project URL — `https://<ref>.supabase.co`
- `anon` `public` API key

The `service_role` key is **not needed** anywhere in this setup. Never put it
in the repository, in Actions secrets, or in any client.

## 2. Apply the migrations

From `adhyapak/supabase/`, with the database URL from
**Project Settings → Database → Connection string**:

```bash
for f in migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Seven files, in order. All are idempotent (`if not exists` throughout), so
re-running is safe. Then the content seed:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seed/seed.sql
```

### Optional: the safe test dataset

`seed/test-content.sql` adds six clearly-marked `[TEST]` questions — three
published, one each of draft/review/archived — for verifying visibility rules
and the analytics views on a live database. Their fake "PYQ years" are 1998–99,
before any covered exam existed, so they cannot be mistaken for real papers.
Remove them afterwards with
`delete from questions where 'demo-data' = any(tags);`.

## 3. Verify the schema landed

```sql
select count(*) from pg_policies where schemaname = 'public';  -- expect 59+
select count(*) from questions;                                 -- expect 67+
select * from pyq_topic_frequency limit 1;                      -- view exists
select proname from pg_proc where proname in
  ('submit_attempt','set_question_status','set_question_status_bulk',
   'commit_import_batch','find_duplicate_fingerprints');         -- all five
```

## 4. Create the first educator

Authentication → Users → Add user (email + password). Then:

```sql
update profiles set role = 'educator' where id = '<that user id>';
```

(The profile row is created automatically by the sign-up trigger.)

## 5. Set the repository secrets

GitHub → repository **Settings → Secrets and variables → Actions** → two
repository secrets:

| Secret name | Value |
| --- | --- |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_ANON_KEY` | the `anon` key |

The deploy workflow already reads both and passes them to the Expo and Next
builds. Unset, the builds fall back to bundled content — which is why this
change was safe to merge before the project existed.

The `anon` key is designed to be public — it ends up in the client bundle by
definition, and row-level security is what protects the data. The rules that
matter are: drafts invisible to non-staff, imports private to their uploader,
the audit log writable by nobody, publishing only through
`set_question_status`. All were verified against Postgres 16 in CI-equivalent
runs; re-verify on the live project with the queries in step 6.

## 6. Deploy and smoke-test

Re-run the **Deploy Adhyapak to GitHub Pages** workflow (Actions → the workflow
→ Run workflow), or push any commit. Then:

1. **Learner reads the database**: open the live site in a private window,
   onboard as a guest. If the test dataset is loaded, search practice for
   `[TEST]` — exactly the *published* demo questions should appear, never the
   draft/review/archived ones.
2. **Studio works**: `…/D/web/studio/import/` — the "no database" banner is
   gone; signed in as the educator, upload a CSV, watch it land in
   `…/D/web/studio/drafts/`, publish, and confirm the question then appears in
   learner practice.
3. **Analytics**: `…/D/web/analytics/pyq/` shows the demo years once the test
   dataset's questions are published.

## Troubleshooting

- **Still "no database" after setting secrets** — secrets are read at *build*
  time; re-run the deploy workflow so a new bundle is compiled.
- **Educator sees no drafts** — confirm `profiles.role` is `educator` for the
  signed-in user (`select role from profiles where id = auth.uid();`).
- **Import button disabled** — the banner above it states the reason: either
  no database in this build, or the signed-in user is not staff.
