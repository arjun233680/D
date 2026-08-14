# Importing a question bank

Adhyapak takes a real question bank — an Excel workbook or a CSV — and turns it
into reviewed, published questions without anyone editing source code. This is
how, and what happens to each row on the way.

## The short version

1. Open `/studio/import` signed in as an educator.
2. Download the starter workbook, or upload the file you already have.
3. Confirm the column mapping. Most files need no changes.
4. Read the review step: accepted, warned, rejected, duplicates.
5. Import. Everything lands as a **draft**.
6. Publish from `/studio/drafts`, in bulk or one at a time.

Nothing an import can do reaches a learner. The draft status is set by the
database function, not by the browser, so a modified client cannot publish by
sending a different status.

## What files work

| Format | Support |
| --- | --- |
| `.xlsx` | Yes — multi-sheet, shared strings, dates, gaps, Devanagari |
| `.csv`, `.tsv`, `.txt` | Yes — quoted fields, embedded newlines, CRLF |
| `.xls` (pre-2007 binary) | No. Save as `.xlsx` in Excel first; the wizard says so |
| `.pdf` | No. Not implemented, and not claimed |

Inside a workbook:

- **Several sheets** — the wizard shows a worksheet picker and defaults to the
  first sheet that has data, because a leftover empty `Sheet1` is common.
- **A title above the table** — the header is the first row with at least two
  non-empty cells, so a title and a blank spacer above the real header are
  skipped. The wizard prints which row it decided on.
- **Blank rows in the middle** — treated as spacers, not as empty questions.
- **Merged or missing cells** — cells are placed by their column reference, so a
  gap leaves an empty value instead of shifting the rest of the row left.
- **Formulas** — read as the cached value, which is what the contributor saw.
- **Dates** — converted to `YYYY-MM-DD`. A number that merely *looks* like a
  date serial stays a number; only a cell whose format is a date is converted.

## Columns

Names are matched case-insensitively, ignoring spaces, underscores and hyphens,
so `Option A`, `option_a`, `Option A EN` and `OPTIONA` are one column. The full
alias list is `DEFAULT_COLUMNS` in `packages/core/src/content/import.ts`, and
anything unrecognised can be mapped by hand in the wizard — a file whose headers
match nothing at all still imports.

| Column | Notes |
| --- | --- |
| `Exam`, `Level`, `Subject`, `Unit`, `Topic`, `Subtopic` | ids, not display names |
| `Question EN`, `Question HI` | English required; Hindi required to publish |
| `Option A EN`–`Option D EN`, `Option A HI`–… | at least two options |
| `Correct Answer` | `B`, `b`, `2` and `Option B` all work; `A and C` for multiple |
| `Explanation EN`, `Explanation HI` | wanted, never required |
| `Year`, `Paper`, `Shift`, `Q No` | any year present makes the row a PYQ |
| `Difficulty`, `Marks`, `Negative Marks`, `Source`, `Tags` | optional |

Subject, topic and exam are **ids** — `cdp`, `cdp-piaget`, `htet` — not
"Child Development" or "HTET Level 2". An unknown id is rejected with a
suggestion when a near match exists, so `mathematic` offers `math`.

## What gets rejected, and what only warns

Errors block the row. Warnings let it through and are shown anyway.

- **Blocks** — no English text, no correct answer, an answer pointing outside
  the options, fewer than two options, an unknown subject/topic/exam id, a
  duplicate id inside the file, an implausible exam year, publishing without
  Hindi.
- **Warns** — no explanation, a repeated option, no exam attached, negative
  marking larger than the marks on offer.

A rejected row does not stop the others: a 4,000-row file with 12 bad rows
imports 3,988 questions and lists 12 problems by their spreadsheet row number.

## Duplicates

Every question gets a fingerprint from its normalised text — case, punctuation,
quotes, spacing and the Devanagari danda are all levelled — and rows are checked
against each other *and* against what is already in the library.

Matches are **shown, never removed**. You tick the ones to skip. An automatic
merge would eventually delete a real question that happened to be worded like
another one, and no amount of cleverness makes that recoverable.

## Speed

Measured on this repository's CI-equivalent hardware, reading a deflate-
compressed workbook with a shared string table and running the full validation
pass:

| Rows | File size | Read | Validate | Total |
| --- | --- | --- | --- | --- |
| 500 | 32 KB | 82 ms | 6 ms | 88 ms |
| 1,000 | 62 KB | 56 ms | 9 ms | 66 ms |
| 5,000 | 310 KB | 268 ms | 51 ms | 325 ms |
| 20,000 | 1.2 MB | 1,045 ms | 145 ms | 1,210 ms |

So a 20,000-question bank parses and validates in about a second, in the
browser, before anything is written. Reproduce with:

```bash
npx tsx scripts/make-test-workbook.mts
```

The write to the database is a separate, chunked, progress-reported step; its
speed depends on the connection, not on the parser.

## Trying it without a database

Parsing, mapping, validation and in-file duplicate detection all run in the
browser, so a file can be checked with no backend configured at all. The wizard
says exactly why the final import button is disabled — "no database in this
build" and "you are not an educator" are different problems with different
fixes, and it never shows one when it means the other.

`docs/samples/adhyapak-test-questions.xlsx` is a deliberately imperfect
15-row workbook for exercising the review step: ten clean rows, an answer with
no matching option, an unknown subject, a row with no question text, a row with
no explanation, and one exact duplicate. Every row is marked `[TEST]` and dated
1999, before any covered exam existed, so it can never be mistaken for real
content.

## Regenerating the test fixtures

`scripts/make-test-workbook.mts` writes the sample workbook and prints the
benchmark. The third-party fixture the reader is tested against
(`packages/core/test/fixtures/openpyxl-workbook.xlsx`) was written by openpyxl
rather than by us, deliberately: every other test builds its own input and can
only prove the reader agrees with our own idea of the format. Recreate it with
`pip install openpyxl` and a script that writes a sheet with a title row, a
spacer, Devanagari, real date cells, a bold numeric cell and two extra sheets —
one of them empty.
