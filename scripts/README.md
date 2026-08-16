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
