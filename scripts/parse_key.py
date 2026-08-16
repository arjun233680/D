#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse an HTET official BSEH answer key PDF.

Keys list one line per question: "001 4". Three kinds of value appear:

    "4"      normal single answer
    "*"      the question was cancelled by the board
    "3 & 4"  the board accepted two options

Papers exist in Sets A/B/C/D. Every paper in papers/ is Set A, and most keys
contain only the Set A page — but some (e.g. tgt-5208-arts) carry all four.
Parsing every page merges the sets and silently corrupts the answers, so this
module filters to the "Set : A" page first.

    from parse_key import parse_key
    parse_key("papers/htet-2024-tgt-5211-science-key.pdf")
    # {1: ('2', 'single'), ..., 40: (None, 'dropped'), 42: ('3,4', 'multiple')}
"""
from __future__ import annotations

import re
import sys

from pypdf import PdfReader

SET_RE = re.compile(r"Set\s*[:\-]?\s*([A-D])", re.I)
LINE_RE = re.compile(r"(?m)^\s*(\d{3})\s+(.+?)\s*$")


def parse_key(path: str, want_set: str = "A") -> dict[int, tuple[str | None, str]]:
    """Return {q_no: (answer, answer_type)} for the requested set."""
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        m = SET_RE.search(text)
        if m and m.group(1).upper() == want_set.upper():
            pages.append(text)
    if not pages:                      # no set marker at all — take everything
        pages = [(p.extract_text() or "") for p in reader.pages]
        if len(reader.pages) > 1:
            raise ValueError(
                f"{path}: {len(reader.pages)} pages but no 'Set : {want_set}' "
                "marker found — refusing to merge sets")

    out: dict[int, tuple[str | None, str]] = {}
    for text in pages:
        for num, raw in LINE_RE.findall(text):
            q = int(num)
            raw = raw.strip()
            if raw == "*":
                out[q] = (None, "dropped")
            elif "&" in raw:
                digits = re.findall(r"\d", raw)
                out[q] = (",".join(digits), "multiple")
            elif raw.isdigit() and raw in "1234":
                out[q] = (raw, "single")
            else:
                raise ValueError(f"{path}: Q{q} has unrecognised answer {raw!r}")
    return out


if __name__ == "__main__":
    for p in sys.argv[1:]:
        k = parse_key(p)
        dropped = [q for q, (_, t) in k.items() if t == "dropped"]
        multi = [q for q, (_, t) in k.items() if t == "multiple"]
        print(f"{p}: {len(k)} answers | dropped {dropped} | multiple {multi}")
