# Changelog

## The backend could never have been activated

`fromEnv()` read credentials by copying `globalThis.process?.env` into a local
and taking properties off that. Next's DefinePlugin and Expo's Metro transform
activate a build by substituting the **literal source text**
`process.env.NEXT_PUBLIC_SUPABASE_URL` for its value — so reading through a
local left them nothing to match. Nothing was inlined. In a browser
`globalThis.process` is `undefined`, the local was `{}`, and `fromEnv()`
returned null forever: both apps were pinned to offline mode no matter what
secrets were set.

Confirmed in the deployed bundle before the fix — it contained
`globalThis.process?.env??{}` followed by live property lookups, and neither a
project URL nor a key appeared anywhere in the output. Checked the Expo side
separately, since Metro does ship a `process` shim: its `process.env` holds
`NODE_ENV` and nothing else, so the old code read `undefined` there too.

Each variable is now read as a literal `process.env.<NAME>` member expression,
which is the only form the bundlers replace. Two traps avoided:

- **No `typeof process !== 'undefined'` guard.** After substitution the read is
  a string literal, but `process` still does not exist in the browser, so the
  guard would be false and the literal would be thrown away — the same bug from
  the other side.
- **The reads are wrapped one at a time, not in one shared `try`.** A build
  always contains a mix: Next inlines `NEXT_PUBLIC_*` and leaves the rest as
  live references. Where one of those survives as a bare `process` in a runtime
  without one, a shared block would throw on it and discard the successfully
  inlined names alongside it.

An empty value now counts as absent, because an unset GitHub Actions secret
interpolates to `''` rather than to nothing, which would otherwise mask the
next name in the fallback chain.

### Proven, not assumed

Built both apps with dummy credentials and grepped the output:

| Build | Dummy host in JS | Dummy key in JS | Name left as a lookup |
| --- | --- | --- | --- |
| `next build` | 1 | 1 | 0 |
| `expo export` | 1 | 1 | 0 |

Then loaded both in a real browser. With `typeof globalThis.process ===
'undefined'`, the website logs `backend connected — dummyproj12345.supabase.co`;
the app logs `backend connected — dummyexpo67890.supabase.co`. Rebuilt with no
credentials: `backend offline`, no page errors, the existing bilingual banner
unchanged.

### An honest runtime signal

The app now says once, in the console, which mode it came up in — connected
(naming the host, never the key) or offline (naming the fix). A misconfigured
build used to be indistinguishable from a working one; it just quietly served
bundled content, which is exactly how this survived a deploy.

`docs/BACKEND-SETUP.md` gains the grep that would have caught it, including the
caveat that a variable which is genuinely unset legitimately still appears by
name.

## Backend activation — verification, and a fingerprint that was quietly wrong

Preparing the live database turned up two real defects in duplicate detection.
Both were found by checking the schema against a real Postgres 16 instead of
trusting it, and both would have mattered the first time a real question bank
met content the library already held.

### Nothing was fingerprinted except imports

`0007` added `questions.fingerprint` and the lookup that reads it, but nothing
filled it in for rows written by any other path — the 67 seeded questions
included. A null fingerprint equals nothing, so `find_duplicate_fingerprints`
was blind to all of them: re-importing a question already in the library would
have been accepted as new, which is the single failure duplicate detection
exists to prevent.

`0008` makes the column `not null`. The seed generator now emits the
fingerprint, computed by the real function.

### The fingerprint destroyed Hindi

`normaliseText` kept `\p{L}\p{N}\s` and replaced everything else with a space.
Devanagari vowel signs are combining marks, not letters, so पियाजे became
"प य ज" and निकटस्थ became "निकटस थ" — every Hindi question with the same
consonant skeleton fingerprinted identically. The comment three lines above it
claimed "Devanagari is left intact ... stripping its marks would collide
distinct questions", which is exactly what it did. `\p{M}` is now in the class,
and a test pins it.

Found because a SQL mirror of the function disagreed with it. That mirror has
been deleted rather than fixed: Postgres's `[[:alnum:]]` drops Devanagari
combining marks inconsistently — it kept the vowel signs in पियाजे but dropped
the virama in निकटस्थ — so the two implementations could not be kept honest.
There is now exactly one, in TypeScript, and the seed carries its output.

A fingerprint that is *almost* right is worse than none: the lookup returns no
rows and looks like it worked.

### The separator nobody could see

`fingerprint()` joined its two halves with a literal U+001F embedded in the
source, invisible to every editor, grep and diff — `return \`${en}${hi}\`` is
what the file appeared to say. It is now a named constant with an escape.

### Verification

`supabase/verify.sql` — read-only, PASS/FAIL per check, safe on any database.
Structure, RLS, the five RPCs, both views, the lifecycle, import staging, an
append-only audit log, fingerprint coverage, and `anon` visibility. All 15
checks plus the three role checks pass against Postgres 16 with Supabase's own
grant model.

## Phase 5 — Excel import

Studio accepts `.xlsx` workbooks. Not as a second import path: the workbook
reader produces the same `Row` — a plain `Record<string, string>` — that the CSV
parser produces, and everything after it (column mapping, validation, duplicate
detection, staging, draft, review, publish) is the code that was already there.
An Excel import cannot drift away from a CSV import because there is nothing
downstream to drift.

### The reader — `packages/core/src/content/xlsx.ts`

Written against the file format rather than added as a dependency.
`@adhyapak/core` stays dependency-free, which is the property that lets both
apps import it as source with no build step; a general-purpose spreadsheet
library would have brought a megabyte of formula, styling and chart code that a
question bank never executes. Decompression uses the platform's own
`DecompressionStream`, which every browser and Node 18+ ship.

Handled: multi-sheet workbooks, shared and inline strings, rich-text runs,
numbers, booleans, dates, gaps mid-row, blank spacer rows, XML entities and
numeric character references, a ZIP archive comment, and relationship ids that
do not match file order. Formulas are read as their cached value; styling is
otherwise ignored.

Dates are resolved through `styles.xml` — style index → `cellXfs` → `numFmtId`,
then a built-in date slot or a custom format code containing date fields. The
obvious shortcut, treating any styled number in the serial range as a date,
turns a bold `45292` into 1 January 2024, and question banks contain numbers.

Two bugs the tests caught before any of this shipped:

- `elements()` never matched self-closing tags, so `<sheet …/>` — how every
  workbook declares its sheets — and `<row r="2"/>` were invisible. The
  attribute run was greedy and swallowed the trailing slash.
- `Option A EN` matched no column alias, while `Option A HI` did. In a bilingual
  file those headers come in pairs, so half of every such pair was silently
  dropped. Fixed for CSV at the same time, since they share the alias table.

### Studio

The upload step takes `.xlsx` alongside CSV and offers a **downloadable starter
workbook** — every column correctly named, one filled-in bilingual example.
`.xls` is refused by name with instructions rather than failing later with a ZIP
error nobody can act on.

A workbook with several sheets gets a worksheet picker showing each sheet's row
count, defaulting to the first sheet with data. A table that starts below a
title row is found rather than rejected, and the wizard prints which row it
decided was the header — so the row numbers on rejected rows point at the row
the educator sees in Excel, not at an offset from it.

Parse failures are bilingual. `@adhyapak/core` throws English-only technical
errors, which is right for a library, so they are translated at the boundary
where a human starts reading them.

### Measured, not asserted

A 20,000-row deflate-compressed workbook with a shared string table parses and
validates in ~1.2 s (1,045 ms read, 145 ms validate); 1,000 rows take 66 ms.
Reproduce with `npx tsx scripts/make-test-workbook.mts`. Numbers and method are
in [docs/IMPORTING.md](docs/IMPORTING.md).

### Tests

15 new tests, 113 total. Most build workbooks the way Excel does — deflated
parts, shared strings, styles, out-of-order relationship ids — rather than
round-tripping our own writer, which could only prove the writer and reader
agree with each other. One fixture was written by **openpyxl**, so the reader is
tested against a file it did not produce, and the generated template and sample
were both verified to load in openpyxl with Devanagari intact.

## Phase 3 — Studio import, duplicate protection and PYQ analytics

Phase 2 made the app read through the repository. This makes the library
writable from a browser: an educator can hand Adhyapak a real HTET CSV and get
it into the question bank without anyone editing source code.

### Import wizard — `/studio/import`

Five steps: upload, map columns, review, import, publish. Column names are
matched by alias (`Question`, `question_text` and `Question Text` are one
column) and every mapping can be overridden by hand, so a file whose headers
match nothing at all still imports.

Nothing in the wizard validates anything itself. Parsing, mapping, validation
and duplicate detection are the same `@adhyapak/core` functions the CLI uses —
if the screen and the command line disagreed about what a valid file is, that
would be the bug this indirection prevents.

The review step shows the four tallies, then three tabs. Rejected rows are
listed by **spreadsheet line number, field, problem and a suggested fix**:

```
12  correctIndices  ✕ No correct answer marked        —
13  subjectId       ✕ Unknown subject "maths"         math
14  text.en         ✕ text has no English text        —
```

Status is a symbol plus a word (`✓ Ready`, `⚠ Duplicate?`, `⊘ Skipped`), never
colour alone.

**Everything lands as `draft`.** The status is forced by `commit_import_batch`
in the database, not by an argument the client passes — import is not a
publishing route, and that rule belongs where it cannot be talked out of.

### Duplicate protection

`content/duplicates.ts` fingerprints the normalised question text: case,
punctuation, quote style, spacing and the Devanagari danda are all noise, and a
file assembled from several sources repeats questions with exactly those
differences. Both languages participate, so a corrected Hindi translation is a
different question — worth an editor's eye, not a silent skip.

Detection **never merges or deletes**. It reports, with a confidence and a
reason, and the educator ticks which rows to skip. Matches are found inside the
file and against the library, via `find_duplicate_fingerprints` — fingerprints
go to Postgres, the bank never comes to the browser.

The same edit-distance routine powers the "did you mean" suggestions, and stays
silent when a value resembles nothing: a confident wrong suggestion gets
accepted, and the question lands under the wrong subject.

### PYQ analytics — `/analytics/pyq`

Topic frequency and a per-year trend, both counted from questions carrying
structured PYQ metadata. Filters for exam, subject and topic.

Two rules the screen states in its own text. **A year with no questions is
absent, never drawn as zero** — a gap means the paper has not been collected,
and a zero would claim the topic was not asked. And **frequency bands are
derived from the selected data**, not hardcoded: the top third of the observed
range is High, the bottom third Low, and the range is printed underneath so the
label can be checked. Nothing says "most important"; it says "18 questions in
this dataset".

### Database — 0007

`fingerprint` column and index; `commit_import_batch` (chunked, transactional,
forces draft, idempotent on re-run); `set_question_status_bulk`, which delegates
to the existing `set_question_status` per row so the publish-time checks apply
to every question and the audit trigger fires for each — failures come back with
their reason instead of being dropped; `find_duplicate_fingerprints`; and the
`pyq_year_counts` view.

Every function is `SECURITY DEFINER` and re-checks `is_staff()` itself, because
a client that can call an RPC can call it with any arguments it likes. No RLS
was weakened.

### Found by testing

Two UX bugs my own QA caught, both the same mistake: the Studio said **"Educators
only"** when the real reason was **"no database configured"**. That sends someone
to ask for a permission that would not have helped. The two cases now read
differently, and — since parsing, mapping, validation and duplicate detection
are entirely client-side — a file can now be checked offline, with the import
button disabled and a tooltip explaining why.

### Verified

98 tests pass, typecheck clean, Next.js production build, Expo web export, and
no console errors at 390px or 1440px on any screen.

End to end against Postgres 16 with all seven migrations, using a 15-row HTET
dataset (10 valid, 3 invalid, 2 near-duplicates, six years, three topics,
bilingual throughout):

```
parse+validate : 15 rows → 12 accepted, 3 rejected (by line, with a suggestion)
duplicates     : 2 flagged (exact, likely) — nothing removed
educator skips : importing 10 of 12
committed      : 10 rows written as drafts
learner sees   : 0     anon sees: 0     educator sees: 10
learner publish: denied
educator publish: 10 published
learner sees   : 10    rejected rows reaching a learner: 0
audit rows     : 11
frequency      : cdp-piaget=4, cdp-inclusive=3, cdp-learning=3
year trend     : 2020→2  2021→2  2022→2  2023→2  2024→2
```

Scale is tested rather than claimed: 10,000 rows parse and validate in one pass,
and duplicate detection over 5,000 rows finds all 4,900 repeats without pairwise
comparison. Both have time bounds in the suite to catch an accidental quadratic.
The largest import actually written to Postgres in testing was 10 rows.

### Known limitations

- **Excel and PDF import are not implemented.** The pipeline is
  `file → parser → Row[] → mapping → validation → preview → draft import`, and
  `Row` is a plain `Record<string, string>`, so a future parser plugs in at the
  first step. Nothing downstream would change. No such parser exists today.
- The Studio import UI is web-only, by design. Learner analytics is responsive
  and works on a phone.
- Editing an individual draft question is not built; drafts can be published,
  archived or left alone.
- Import batches are recorded and listed by the repository, but there is no
  screen showing import history yet.
- Batch scheduling remains untouched and still has no backend.

---

## Phase 2 — the UI now reads through the repository

Phase 1 built the content library and left one gap, recorded honestly at the
time: 19 screens imported the seed arrays directly, so imported content reached
the database and the analysis views but never the UI. That gap is closed.

### The boundary

`repository.ts` was already written and was called by nothing. Every
learner-facing screen now goes through it, so the same component renders
bundled content offline and imported content from Postgres without knowing
which it got.

**Published-only is enforced in the repository**, not in the screens. RLS
already hides drafts from a learner, but a screen must not depend on the
caller's role for correctness: an educator practising their own subject would
otherwise be served their own unreviewed drafts, and the bug would be invisible
in testing precisely because the developer is staff.

### Added

- **`listPyqYears`, `listTopicFrequency`, `countQuestions`** — the year picker,
  the `pyq_topic_frequency` view, and counts that do not require fetching the
  questions to call `.length` on them.
- **Structured PYQ filters** on `listQuestions`: `year`, `shift`, `level`,
  `unitId`, `subtopicId`, all optional and composable, so one call serves
  "HTET → TGT → Science", "…→ Chemistry → Mole Concept" and "…→ PYQ → 2024".
  The legacy prose column is never parsed; it survives only as a display
  fallback for questions imported before the structured fields existed.
- **`limit`/`offset` with a default page of 200.** A 20,000-question bank must
  never arrive in one response.
- **Real queries for notes and videos.** `listNotes` previously returned the
  bundled array from *both* branches — the query had never been written, so an
  uploaded note could not appear however well the rest of the pipeline worked.
  Sections and chapters are fetched with their parent rather than one request
  per row.
- **`useAsync` + `AsyncSection`** in each app: loading skeletons, an error with
  a retry button, and an empty state, in one wrapper. A response that arrives
  after its inputs changed is discarded, so switching topics quickly cannot
  leave the previous topic's questions on screen.
- **`repository.test.ts`** — 16 tests covering filter composition, paging,
  empty results, the offline fallback, and that `listQuestions` and
  `buildPracticeSet` agree so behaviour does not change with connectivity.

### Screens migrated

Practice (topic, subject, PYQ), tests list, notes list and reader, explore
search, current affairs, videos and batches — on both web and mobile. The PYQ
screens gained a year picker built from real `pyq_year` values.

### Verified

`npm run typecheck` clean, `npm test` 71/71, Next.js production build, Expo web
export, and a browser pass at 390px and 1440px with no console errors —
including a practice run rendering a question and its PYQ tag through the
repository.

Against Postgres 16 with all six migrations and the seed applied, with one
question forced into each of draft, review and archived: a learner sees 64
published questions and **0** in any other state; an anonymous client the same;
an educator sees all three; a second educator sees **0** of the first's import
batches; a learner reads **0** audit rows; year and PYQ filters return exactly
the tagged question; and a filter matching nothing returns 0 rather than an
error.

### Known limitations

- **Batches are still bundled content on both branches.** A batch is a schedule
  of live classes and there is no scheduling backend to read from yet. The
  screens go through `listBatches` anyway, so the day one exists, no UI changes.
- Results and analytics read the attempt and the question bank, which now come
  through the repository; there is no dedicated PYQ-trend screen yet, so
  `listTopicFrequency` is available and unused by any UI.
- Studio import UI is still not built; import remains CLI-only, as planned.
- Answer keys remain readable client-side. Offline practice with instant
  feedback requires them, and tests are graded server-side by `submit_attempt`.
  This is a deliberate trade-off, unchanged from Phase 1.

---

## Content library — architecture for large-scale import

The application was built to render a question bank. This change builds the
question bank itself: the model, the checks and the pipeline a real HTET or CTET
dataset has to pass through before a learner ever sees it.

### Why

The audit found one problem that mattered more than the rest. A question knew
its subject and topic, and remembered where it came from in a free-text column:

```ts
previousYear: 'CTET Dec 2022 Paper 1'
```

That reads perfectly and answers nothing. PYQ-by-year, repeated-question
analysis, shift comparison and topic frequency all need that string parsed back
into fields — and parsing English is guessing. Everything else followed from the
same root: no unit or subtopic level, no editorial state, no validation, nothing
to import into.

### Added

- **`packages/core/src/content/types.ts`** — the library model. Adds units and
  subtopics around the existing subject/topic pair, a structured `PyqRef`, nine
  question kinds, per-question marks, concept tags and syllabus references, and
  a `draft → review → published → archived` lifecycle. `toQuestion()` narrows a
  library question to the render shape and returns `null` for anything
  unpublished or unrenderable, so draft content cannot reach a screen by
  accident.
- **`packages/core/src/content/validation.ts`** — one gate for the importer, the
  Studio and the tests. Errors block; warnings are recorded and let the row
  through.
- **`packages/core/src/content/import.ts`** — CSV parsing that survives real
  exported data (quoted commas, escaped quotes, embedded newlines, CRLF),
  case-insensitive column matching with aliases, answer letters in every form
  contributors write them, and a report naming every rejection by spreadsheet
  line number. Writes nothing, ever.
- **`supabase/migrations/0005_content_library.sql`** — units, subtopics,
  structured PYQ columns, lifecycle status on questions/notes/videos/tests,
  import staging tables, a content audit trail, and the `pyq_topic_frequency`
  view that replaces hand-written weightage numbers with counts from real
  papers.
- **`supabase/migrations/0006_content_rls.sql`** — see Security below.
- **`supabase/seed/import-questions.ts`** — the CLI. `--dry-run` validates and
  reports; without it, SQL goes to stdout for review before anything is applied.
- **`packages/core/test/`** — 55 tests and the runner to execute them. There was
  no test script in the repository before this change.

### Security

`0002_rls.sql` granted `select using (true)` on every content table. That was
correct when every row was published seed data and became a leak the moment
drafts existed. `0006` narrows public reads on questions, notes, videos and
tests — and on the child tables holding their sections and chapters — to
`status = 'published' or is_staff()`.

Import staging is private to its uploader plus admins: one educator cannot read
another's upload. The audit log is readable by staff and writable by nobody —
the status trigger is `SECURITY DEFINER` and every other writer is denied,
because a history that can be rewritten is not a history.

Publishing runs through `set_question_status()`, which re-checks English text,
Hindi text, option count and answer range in the database. The TypeScript
validator can be bypassed by anything that talks to Postgres directly; this
cannot.

### Changed

- An explanation is now a warning rather than an error. Real previous-year banks
  arrive as question-and-answer with no commentary, and rejecting those rows
  would reject exactly the material the platform most needs. Found by a test.
- `@types/react`, `typescript` and the whole `expo-*` family pinned to the SDK
  matrix; `metro.config.js` no longer disables hierarchical module lookup.

### Verified

Postgres 16, all six migrations applied in order, then: a learner and an
anonymous client both read 0 draft questions and all 66 published ones; an
educator reads the draft; a learner is refused `set_question_status`; an
educator's publish succeeds and leaves two audit rows. Publishing a question
with empty Hindi is refused by the database and the row stays a draft. One
educator reads 0 of another's import batches.

End to end: a five-row HTET CSV imported — three accepted, two rejected by line
number (`row 5: correctIndices`, `row 6: unknown subject "chemistry"`) — landed
as drafts invisible to the public, were published by an educator, and then
appeared in `pyq_topic_frequency` as `htet | cdp-piaget | 2 questions |
2024-2024`.

`npm run typecheck` and `npm test` pass in every workspace (55/55). The Next.js
production build and the Expo web export both succeed, and the browser pass at
390px and 1440px is unchanged.

### Known limitations

- **The apps still read bundled seed data directly.** `repository.ts` is the
  intended boundary and is fully implemented, but no screen calls it — 19 files
  import the seed arrays. Imported content therefore reaches the database and
  the analysis views, but not yet the UI. This is the next piece of work and it
  is a wiring change, not an architectural one.
- The Studio has no import screen yet; import is CLI-only.
- Excel and PDF import are not implemented. The row interface they would target
  exists.
- Answer keys remain readable by the client, which offline practice with instant
  feedback requires. High-stakes tests are already graded server-side by
  `submit_attempt()`; a projection without `correct_index` is the next step if
  answers must be withheld before submission.
- `pyq_topic_frequency` returns nothing for the bundled seed bank, whose
  provenance is prose. Legacy `previous_year` strings were preserved rather than
  parsed into metadata, because a wrong guess is worse than a null.

---

## Earlier

- Android APK built and released; the failure was Metro, not Gradle — hierarchical
  lookup was disabled, hiding `expo-glass-effect` and `expo-symbols` nested
  inside `expo-router`.
- Dashboard rebuilt around today's work; notes open as paginated PDF documents.
- Responsive layouts; sign-in and goal selection reshaping the app per exam.
- Supabase schema, RLS, server-side grading and seed generation.
- Web, mobile and shared core.
