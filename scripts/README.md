# HTET PDF Extraction Rules

Everything below was **verified against the actual PDFs in `papers/`** on 16 Aug 2026.
Do not re-derive it. Do not assume a nicer structure than what is written here.

---

## 1. File naming

```
papers/htet-<year>-<level>-<code>-<subject>-<paper|key>.pdf
```

`level` is `prt` | `tgt` | `pgt`. `code` is the BSEH **Sub. Code No.** printed inside
the PDF — it is the authoritative identifier, not the filename.

**HTET 2024 codes:** PRT `5101` · TGT `5201`–`5212` · PGT `5301`–`5321`
(34 codes, 34 paper+key pairs, 68 files.)

---

## 2. Paper blueprint (printed inside every paper — do not guess)

All three levels share the same Q1–90 **structure**:

| Questions | Part | Content |
|---|---|---|
| 1–30 | I | Child Development and Pedagogy |
| 31–45 | II | Hindi |
| 46–60 | II | English |
| 61–70 | III | Quantitative Aptitude |
| 71–80 | III | Reasoning Ability |
| 81–90 | III | G.K. & Awareness |

Part IV differs by level:

| Level | Part IV / V |
|---|---|
| PRT (5101) | Mathematics `91–120`, Environmental Studies `121–150` |
| TGT (52xx) | Elective subject `91–150` |
| PGT (53xx) | Elective subject `91–150` |

**150 questions, 2.5 hours, no negative marking.**

---

## 3. The common section (Q1–90) — verified findings

- **Within a level, Q1–90 is identical across every elective paper.**
  Verified two ways: question text compared across 3 TGT papers (90/90 identical),
  and all 12 TGT / all 21 PGT answer keys agree on Q1–90.
- **Across levels, Q1–90 is completely different.**
  PRT vs TGT match 20/90, PRT vs PGT 22/90, TGT vs PGT 18/90 — i.e. random chance.
  PRT, TGT and PGT each need their own common-section extraction.

### Designated source papers for the common section

| Level | Source paper | Why |
|---|---|---|
| TGT | `htet-2024-tgt-5202-english-paper.pdf` | 32 pages, Latin-script elective, no diagrams |
| PGT | `htet-2024-pgt-5302-english-paper.pdf` | same |
| PRT | `htet-2024-prt-5101-general-paper.pdf` | only paper at this level |

Papers with Hindi/Sanskrit/Urdu/Punjabi electives are deliberately **not** used as the
common-section source: their Part IV is non-Latin script and can confuse font-based
language separation.

---

## 4. Bilingual layout — the trap

Each question appears **Hindi first (Kruti Dev), then English**, under the same number.
But **not every question is bilingual**:

| Questions | Appears |
|---|---|
| 1–30, 61–90 | twice — Hindi **and** English |
| 31–45 | **Hindi only** (it is the Hindi language paper) |
| 46–60 | **English only** (it is the English language paper) |

An extractor that assumes "every question has two versions" will corrupt or drop
30 questions per paper. Q31–45 have no English text; Q46–60 have no Hindi text.
That is correct, not a failure.

---

## 5. Text extraction details

- PDFs are text-based, **not scanned** — no OCR needed.
- Hindi is **Kruti Dev legacy-font encoded with no `/ToUnicode` map**. Plain text
  extraction yields Latin gibberish. A Kruti Dev → Unicode conversion is required,
  including **pre-base matra reordering** and **reph reordering**.
- Separate Hindi from English by the **embedded font name**, never by column position.
- Strip these page headers before parsing:
  - `[ <page> / <set> ]` e.g. `[ 4 / A ]`
  - `[ Level-<n> / <code> ]` e.g. `[ Level-2 / 5211 ]`
  - `P. T. O.`
- Options are `(1)` `(2)` `(3)` `(4)`.
- Question numbers can also appear inside option text and rough-work pages — always
  anchor on line start plus the `N.` + whitespace pattern, and expect false positives.

---

## 6. Answer keys

Format is one line per question: `NNN <answer>` e.g. `001 4`.

### Sets
Papers exist in Sets A/B/C/D (shuffled order). **All papers in `papers/` are Set A.**
Most keys contain only the Set A page — but `htet-2024-tgt-5208-arts-key.pdf` has
**4 pages, one per set**.

**Always filter to the page containing `Set : A` before parsing.** Parsing all pages
merges the sets and silently corrupts the answers. (This is why a naive parse returns
147–148 answers instead of 150.)

### Three kinds of answer value

| Value | Count in 2024 | Meaning | How to store |
|---|---|---|---|
| `1`–`4` | ~5,015 | normal single answer | `mcq-single`, `answer = N` |
| `*` | **38** | question **cancelled/dropped** | `answer = null`, `status = "dropped"`, excluded from scoring |
| `2 & 4`, `3 & 4`, `2 & 3`, `1 & 4`, `1 & 3`, `1 & 2` | **47** | **two** options accepted as correct | `mcq-multiple`, `answers = [X, Y]` |

**85 questions are affected.** Flattening these to a single answer means shipping wrong
answers to learners. Never do it.

---

## 7. Consensus rule for the common section

Because every key at a level agrees on Q1–90, take the **majority vote across all keys
at that level**, not a single key:

| Level | Answer source for Q1–90 | Redundancy |
|---|---|---|
| TGT | consensus of all 12 TGT keys | 12× |
| PGT | consensus of all 21 PGT keys | 21× |
| PRT | `htet-2024-prt-5101-general-key.pdf` only | **1× — no cross-check** |

If one key disagrees on a Q1–90 answer, that is a **parsing bug in that key**, not a
genuine difference — it has been verified that they all agree. Stop and fix the parser.

⚠️ PRT has no redundancy. Its Q1–90 answers must be spot-checked by hand.

Q91–150 always comes from that paper's own key. No cross-check is possible there.

---

## 8. Hard rules

1. **Never infer an answer.** Answers come only from the official BSEH key. No key,
   no answer — set `status = "key_pending"` and move on.
2. **Never dump question text into chat.** Write straight to file. Large verbatim
   dumps have triggered content-filter errors on this project before.
3. **One paper per run**, or batches of ≤25 questions.
4. Validation must **fail loudly**: 150 questions, 4 options each, an answer or an
   explicit `dropped`/`key_pending` status for every one. Do not write a partial file.
5. `topic_id` comes only from the fixed topic map. Never invent a topic.

---

## 9. Work plan

```
htet-2024-tgt-5202-english-paper.pdf   →  Q1-90    TGT common   (12-key consensus)
htet-2024-pgt-5302-english-paper.pdf   →  Q1-90    PGT common   (21-key consensus)
htet-2024-prt-5101-general-paper.pdf   →  Q1-150   PRT full     (single key, manual check)
the other 32 papers                    →  Q91-150  elective only (own key)

Total unique questions = 150 + 90 + 90 + (33 × 60) = 2,310
```

Extracting all 34 papers in full would be 5,100 questions. Deduplicating the common
section removes 55% of the work.
