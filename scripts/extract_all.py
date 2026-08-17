#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract every HTET paper in one pass.

Extraction is pure compute — about 3.5 seconds per paper — so the whole 2024
set finishes in under two minutes. Run this once, then spend the session time
on the part that actually needs judgement: classifying Q91-150.

The common section Q1-90 is identical across every paper at a level, so it is
taken from one designated paper per level and every other paper contributes
only its elective Q91-150.

    python scripts/extract_all.py                 # everything
    python scripts/extract_all.py --only tgt      # one level
    python scripts/extract_all.py --only 5211     # one paper
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAPERS = os.path.join(ROOT, "papers")
OUT = os.path.join(ROOT, "output")

# the paper each level's common section Q1-90 is taken from
COMMON_SOURCE = {"prt": "5101", "tgt": "5211", "pgt": "5316"}


def papers():
    for path in sorted(glob.glob(os.path.join(PAPERS, "htet-*-paper.pdf"))):
        stem = os.path.basename(path)[:-len("-paper.pdf")]
        m = re.match(r"htet-(\d{4})-(prt|tgt|pgt)-(\d{4})-(.+)", stem)
        if not m:
            print(f"!! skipping unrecognised name: {stem}", file=sys.stderr)
            continue
        year, level, code, subject = m.groups()
        key = path.replace("-paper.pdf", "-key.pdf")
        if not os.path.exists(key):
            print(f"!! no answer key for {stem}", file=sys.stderr)
            continue
        full = COMMON_SOURCE.get(level) == code
        yield dict(stem=stem, path=path, key=key, year=year, level=level,
                   code=code, subject=subject, full=full)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="filter by level (tgt) or subject code (5211)")
    ap.add_argument("--force", action="store_true",
                    help="re-extract papers whose output already exists")
    args = ap.parse_args(argv)

    os.makedirs(OUT, exist_ok=True)
    rows, failed = [], []
    start = time.time()

    for p in papers():
        if args.only and args.only not in (p["level"], p["code"]):
            continue
        dest = os.path.join(OUT, f"{p['stem']}.xlsx")
        if os.path.exists(dest) and not args.force:
            print(f"  skip (exists)  {p['stem']}")
            continue

        rng = "1-150" if p["full"] else "91-150"
        cmd = [sys.executable, os.path.join(HERE, "extract_paper.py"),
               p["path"], "--key", p["key"], "--range", rng, "-o", dest]
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True)
        took = time.time() - t0

        if r.returncode != 0:
            failed.append((p["stem"], r.stderr.strip().splitlines()[-1:] or ["?"]))
            print(f"  FAIL           {p['stem']}")
            continue
        note = "FULL 1-150" if p["full"] else "elective 91-150"
        rows.append((p["stem"], rng, took))
        print(f"  ok {took:5.1f}s     {p['stem']:44} {note}")

    print(f"\n{len(rows)} extracted in {time.time() - start:.1f}s -> {OUT}")
    if failed:
        print(f"\n{len(failed)} FAILED:")
        for stem, err in failed:
            print(f"  {stem}: {err[0] if err else ''}")
        return 1
    print("\nNext: python scripts/make_labels.py   (build the classification worklist)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
