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

## Adding content

| To add… | Edit |
| --- | --- |
| an exam | `packages/core/src/data/exams.ts` |
| a subject or topic | `packages/core/src/data/subjects.ts` |
| questions | `packages/core/src/data/questions.ts` (one `QuestionSeed` per question) |
| a mock test | `packages/core/src/data/tests.ts` — composed from the bank, so new questions deepen existing mocks automatically |
| a batch, video or note | the matching file in `packages/core/src/data/` |

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
