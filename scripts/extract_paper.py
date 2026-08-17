#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract questions from an HTET question-paper PDF.

Layout facts these papers follow (see papers/EXTRACTION-RULES.md):

  * two columns per page — Hindi on the left (x < ~310), English on the right
  * Hindi is drawn in a Kruti Dev font with no /ToUnicode map; English is Times
  * bold Hindi is stroked 2-4 times with a tiny offset, so identical runs repeat
  * question numbers are Latin digits in the Times font, in BOTH columns
  * Q31-45 exist only in Hindi and Q46-60 only in English — that is correct

    python scripts/extract_paper.py papers/htet-2024-tgt-5211-science-paper.pdf \
        --key papers/htet-2024-tgt-5211-science-key.pdf \
        --range 1-150 -o output/htet-2024-tgt-5211.xlsx
"""
from __future__ import annotations

import argparse
import collections
import os
import re
import sys

from openpyxl import Workbook
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTChar, LTTextContainer

from krutidev import convert
from parse_key import parse_key

COLUMN_SPLIT = 310.0          # page is 595pt wide; the gutter sits near 310
ROW_TOL = 4.0                 # y0 slop that still counts as "the same row"
Q_START = re.compile(r"^\s*(\d{1,3})\s*\.\s*")
OPTION = re.compile(r"\(\s*([1-4])\s*\)")
HEADER = [
    re.compile(r"\[\s*\d+\s*/\s*[A-D]\s*\]"),
    re.compile(r"\[\s*Level\s*[-–]\s*\d\s*/\s*\d{4}\s*\]"),
    re.compile(r"P\.\s*T\.\s*O\.?"),
]
ROUGH_WORK_LABEL = re.compile(
    r"Rough\s*Work|\[\s*FOR\s*ROUGH\s*WORK\s*\]|रफ\s*कार्य\s*के\s*लिए\s*जगह", re.I)

PART_RANGES = {
    "prt": [(1, 30, "Part I – Child Development & Pedagogy"),
            (31, 45, "Part II – Language I (Hindi)"),
            (46, 60, "Part II – Language II (English)"),
            (61, 90, "Part III – General Studies"),
            (91, 120, "Part IV – Mathematics"),
            (121, 150, "Part V – Environmental Studies")],
    "other": [(1, 30, "Part I – Child Development & Pedagogy"),
              (31, 45, "Part II – Language I (Hindi)"),
              (46, 60, "Part II – Language II (English)"),
              (61, 90, "Part III – General Studies"),
              (91, 150, "Part IV – Elective Subject")],
}


EN_WORDS = {"the", "of", "in", "is", "which", "following", "and", "to",
            "for", "not", "are", "was", "by", "with", "that"}


def detect_hindi_font(path: str, sample_pages=(2, 3, 4)) -> str:
    """Identify the Kruti Dev font.

    The aa-matra "k" carries roughly 13% of all Kruti Dev characters but under
    1% of English text, and Kruti Dev runs contain no English function words.
    Together those two signals separate the fonts cleanly on every HTET paper.
    """
    text: dict[str, list] = collections.defaultdict(list)
    for page in extract_pages(path, page_numbers=list(sample_pages)):
        for el in page:
            if not isinstance(el, LTTextContainer):
                continue
            for line in el:
                try:
                    chars = [c for c in line if isinstance(c, LTChar)]
                except TypeError:
                    continue
                for c in chars:
                    text[c.fontname.split("+")[-1]].append(c.get_text())

    best, best_freq = None, 0.0
    for font, chars in text.items():
        s = "".join(chars)
        if len(s) < 200 or "Helvetica" in font:
            continue
        if set(w.lower() for w in s.split()) & EN_WORDS:
            continue                      # clearly English
        freq = s.count("k") / len(s)
        if freq > best_freq:
            best, best_freq = font, freq
    return best if best_freq > 0.04 else None


def detect_gutter(page, lo=230.0, hi=400.0) -> float:
    """Find the column boundary as the x with fewest lines straddling it.

    COLUMN_SPLIT used to be hard-coded at 310, which is wrong for several
    papers: 5321 puts its second column at 300, and the language papers run
    continuous text across both columns.
    """
    spans = []
    for el in page:
        if not isinstance(el, LTTextContainer):
            continue
        for line in el:
            try:
                if not any(isinstance(c, LTChar) for c in line):
                    continue
            except TypeError:
                continue
            spans.append((line.x0, line.x1))
    if not spans:
        return COLUMN_SPLIT
    best, best_cost = COLUMN_SPLIT, 10 ** 9
    for x in range(int(lo), int(hi), 5):
        cross = sum(1 for a, b in spans if a < x < b)
        left = sum(1 for a, _ in spans if a < x)
        right = len(spans) - left
        if not left or not right:
            continue
        cost = cross * 10 + abs(left - right)
        if cost < best_cost:
            best, best_cost = float(x), cost
    return best


def page_lines(path: str, hindi_font: str):
    """Yield (page_no, lang, col, y, text) with Hindi runs already converted.

    Language comes from the embedded FONT, not from the column. A Hindi or
    Sanskrit elective paper runs the same language down both columns, so an
    x-position rule mislabels half of it. Lines with no letters at all - a bare
    "1." or "(2)" - inherit the language that dominates their column.
    """
    for pno, page in enumerate(extract_pages(path), start=1):
        gutter = detect_gutter(page)
        seen = set()
        rows = []
        for el in page:
            if not isinstance(el, LTTextContainer):
                continue
            for line in el:
                try:
                    chars = [c for c in line if isinstance(c, LTChar)]
                except TypeError:
                    continue
                if not chars:
                    continue
                raw = "".join(c.get_text() for c in chars)
                if not raw.strip():
                    continue
                key = (round(line.y0), round(line.x0), raw)
                if key in seen:          # fake-bold duplicate stroke
                    continue
                seen.add(key)

                letters = [c for c in chars if c.get_text().isalpha()]
                if letters:
                    n_hi = sum(1 for c in letters
                               if c.fontname.split("+")[-1] == hindi_font)
                    lang = "hi" if n_hi * 2 >= len(letters) else "en"
                else:
                    lang = None          # decided below, from the column

                out, buf, buf_hi = [], [], None
                for c in chars:
                    is_hi = c.fontname.split("+")[-1] == hindi_font
                    if buf_hi is None or is_hi == buf_hi:
                        buf.append(c.get_text())
                        buf_hi = is_hi
                    else:
                        out.append(convert("".join(buf)) if buf_hi else "".join(buf))
                        buf, buf_hi = [c.get_text()], is_hi
                if buf:
                    out.append(convert("".join(buf)) if buf_hi else "".join(buf))
                text = "".join(out)
                for pat in HEADER:
                    text = pat.sub(" ", text)
                text = re.sub(r"\s+", " ", text).strip()
                if not text:
                    continue
                if ROUGH_WORK_LABEL.search(text):
                    # Not a dedicated blank page -- this bilingual footer
                    # note ("रफ कार्य के लिए जगह / Space For Rough Work" /
                    # "[FOR ROUGH WORK]") is printed on every content page
                    # right below the real questions, so only this one line
                    # is dropped, never the whole page.
                    continue
                rows.append([lang, 0 if line.x0 < gutter else 1, line.y0, line.x0, text])

        # Decide per page whether the two columns are a translation pair or the
        # same language flowing across both, then assign every line accordingly.
        #
        # Font alone is not enough: a Hindi Computer Science question prints its
        # options as English terms, so a per-line font rule pushes them into the
        # English stream and leaves the Hindi options empty. Column position
        # alone is not enough either, because the language papers run one
        # language down both columns. So: use the font to work out what each
        # column *is*, then use the column to place every line inside it.
        owner = {}
        for col in (0, 1):
            votes = collections.Counter(r[0] for r in rows if r[1] == col and r[0])
            owner[col] = votes.most_common(1)[0][0] if votes else None
        if owner[0] and owner[1] and owner[0] != owner[1]:
            for r in rows:                       # translation pair
                r[0] = owner[r[1]]
        else:                                    # one language, two columns
            only = owner[0] or owner[1] or "hi"
            for r in rows:
                r[0] = only

        # read column 0 fully, then column 1 - correct for both layouts.
        # A run split across fonts/sizes (e.g. a stacked fraction's
        # numerator/denominator, or a Hindi clause with an English word
        # stapled on) can come back from pdfminer as separate LTTextLine
        # objects on the same visual row but with slightly different y0
        # baselines (a point or two apart) -- a strict -y0 sort treats that
        # as two different rows and can emit the second fragment before the
        # first, or interleave it with an unrelated nearby option. Cluster
        # lines whose y0 is within ROW_TOL into one row first, then order
        # strictly by x0 (reading order) within the row; genuinely different
        # rows in this layout are always many points apart.
        for col in (0, 1):
            col_rows = sorted((r for r in rows if r[1] == col), key=lambda r: -r[2])
            clusters: list[list] = []
            for r in col_rows:
                if clusters and abs(clusters[-1][0][2] - r[2]) <= ROW_TOL:
                    clusters[-1].append(r)
                else:
                    clusters.append([r])
            for cluster in clusters:
                for lang, c, y, _x, text in sorted(cluster, key=lambda r: r[3]):
                    yield pno, lang, c, y, text


def split_questions(stream, lo: int, hi: int) -> dict[int, dict[str, str]]:
    """Group a column's lines into {q_no: {'stem':…, 'options':[…]}}."""
    out: dict[int, dict] = {}
    cur = None
    for text in stream:
        m = Q_START.match(text)
        if m and lo <= int(m.group(1)) <= hi:
            cur = int(m.group(1))
            out.setdefault(cur, {"raw": ""})
            text = text[m.end():]
        if cur is None:
            continue
        out[cur]["raw"] += " " + text

    parsed = {}
    for q, d in out.items():
        raw = re.sub(r"\s+", " ", d["raw"]).strip()
        pieces = OPTION.split(raw)
        stem = pieces[0].strip(" .:-")
        opts = ["", "", "", ""]
        for i in range(1, len(pieces) - 1, 2):
            n = int(pieces[i])
            opts[n - 1] = pieces[i + 1].strip()
        parsed[q] = {"stem": stem, "options": opts}
    return parsed


def part_for(q: int, level: str) -> str:
    for a, b, name in PART_RANGES["prt" if level == "prt" else "other"]:
        if a <= q <= b:
            return name
    return ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("paper")
    ap.add_argument("--key", required=True)
    ap.add_argument("--range", default="1-150")
    ap.add_argument("-o", "--out", required=True)
    args = ap.parse_args(argv)

    lo, hi = (int(x) for x in args.range.split("-"))
    level = "prt" if "-prt-" in os.path.basename(args.paper) else "other"

    hindi_font = detect_hindi_font(args.paper)
    if not hindi_font:
        print("could not identify the Hindi font", file=sys.stderr)
        return 1
    print(f"Hindi font: {hindi_font}")

    cols = {"hi": [], "en": []}
    for _pno, lang, _col, _y, text in page_lines(args.paper, hindi_font):
        cols[lang].append(text)

    qhi = split_questions(cols["hi"], lo, hi)
    qen = split_questions(cols["en"], lo, hi)
    key = parse_key(args.key)

    wb = Workbook()
    ws = wb.active
    ws.title = "questions"
    ws.append(["q_no", "part",
               "question_hindi", "option_1_hindi", "option_2_hindi",
               "option_3_hindi", "option_4_hindi",
               "question_english", "option_1_english", "option_2_english",
               "option_3_english", "option_4_english",
               "answer", "answer_type", "ai_note"])

    for q in range(lo, hi + 1):
        h = qhi.get(q, {"stem": "", "options": ["", "", "", ""]})
        e = qen.get(q, {"stem": "", "options": ["", "", "", ""]})
        ans, atype = key.get(q, ("", ""))
        ws.append([q, part_for(q, level),
                   h["stem"], *h["options"],
                   e["stem"], *e["options"],
                   ans or "", atype, ""])

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    wb.save(args.out)

    got_hi = sum(1 for q in range(lo, hi + 1) if qhi.get(q, {}).get("stem"))
    got_en = sum(1 for q in range(lo, hi + 1) if qen.get(q, {}).get("stem"))
    print(f"{args.out}: {hi - lo + 1} rows | Hindi stems {got_hi} | English stems {got_en}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
