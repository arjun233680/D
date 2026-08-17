# HTET extraction pipeline

Python scripts that turn a BSEH question-paper PDF into rows the Adhyapak
Studio importer accepts. Read `papers/EXTRACTION-RULES.md` first — it records
everything that was verified about these PDFs and must not be re-derived.

## Install

    pip install pypdf pdfminer.six openpyxl

## Files

| File | What it does |
|---|---|
| `krutidev.py` | Kruti Dev legacy font -> Unicode Devanagari |
| `parse_key.py` | reads an official answer key PDF, Set A page only |
| `validate.py` | gate before writing output: counts, answers, options, blanks |
| `to_import_format.py` | extraction workbook -> app import columns |
| `test_krutidev.py` | regression tests (17 word pairs + 150-row golden file) |
| `tests/golden_5211.json` | hand-verified rows of `htet-2024-tgt-5211-science` |
| `extract_paper.py` | **not written yet** — see below |

## Status

`krutidev.py` passes all 17 word tests but has **not** been proved on whole
sentences yet. `tests/golden_5211.json` exists for exactly that: it holds the
150 hand-verified rows of paper 5211. Any change to the converter must be
checked against it before a bulk run.

    python scripts/test_krutidev.py                       # word tests only
    python scripts/test_krutidev.py output/htet-2024-tgt-5211.xlsx   # + golden

Target: 100% on the golden file. Anything less means the converter still has
missing glyphs, and a bulk run would bake those errors into every paper.

## Language separation

Hindi and English separate by **embedded font name**, never by column position.
In these PDFs:

    TT279t00              Kruti Dev  -> Hindi
    TT5B0t00 / 5B1 / 5B2  Times      -> English
    Helvetica             page headers, "P. T. O."

Font subset prefixes (`XRQUZW+`) change per file, so strip everything before
the `+` and match on the suffix. Confirm the mapping per paper by checking
which font produces Kruti Dev-looking text.

Bold Hindi is stroked several times with a tiny offset, so the same run appears
2-4 times in a row. `krutidev.convert()` collapses that by default.

## Typical run

    python scripts/parse_key.py papers/htet-2024-tgt-5211-science-key.pdf

    python scripts/extract_paper.py \
        papers/htet-2024-tgt-5211-science-paper.pdf \
        --key papers/htet-2024-tgt-5211-science-key.pdf \
        --range 1-150 \
        -o output/htet-2024-tgt-5211.xlsx

    python scripts/validate.py output/htet-2024-tgt-5211.xlsx \
        --key papers/htet-2024-tgt-5211-science-key.pdf --expect 150

    python scripts/to_import_format.py output/htet-2024-tgt-5211.xlsx \
        --level TGT --paper Science --year 2024 \
        --fixed "1-30=CDP,31-45=Hindi,46-60=English" \
        --labels labels/htet-2024-tgt-5211.csv \
        --categories "Numerical Aptitude,Reasoning,Haryana GK,General GK,Physics,Chemistry,Biology,Science Pedagogy"

## extract_paper.py

Still to be written. It must produce a `questions` sheet with these columns:

    q_no, part,
    question_hindi,   option_1_hindi   .. option_4_hindi,
    question_english, option_1_english .. option_4_english,
    answer, answer_type, ai_note

and honour the layout facts in `papers/EXTRACTION-RULES.md` — in particular
that Q31-45 are Hindi-only and Q46-60 English-only, which is correct and not a
failure.

## Where extract_paper.py stands

Measured by re-extracting all 34 papers (`python3 scripts/extract_all.py --force`,
about 100 seconds) and counting cells that should be filled but are not.
Language sections are excluded correctly: a monolingual elective paper is not
penalised for having no second language, and Q31-45 / Q46-60 are single-language
by design.

    25 of 34 papers clean
    584 missing cells remaining
    golden score on paper 5211: 75.6%

### How language is decided — do not change this without reading it

Two rules were tried and both failed on their own:

* **Column position alone** breaks the language papers (5201-5204, 5301-5304),
  which run one language down *both* columns rather than as a translation pair.
* **Font per line alone** breaks Computer Science and similar papers, whose
  Hindi questions print their options as English technical terms; those lines go
  into the English stream and leave the Hindi options empty.

The working rule uses both: the font decides what each *column* is, and then the
column places every line inside it. If the two columns resolve to different
languages the page is a translation pair; if they resolve to the same one, it is
a single language flowing across both columns.

The column boundary itself is detected per page by `detect_gutter()`, because it
is not always at 310 — paper 5321 puts it at 300.

### What is left, in priority order

1. **Formula papers (~330 of the 584 missing cells).**
   `5316 chemistry` 128, `5315 physics` 79, `5210 maths` 62, `5318 maths` 60.
   Options containing formulas, fractions or symbols are dropped. Look at how
   those runs are drawn — they are likely in a third font, or positioned as
   separate text boxes that the line grouping misses.

2. **Superscripts and subscripts.**
   `2 -> ²`, `2 -> ₂`, `3 -> ³`, `-4 -> ⁻⁴`. Not glyph-table entries: they are
   ordinary digits drawn smaller and raised or lowered. Detect in `page_lines()`
   by comparing each `LTChar`'s `size` and `y0` against its line's median.

3. **Urdu papers `5205` and `5305` — currently produce nothing.**
   Their fonts are `TT5DAt00` / `TT6D6t00`, which are neither Kruti Dev nor
   Times. This is a separate Urdu encoding and needs its own converter. Leave
   them out of the bulk run and record them in FAILURES.md.

4. **`5320 fine-arts` 55, `5201`/`5301 hindi` ~30 each.** Smaller, unexamined.

Run after every change:

    python3 scripts/extract_all.py --force
    python3 scripts/test_krutidev.py output/htet-2024-tgt-5211-science.xlsx

Target 32 of 34 papers clean (the two Urdu papers excepted). Do not chase 100%
on the golden file — it came from a different converter, so a small tail of
spacing and punctuation differences will always remain.
