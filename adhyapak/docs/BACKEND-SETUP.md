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

## Google sign-in

Optional, and independent of everything above: the email provider is untouched
by it, existing accounts keep working, and turning it off again is one toggle.

Worth doing early, though, and for a stronger reason than a second door. A
learner arriving through Google needs **no confirmation email**, so that path
does not depend on the mail service the built-in SMTP cannot really provide.
Better still, it repairs accounts already stranded by it: signing in with Google
on the address of an existing password account links to that account and
confirms its email in the process, rather than creating a second one. That is
why custom SMTP is no longer a launch blocker — see Troubleshooting, and
"Verified on a real device" below for how it was proved.

### Google Cloud Console

1. **OAuth consent screen** — External. Only the three non-sensitive scopes:
   `openid`, `userinfo.email`, `userinfo.profile`. Adding a sensitive scope
   forces Google's verification review, which these three do not.
   The app starts in **Testing**, where only listed test users can sign in.
   **Publish app** when you want it open to everybody.
2. **Credentials → OAuth client ID → Web application.** One authorized redirect
   URI, and it is Supabase's callback rather than anything belonging to this
   app:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

   No Android or iOS client is needed. The phone reaches Google *through*
   Supabase, so the same web client serves both apps.

### Supabase

**Authentication → Providers → Google**: enable, paste the client ID and secret.

Then **Authentication → URL Configuration**, which is the step that gets missed:

| Site URL | `https://arjun233680.github.io/D/web/` |
| --- | --- |

Redirect URLs — all of them, or the environment that is missing lands on the
Site URL instead of where it asked to return:

```
https://arjun233680.github.io/D/web/**    website
https://arjun233680.github.io/D/**        Expo web build
http://localhost:3000/**                  local web development
adhyapak://**                             the installed app
exp://**                                  Expo Go
```

### What the apps do with it

`signInWithGoogle()` in `api/auth.ts` is the only entry point, and it takes the
redirect URL as an argument because the right one differs per platform: the
website builds it from `window.location.origin` **plus the `basePath`** Pages
serves it under (`lib/authRedirect.ts`), and the phone uses
`Linking.createURL()` so Expo Go's `exp://` address works in development.

The website lets supabase-js navigate the tab and picks the session up on the
way back. The phone opens a system auth session instead and finishes through
`completeOAuthSignIn()`, because a native app cannot navigate itself away.

The client uses **PKCE**, not the library's `implicit` default: the callback
carries a single-use code exchanged over a POST rather than tokens sitting in
the URL fragment. This costs the password path nothing — PKCE governs OAuth and
magic links only.

The Studio has no Google button on purpose. Staff accounts are made by hand and
sign in with email at `/studio/sign-in`.

### Verified on a real device

Both linking questions have now been answered by signing in for real, against
this project, on a device. Both came back better than expected.

**An existing password account is linked, not duplicated.** Signing in with
Google using the address of a confirmed password account produces one
`auth.users` row carrying two identities — `email` and `google`. The profile,
its name, and every row keyed to it survive, because no second user is created
for them to be stranded behind.

**An unconfirmed account is linked too, and gets confirmed in the process.**
This was the case worth fearing: `profiles.id` cascades from `auth.users(id)`,
and `bookmarks`, `attempts` and `activity_days` cascade from `profiles`, so a
deleted user row would have taken a learner's whole history with it. It does not
happen. Signing in with Google using the address of an account that had signed
up with a password and never opened the confirmation link keeps the same
`user_id`, keeps the profile and its name, and **fills in `email_confirmed_at`**
— Google's verification of the address is accepted as confirmation of it.

That second result is the one with consequences beyond this feature, and the
SMTP note below now rests on it: anybody stuck behind a confirmation email that
never arrived can let themselves in with Google, and arrives at the account they
already had rather than a new one.

### Still not verified

- What somebody sees who signed up through Google and then tries the password
  form. No password was ever set, so GoTrue answers "Invalid login credentials",
  which is true and unhelpful. Nothing is at risk here — it is a wording
  problem on a path that already fails safely — so it is not a launch blocker.
- Whether `profiles.name` is correct for a Google sign-up. The
  `on_auth_user_created` trigger reads `raw_user_meta_data->>'name'`; if Google
  supplies only `full_name`, the name falls back to the local part of the email
  address and every Google learner is greeted by something like `arjun233680`.
  One query answers it:

  ```sql
  select p.name,
         u.raw_user_meta_data->>'name'      as google_name,
         u.raw_user_meta_data->>'full_name' as google_full_name
  from   profiles p
  join   auth.users u on u.id = p.id
  where  u.email = '<a google sign-up>';
  ```

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
- **Google sign-in returns to the wrong page** — the redirect URL is missing
  from Authentication → URL Configuration, so Supabase discarded it and used the
  Site URL. It fails this way rather than with an error, which is what makes it
  slow to spot.
- **"Google sign-in is unavailable right now"** — the provider is off in the
  dashboard, or the client ID and secret do not match the project. The `kind` on
  the error is `oauth-unavailable`; the learner-facing text deliberately points
  at email rather than explaining a configuration problem to them.
- **Confirmation emails never arrive** — expected, and no longer a launch
  blocker. The built-in SMTP does not merely throttle: it **refuses to deliver
  to any address that is not a member of the project's team**, and caps what is
  left at two messages an hour. So on the live project, a learner signing up
  with a password gets no confirmation email at all.

  Google sign-in is the way out, and it is a real one rather than a detour.
  Signing in with Google on the same address links to the account that already
  exists and confirms its email on the way through — verified on a device, see
  "Verified on a real device" above. Nothing is lost and nothing is duplicated,
  so the learner reaches the account they already made.

  What this leaves is a bounded gap rather than an open one: somebody whose
  address is **not** a Google account has no route in, because neither the email
  nor the Google door opens for them. Most of the audience is on Gmail, which is
  why this is a gap and not a blocker — but it is still somebody, and custom SMTP
  is what closes it.

  Set one up when convenient — or sooner, if a password reset flow is being
  built, since that has no Google equivalent and cannot work without email.
  Enable it under **Authentication → Emails → SMTP Settings** (older dashboards
  put this under Project Settings → Authentication), then raise the ceiling under
  **Authentication → Rate Limits** — Supabase starts custom SMTP at 30 messages
  an hour. While you are there, rewrite the templates under **Authentication →
  Emails → Templates**: the app is bilingual and Supabase's default confirmation
  email is English only, so a learner who signed up in Hindi is currently sent an
  English email.
