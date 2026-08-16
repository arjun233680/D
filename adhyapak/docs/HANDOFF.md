# Adhyapak — handoff

Written so a fresh Claude Code session can pick this project up without the
previous conversation. Read this file first, then `docs/IMPORTING.md` if the
task touches content.

---

## What this is

**Adhyapak** — a bilingual (Hindi/English) preparation platform for Indian
teaching-recruitment exams. HTET is the first target; CTET, UPTET, REET and
eight others are in the catalogue.

Repo `github.com/arjun233680/D`, app in `adhyapak/`. **Public repo** — do not
commit secrets or anything you would not publish.

| | |
| --- | --- |
| Website | https://arjun233680.github.io/D/web/ |
| App (Expo web build) | https://arjun233680.github.io/D/ |
| Working branch | `claude/teaching-exam-education-app-s242gj` |
| Also pushed to | `main`, `claude/p2-studio-signin-content` |
| CI | `.github/workflows/deploy-pages.yml` — typecheck, lint, test, then deploy |

Every push to `main` runs the gates and publishes to `gh-pages`. A red gate
stops the deploy.

---

## Layout

npm workspaces:

```
adhyapak/
  packages/core/     @adhyapak/core — types, data, engines, repository
  apps/web/          Next 16, static export (output: 'export')
  apps/mobile/       Expo SDK 57, expo-router
  supabase/          migrations 0001–0009, verify.sql
  content/           CDP.xlsx, GK.xlsx, topic-map.json
  docs/              IMPORTING.md, BACKEND-SETUP.md, ROADMAP.md, this file
  scripts/           content-verify.mts, generate-topic-map.mts
```

Commands, all from `adhyapak/`:

```bash
npm run typecheck        # all workspaces
npm run lint             # 9 pre-existing warnings, 0 errors — keep it at 0 errors
npm test                 # 294 tests
npm run build            # website static export
npm run content:map      # regenerate the HTET topic map from topic-map.json
npm run content:verify   # assert 30 CDP + 10 Haryana GK per paper
```

---

## Invariants — break these and something breaks quietly

1. **`@adhyapak/core` ships TypeScript source**, not a build. `main` points at
   `./src/index.ts`, `"type": "module"`. That is what lets both apps import it
   with no build step. Do not add a build to it.

2. **Every user-facing string is `Bilingual { en, hi }`.** No exceptions. Hindi
   is required to publish a question — the database enforces it.

3. **All data goes through `packages/core/src/api/repository.ts`.** Screens
   never call Supabase directly. `withFallback()` serves Postgres when
   configured and bundled content otherwise, same shape either way.

4. **`packages/core/src/api/client.ts` reads `process.env.NAME` as a literal.**
   Next's DefinePlugin and Expo's Metro substitute that exact source text at
   build time. Do not refactor it into a variable, and do not guard it with
   `typeof process !== 'undefined'` — either change silently ships an app with
   no credentials that looks fine and serves bundled content forever.

5. **RLS is authoritative.** Content moves `draft → review → published →
   archived`. Import always writes drafts; the database function sets the
   status, not the client. Publishing goes through `set_question_status`, which
   re-checks English text, Hindi text, ≥2 options and an answer inside them.

6. **Subjects, topics and exams are ids**, not display names — `cdp`,
   `cdp-piaget`, `htet`.

7. **Ship no number the database cannot prove.** Counts come from
   `countQuestions()`, never from the length of a bundled array. There is a
   guard test that fails if an app imports `QUESTIONS` or
   `previousYearQuestions`.

   `TestResult.rank`, `.percentile` and `.totalCandidates` are **optional** and
   absent unless `submit_attempt` returned them. Grading on the device produces
   no rank, because a device does not know how anybody else did. Every screen
   drops the tile rather than filling it.

8. **The learner belongs to Postgres.** Goal, language, bookmarks, saved notes,
   enrolments and practised days are rows, read through `getCurrentUser()` and
   written back through the repository. The stores apply the change locally and
   push it through; `localStorage` is the guest and offline path, not the
   source of truth. Signing out clears the cached copy — a shared phone is the
   normal case.

9. **Nothing bundled is a person.** `GUEST_USER` is the signed-out learner and
   claims nothing: no name, no email, no goal, no streak. There is a guard test
   asserting that, and a second one that fails on any real email address in any
   source file — the repository is public.

---

## What the learner sees now

**One exam at a time.** Choosing HTET scopes every listing — test series,
batches, notes, videos, current affairs, Explore, the practice hub. Exam chips
were removed from those screens, not defaulted: changing exam is the goal
switcher in the top-right corner, which lists all 11.

Three deliberate exceptions, all reasoned:
- an **enrolled batch** stays visible on the Batches page after a goal change
  (it is yours); the home dashboard does scope it
- **subject descriptions** name other exams in prose ("Reasoning … for DSSSB,
  KVS, NVS") — descriptive text in the taxonomy, not navigation
- the **Studio** keeps every exam, because an educator publishes across the
  catalogue

**Signing in is real.** `/sign-in` on the website and `(auth)/login` on the
phone both do email and password against Supabase, with creating an account
beside it, and both keep "continue without an account" as a first-class option.
Sign-up reports "check your inbox" separately from "you are signed in", because
a project with email confirmation on returns no session. `/studio/sign-in` stays
separate — it is for staff and it says staff things.

**One exam window everywhere.** Mocks, previous-year papers, subject practice,
topic practice and bookmarks all open the same window: clock, section tabs,
palette (Answered / Not Answered / Marked / Not Visited), Submit Test, and a
bottom bar with Mark for Review on the left and ← Previous / Save & Next → on
the right. It is `components/TestPlayer.tsx` in both apps, rendered as a
full-screen layer so it looks identical from any route.

**Practice reveals, mocks withhold.** `TestPlayer` takes `instantFeedback`.
Practice marks the answer on selection and offers the explanation in a
collapsed row; the question then locks (being told the answer and allowed to
change it would make the score a lie). Clear Response is hidden in practice for
the same reason and kept in mocks. A mock reveals nothing until submission.

**Every sitting ends in a result** with the score and every question's
solution, filtered by All / Correct / Incorrect / Unattempted with counts.
"Unattempted" covers both skipped and never-reached — both are blank on the
answer sheet.

**PYQ funnel:** exam → post (PRT/TGT/PGT) → subject → year. `/practice/pyq`
chooses and shows the real count; `/practice/pyq/attempt` sits it;
`/practice/pyq/result` reviews it. The selection lives in the URL.

---

## Things that were wrong and are now fixed

Worth knowing so they are not reintroduced:

- `fromEnv()` read `globalThis.process?.env` into a local, so no bundler ever
  inlined credentials and the deployed app was permanently offline
- `countQuestions` ignored `level`, `shift` and `difficulty` while
  `listQuestions` honoured them, so a filtered list had a count describing a
  wider set
- the practice hub rendered `QUESTIONS.length` (67) against a database of ~900
- the PYQ screen sent only the year, so half of every paper was unreachable
- `{ ...profile, ...fromUrl }` erased the profile, because the URL parser
  returns every key with `undefined` where the parameter was absent
- the offline fallback served 2023's questions for `?year=2019`
- the mock's solutions renumbered rows by position in the *filtered* list, so
  the third wrong answer was labelled Q3 when it was Q17
- **the drafts screen fetched 200 and stopped** — an 840-row import looked like
  an import that had written 200. `listDraftQuestions` now pages.
- **the learner-side database was never called.** `getCurrentUser`,
  `toggleBookmarkRemote`, `startAttempt`, `submitAttempt` and the rest each had
  one occurrence in the repository — their own definition. Everything lived in
  `localStorage`, so a second device met a stranger
- **`DEMO_USER` was the initial state of both apps** — named Arjun, carrying a
  real email address into a public repo, with a twelve-day streak, two
  bookmarks and an enrolment nobody had made. A first install opened on
  somebody else's progress, and the streak went out on its own a day later
- **the result screen invented a rank.** `gradeAttempt` ran the percentage
  through a logistic curve against a seeded field size, so answering one
  question of forty-five reported "rank #1,80,000 of 1,80,000, 0.5 percentile"
  under the heading "Where you stand"

---

## Not verified, and honest about it

**The live Supabase project is unreachable from the Claude Code sandbox**
(`403 Host not in allowlist`). Everything database-shaped was proved against a
local Postgres 16 with all migrations applied — 840 rows written as drafts, 0
visible to anon, 840 published, 30/10 per paper holding — but **not** against
production. If a task depends on the live database, say so rather than assuming.

The sandbox also blocks arbitrary web fetches. `WebSearch` works; `WebFetch` to
sites like `bseh.org.in` returns `EGRESS_BLOCKED`. `github.io` is blocked too,
so the deployed site cannot be opened from here — the live links are read off
the workflow and the green Actions run, not from having loaded the page.

**Sign-in has never been run against a real Supabase project.** The whole auth
and profile path was verified in Chromium against both static exports: with
credentials inlined the forms are enabled, without them they are disabled behind
the "no database in this build" notice, and a mock runs end to end with no
console errors. But no account has been created, no confirmation email sent, no
profile row read back, and no attempt written. The branch that puts the rank
tiles back has never executed.

One local trap worth knowing: **Metro caches hard enough to ignore new
credentials.** An `expo export` picked up neither `EXPO_PUBLIC_*` variable and
produced a byte-identical bundle until `--clear`. CI builds on a fresh runner,
so this bites locally and not on deploy.

---

## The task in flight: HTET 2024 previous-year papers

The user has HTET 2024 question papers (PRT, TGT, PGT) **and their answer
keys**, as PDFs in a folder on their own machine. They want them turned into a
schema-valid Excel with good explanations, and imported.

**Blocked on file transfer.** The sandbox has none of these files — the
container only has the git repo. Options given: commit them under
`adhyapak/content/htet-2024/` (note the repo is public), authorize the Google
Drive connector (currently unauthorized, and OAuth cannot run in a
non-interactive session), or attach them in the conversation.

**What the schema needs per row** (full detail in `docs/IMPORTING.md`):

| Blocks the row | `id`, `Question EN`, ≥2 options, `Correct Answer` inside range, `Subject`, `Topic` (known ids), plausible `Year` |
| Blocks publishing | `Question HI` |
| Warns only | missing explanation, repeated option, no exam attached |
| Optional | `Level`, `Unit`, `Paper`, `Shift`, `Q No`, `Difficulty`, `Marks`, `Negative Marks`, `Source`, `Tags`, `Concept Tags`, `Syllabus Ref` |

**PDF is not an importable format** — the wizard takes `.xlsx`/`.csv` only.

**There is no question editor in the Studio.** `/studio/drafts` publishes and
archives, nothing else. So every field must be correct in the spreadsheet
before upload; a missing answer cannot be filled in afterwards.

**Position taken on the answer key:** it must come from the official BSEH key,
not be inferred. An AI-derived key would be right most of the time, and the
wrong ones are exactly the questions a candidate then learns wrong. Explanations
are a different matter and can be drafted, because a weak explanation beside a
verified-correct answer is reviewable and low-harm.

**Scale:** ~450 questions across three levels, each needing bilingual text,
options, key, topic id and an explanation in both languages — roughly 900
pieces of written explanation. The agreed approach is **one paper first**
(PRT 2024), complete and validated, so the format and explanation depth can be
judged before the other two.

Useful: `examBrowsableSubjects('htet')` returns all 29 subject ids; each
subject's topics are in `packages/core/src/data/subjects.ts`. Setting **Default
exam = HTET** in the wizard activates `content/topic-map.json`, which maps
source labels like "Piaget" and "PRT" to ids.

---

## Working practices this project follows

- Small commits, each explaining *why* in the body, not just what
- Push to the working branch **and** `main`; never force-push, never delete
  branches
- Run `typecheck`, `lint`, `test` and the relevant build before committing
- Verify in a real browser, not just tests — Playwright with
  `executablePath: '/opt/pw-browsers/chromium'`, serving the static export
  (the Expo build needs base path `/D`)
- **Prove a guard test can fail** before trusting it — plant the bug, watch it
  go red, remove it
- Say plainly what was not verified rather than implying it was
- Comments explain the reasoning and the bug that motivated the code, since the
  code already says what it does
