#!/usr/bin/env python3
"""
Downloads a picture for every subject and teaching level.

WHY PICTURES AND NOT PHOTOGRAPHS

The ask was real images off the web rather than drawn strokes. Photographs
were tried first and they do not survive the size: a tile draws these at about
64px, and at 64px a Commons photograph of a school microscope is a dark smudge,
an abacus is a row of stripes, and a running track is three orange bands. They
were compared side by side against these and it was not close.

So these are pictures built for exactly this size — Noto's emoji artwork, which
is a PNG per glyph, drawn to read at a favicon's scale and licensed Apache 2.0.
Bundling them rather than typing the character also fixes what emoji get wrong
in the first place: 🔬 is a different drawing on every phone, and a bundled PNG
is the same picture everywhere.

WHERE THE CHOICE COMES FROM

Not from this file. `subjects.icon` and `levels.icon` in the database already
name the right glyph for each row, so the mapping below is only a transcription
of them — adding a subject is still an insert, and its art follows.

  python3 scripts/emoji-art.py              # everything
  python3 scripts/emoji-art.py science math # just these

Needs Pillow (`pip3 install Pillow`).
"""

import os
import subprocess
import sys

from PIL import Image

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
NOTO = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u{}.png'
ROOT = os.path.join(os.path.dirname(__file__), '..', 'apps', 'mobile', 'assets')

# id -> the glyph that row carries in the database.
SUBJECTS = {
    'art': '🎨', 'biology': '🧬', 'cdp': '🧠', 'chemistry': '⚗️', 'commerce': '🧾',
    'computer': '💻', 'computer-science': '🖥️', 'economics': '📈', 'english': '🔤',
    'evs': '🌿', 'fine-arts': '🖼️', 'geography': '🗺️', 'gk': '🌍', 'gujarati': '📕',
    'haryana-gk': '🌾', 'hindi': '📖', 'history': '🏛️', 'home-science': '🏠',
    'kannada': '📒', 'malayalam': '📔', 'marathi': '📚', 'math': '➗',
    'maths-science': '🔬', 'music': '🎵', 'nepali': '📙', 'odia': '📗',
    'physical-education': '🏃', 'physics': '🧲', 'political-science': '⚖️',
    'psychology': '🧩', 'punjabi': '🪔', 'quantitative-aptitude': '🔢',
    'reasoning': '🧩', 'sanskrit': '🕉️', 'science': '🔬', 'sociology': '👥',
    'sst': '🗺️', 'tamil': '📓', 'telugu': '📘', 'urdu': '📜',
}

# `other-subject` is ⋯ and `other` is too — a typographic ellipsis, not an
# emoji, so Noto has no artwork for it. Those two keep the drawn icon.
LEVELS = {'prt': '🔤', 'tgt': '📘', 'pgt': '📙'}


def codepoints(glyph: str) -> list[str]:
    """Noto names a file by its codepoints, and usually drops the variation
    selector — ⚗️ is U+2697 U+FE0F and the file is emoji_u2697.png. Try it
    without first, then with, because a few sequences keep it."""
    full = [f'{ord(c):04x}' for c in glyph]
    bare = [c for c in full if c != 'fe0f']
    return ['_'.join(bare), '_'.join(full)]


def fetch(url: str) -> bytes:
    done = subprocess.run(['curl', '-sSL', '-m', '30', '-A', UA, url],
                          capture_output=True, timeout=60, check=True)
    if not done.stdout.startswith(b'\x89PNG'):
        raise RuntimeError('not a PNG')
    return done.stdout


def main() -> int:
    wanted = sys.argv[1:]
    failures = 0
    for folder, table in (('subject-art', SUBJECTS), ('level-art', LEVELS)):
        out = os.path.join(ROOT, folder)
        os.makedirs(out, exist_ok=True)
        for key, glyph in sorted(table.items()):
            if wanted and key not in wanted:
                continue
            for name in codepoints(glyph):
                try:
                    raw = fetch(NOTO.format(name))
                except Exception:
                    continue
                path = os.path.join(out, f'{key}.png')
                with open(path, 'wb') as handle:
                    handle.write(raw)
                # Trim Noto's own padding so the art fills the tile it is given.
                image = Image.open(path).convert('RGBA')
                box = image.getbbox()
                if box:
                    image = image.crop(box)
                w, h = image.size
                side = max(w, h)
                square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
                square.paste(image, ((side - w) // 2, (side - h) // 2))
                square.resize((128, 128), Image.LANCZOS).save(path)
                print(f'{key:<22} ok')
                break
            else:
                print(f'{key:<22} FAILED  {glyph}')
                failures += 1
    print(f'\nwritten to apps/mobile/assets/{{subject-art,level-art}}/')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
