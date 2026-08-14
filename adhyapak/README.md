# अध्यापक — Adhyapak

**India's dedicated preparation platform for teaching exams.** A mobile app and a website, built from one codebase, for CTET, HTET, UPTET, Bihar TET, DSSSB, KVS, NVS, REET, HSSC TGT/PGT/PRT, Super TET, MPTET and every other teaching-recruitment exam — fully bilingual in Hindi and English.

---

## What's inside

| Feature | Where |
| --- | --- |
| Goal-based home feed (pick your exam, everything re-orders) | web `/`, app Home tab |
| Live batches with schedule, educators and module-wise syllabus | `/batches` |
| Video lessons with chapter seeking, live classes, notes attached | `/videos` |
| Notes library with an in-app reader (offline-readable) + print/PDF | `/notes` |
| MCQ practice with instant explanations, PYQ tags and difficulty | `/practice` |
| Testbook-style mock test player — timer, palette, mark-for-review, sections, auto-submit | `/tests/:id/attempt` |
| Result & analysis — score, rank, percentile, section split, weak topics, solutions | `/tests/:id/result` |
| Educator Studio — upload videos and notes with bilingual metadata | `/studio` |
| Doubts, education current affairs, streaks, bookmarks, saved notes | `/doubts`, `/current-affairs`, `/profile` |

Every exam ships with its real pattern: section-wise question and mark split, duration, negative marking and the qualifying cut-off.

---

## Repository layout

```
adhyapak/
├── packages/core/        @adhyapak/core — the shared brain (zero dependencies)
│   ├── src/types.ts          domain model
│   ├── src/theme.ts          design tokens used by BOTH apps
│   ├── src/data/             exams, subjects, educators, questions, videos,
│   │                         notes, batches, tests, feeds
│   └── src/engine/           test engine, practice engine, formatters
├── apps/web/             Next.js 16 + React 19 + Tailwind v4 (the website / PWA)
├── apps/mobile/          Expo SDK 57 + React Native 0.82 + Expo Router (the app)
└── supabase/             Postgres schema, row-level security, grading, seed
```

**The web app and the mobile app share `@adhyapak/core` completely** — the same
question bank, the same scoring, the same rank simulation, the same colour
tokens. A change to the exam pattern lands in both products at once.

---

## Running it

```bash
npm install          # once, from the adhyapak/ directory

npm run dev:web      # website at http://localhost:3000
npm run dev:mobile   # Expo — scan the QR with Expo Go, or press a / i / w
```

Other scripts:

```bash
npm run build        # production build of core + web
npm run typecheck    # typecheck every workspace
```

---

## Design system

One source of truth: `packages/core/src/theme.ts`.

- The web app projects those values into CSS custom properties in `apps/web/app/globals.css`.
- The mobile app consumes the same object directly in `StyleSheet` objects.

Deep-ink surfaces, a green primary action, saffron highlights for memory callouts,
and a fixed palette for the test player where colour carries meaning
(green = answered, red = not answered, purple = marked for review, grey = not visited).

---

## Bilingual by construction

Every user-facing string in the domain model is a `Bilingual` object:

```ts
interface Bilingual { en: string; hi: string }
```

There is no English-first fallback path and no translation file to fall out of
sync — a question that lacks Hindi will not typecheck. The language toggle works
mid-test without losing a single answer.

---

## The test engine

`packages/core/src/engine/test-engine.ts` is pure TypeScript with no React and no
platform APIs, which is why both apps run the identical exam experience:

- `createAttempt` / `visitQuestion` / `selectOption` / `toggleMarkForReview` / `clearResponse`
- per-question time accounting, so the analysis screen can show where time went
- `paletteCounts` and `statusOf` for the question palette
- `gradeAttempt` — negative marking, section scores, topic accuracy, weak/strong
  topics, percentile and rank against the cohort, qualified against the real cut-off

Attempts persist (localStorage on web, AsyncStorage on mobile), so a refresh or a
backgrounded app resumes the paper with the clock honest.

---

## The content library

Screens render `Question` and `Note` from `packages/core/src/types.ts` — the
minimum a practice card or a PDF reader needs. Behind them sits the *library*
model in `packages/core/src/content/`, which is what a real question bank
actually requires: where a question sits in the syllabus, which paper it came
from, and whether anyone has reviewed it.

```
exam → level → subject → unit → topic → subtopic → question | note | video
```

Unit and subtopic are optional at every level, because syllabi differ in depth
and forcing one shape would mean a special case per exam.

**Nothing reaches a learner unreviewed.** Every piece of content moves through

```
draft → review → published → archived
```

`toQuestion()` refuses to render anything that is not `published`, and the
database enforces the same rule in `set_question_status()` — the client is not
trusted, because anything that can reach Postgres can bypass TypeScript.
Archived is terminal: a question that turned out to be wrong is still evidence
about what an exam asked, so nothing is ever destroyed.

### Previous-year questions

PYQ provenance is structured, never prose:

```ts
pyq: { examId: 'htet', year: 2024, paperLabel: 'Paper 1', shift: '1', questionNumber: 27 }
```

A string like `"HTET 2024 Paper 1"` reads fine and answers nothing — you cannot
filter by year, separate two shifts, or chart topic frequency without parsing
English back apart. With the structured form, `pyq_topic_frequency` in the
database does the analysis in SQL, so web, mobile and any admin tool report the
same numbers.

### Bulk import

```bash
# check a file without writing anything
npx tsx supabase/seed/import-questions.ts bank.csv --exam htet --dry-run

# generate the SQL, review it, then apply it
npx tsx supabase/seed/import-questions.ts bank.csv --exam htet > import.sql
psql "$DATABASE_URL" -f import.sql
```

Columns are matched case-insensitively and ignore spaces, underscores and
hyphens, so `Option A`, `option_a` and `OPTIONA` are the same column. Recognised
names are in `DEFAULT_COLUMNS` (`packages/core/src/content/import.ts`):

| Column | Notes |
| --- | --- |
| `Exam`, `Level`, `Subject`, `Unit`, `Topic`, `Subtopic` | placement; ids, not display names |
| `Question`, `Question Hi` | English is required, Hindi is required to publish |
| `Option A`–`Option D`, `Option A Hi`–… | at least two options |
| `Correct Answer` | `B`, `b`, `2` and `Option B` all work; `A and C` for multiple |
| `Explanation`, `Explanation Hi` | wanted, never required |
| `Year`, `Paper`, `Shift`, `Q No` | any year present makes the row a PYQ |
| `Difficulty`, `Marks`, `Negative Marks`, `Source`, `Tags` | optional |

The importer **writes nothing**. It returns accepted rows, rejected rows and the
reason for each rejection with its spreadsheet line number, so a 4,000-row file
with 12 bad rows does not become 12 bad questions — and does not block the other
3,988 either. Imports land as drafts; publishing is a separate, deliberate act.

`.xlsx` workbooks are read too, by `packages/core/src/content/xlsx.ts` — a
reader written against the file format rather than pulled in as a dependency, so
`@adhyapak/core` stays dependency-free and both apps keep importing it as source
with no build step. It handles multi-sheet workbooks, shared and inline strings,
dates, gaps and Devanagari; formulas arrive as their cached value and styling is
ignored. See [docs/IMPORTING.md](docs/IMPORTING.md).

PDF remains out of scope. Convert it, or hand `importQuestions()` rows from
whatever parser you already have — a row is a plain `Record<string, string>`,
and that is the whole extension point.

### Validation

`packages/core/src/content/validation.ts` is the single gate, used by the
importer, by the Studio before a save, and by the tests. Errors block, warnings
do not:

- **blocks** — no English text, no correct answer, an answer pointing outside the
  options, fewer than two options, an unknown subject/topic/exam id, a duplicate
  id in the same file, an implausible exam year, publishing without Hindi
- **warns** — no explanation, a repeated option, no exam attached, negative
  marking larger than the marks on offer

### Importing from the Studio

`/studio/import` is the same pipeline with a UI on it: upload an `.xlsx`
workbook or a CSV, confirm or change the column mapping, review, import. A
workbook with several sheets gets a worksheet picker, and a table that starts
below a title row is found rather than rejected. Rejected rows are listed by
spreadsheet row number with the field, the problem and a suggested fix; possible
duplicates are shown with a reason and skipped only if you tick them.

The upload step also offers a starter workbook with every column correctly
named and one filled-in example, which is the shortest path from a blank
spreadsheet to a valid import.

Everything lands as a draft — the status is forced by the database function, not
by the client — and `/studio/drafts` is where they are published in bulk. Every
publish goes through `set_question_status`, so the checks run per question and
the audit trail records who did it.

Parsing, mapping and validation are entirely client-side, so a file can be
checked without any database at all; only the final write needs one.

### Previous-year analysis

`/analytics/pyq` counts topic frequency and a per-year trend from questions
carrying structured PYQ metadata. Two rules it states on screen: a year with no
questions is **absent rather than zero**, because a gap means the paper has not
been collected; and the High/Medium/Low bands are **derived from the selected
data** — top third and bottom third of the observed range, printed underneath so
the label can be checked.

### Adding content by hand

| To add… | Edit |
| --- | --- |
| an exam | `packages/core/src/data/exams.ts` |
| a subject or topic | `packages/core/src/data/subjects.ts` |
| questions | import a CSV, or add a `QuestionSeed` to `packages/core/src/data/questions.ts` |
| a mock test | `packages/core/src/data/tests.ts` — composed from the bank, so new questions deepen existing mocks |
| a batch, video or note | the matching file in `packages/core/src/data/` |

---

## Testing

```bash
npm test          # every workspace
npm run typecheck # every workspace
```

`packages/core/test/` covers what is expensive to get wrong: scoring, negative
marking (including that a blank is never penalised and a score never goes
negative), palette accounting, mark-for-review, clear-response, immutability of
attempt state, the cut-off boundary, then the whole import path — CSV quoting,
answer-letter parsing, every validation rule, and the refusal to render a draft.

Seed integrity is tested too: every test references questions that exist, every
question's answer is inside its own options, and every question carries both
languages.

---

## The backend

Postgres on Supabase, in `supabase/` — schema, row-level security, server-side
grading and a seed generator. See [`supabase/README.md`](supabase/README.md) for
setup; it is four SQL files and two environment variables.

The app runs in either of two modes and no screen can tell them apart:

- **configured** — reads and writes go to Postgres, papers are marked in the
  database, and rank is computed against everyone else who sat that test.
- **offline** — with no credentials, the content bundled into the app is served
  instead. Useful in development, and it means an aspirant on a patchy
  connection still gets the whole question bank.

`packages/core/src/api/repository.ts` is the only place either app touches data,
and it degrades from the first mode to the second on any failure.

Grading lives in the database on purpose: the client cannot fake a score, the
answer key never has to reach the device before submission, and the percentile
is real rather than simulated.

## Where the data comes from

Exam patterns, dates, vacancies, eligibility and cut-offs were researched from
published notifications and reporting, and every exam carries its citations in
`sources` — rendered on the goal page with the date each fact was checked. Exams
whose current cycle has not been verified show that plainly rather than implying
freshness.

MCQs are original questions written to the published syllabus and marking
scheme, with worked explanations — not verbatim reproductions of any paper.
Where a question mirrors a pattern a board has repeated, it carries a
`previousYear` tag naming that paper.

Educators are illustrative profiles, not real people. Replace them with your
faculty before launch.
