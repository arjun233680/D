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

Eight files, in order. All are idempotent (`if not exists` throughout), so
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

One script, read-only, reporting PASS or FAIL per check:

```bash
psql "$DATABASE_URL" -f verify.sql
```

Or paste `supabase/verify.sql` into the Supabase SQL editor. It checks the
tables, that RLS is enabled on every one of them, the 59 policies, the foreign
keys and indexes, the five `security definer` RPCs, both analytics views, the
content lifecycle states, the import staging tables, that the audit log has no
`UPDATE` or `DELETE` policy, that every question carries a fingerprint, and —
as the `anon` role — that a logged-out visitor sees published questions only
and cannot read import batches or the audit log.

Every row should say PASS. Anything else is a migration that did not land.

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

## 6. Confirm the credentials reached the bundle

Do this before testing anything in the browser. Next and Expo activate the
backend by **substituting the literal text `process.env.NEXT_PUBLIC_SUPABASE_URL`
for its value at build time** — nothing is read at runtime, because a browser has
no environment. So the credentials are either compiled into the JavaScript or
they are not, and grepping the build tells you which:

```bash
# website
cd apps/web
NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" npx next build
grep -rc "$(echo "$SUPABASE_URL" | sed 's#https://##')" out --include=*.js

# app
cd ../mobile
EXPO_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  npx expo export --platform web --output-dir dist
grep -rc "$(echo "$SUPABASE_URL" | sed 's#https://##')" dist
```

Your project host must appear at least once in each. That is the check that
matters, and it is enough on its own.

As a second signal, when the variable *is* set its name should no longer appear
as a runtime lookup — this returns nothing in a build that picked the value up:

```bash
grep -ro "NEXT_PUBLIC_SUPABASE_URL" out --include=*.js
```

Read that one carefully: a build with the variable **unset** legitimately still
contains the name, because a bundler only substitutes variables that exist. So
the name surviving is only evidence of a problem when you set the variable and
it is *still* there — which means the expression was never substituted and the
app will run offline forever, whatever the secrets say.

This check exists because that is exactly what happened. `fromEnv()` used to
copy `globalThis.process?.env` into a local and read properties off *that*, which
left the bundlers no literal to match: nothing was inlined, `process` does not
exist in a browser, and both apps were permanently offline. The unit tests
passed throughout, because they run in Node where `process` is real. Only the
built output shows it.

The app now says which mode it came up in, once, in the browser console:

```
[adhyapak] backend connected — <ref>.supabase.co
[adhyapak] backend offline — no credentials in this build, serving bundled content. …
```

If you see `offline` on the live site after setting the secrets, the deploy
workflow ran before the secrets existed — re-run it.

## 7. Deploy and smoke-test

Re-run the **Deploy Adhyapak to GitHub Pages** workflow (Actions → the workflow
→ Run workflow), or push any commit. Then:

0. **The console says connected**: open the live site and check for
   `[adhyapak] backend connected — <ref>.supabase.co`. If it says `offline`, stop
   here and go back to step 6 — nothing below can pass.
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
  time; re-run the deploy workflow so a new bundle is compiled. If it persists
  after a fresh deploy, grep the built output as in step 6: the credentials are
  either compiled into the JavaScript or they are not, and that check answers it
  in one command.
- **Educator sees no drafts** — confirm `profiles.role` is `educator` for the
  signed-in user (`select role from profiles where id = auth.uid();`).
- **Import button disabled** — the banner above it states the reason: either
  no database in this build, or the signed-in user is not staff.
