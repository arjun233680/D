#!/usr/bin/env python3
"""
Downloads a picture for every subject and teaching level.

WHY PICTURES AND NOT PHOTOGRAPHS

The ask was real images off the web rather than drawn strokes. Photographs
were tried first and they do not survive the size: a tile draws these at about
64px, and at 64px a Commons photograph of a school microscope is a dark smudge,
an abacus is a row of stripes, and a running track is three orange bands. They
were compared side by side against these and it was not close.

WHY FLUENT AND NOT NOTO

The first set of these was Noto's emoji artwork, and on the subject chooser it
read as exactly what it is: the same flat stickers the phone's own keyboard
draws, only pasted onto cards. Microsoft's Fluent Emoji ships a *3D* render of
each glyph — modelled, lit and shadowed, 256px, MIT licensed — and that is what
this fetches now. Same subjects, same glyphs; a picture with depth instead of a
sticker.

The 3D set has no people in it, which matters for exactly one row: Physical
Education is 🏃, and Fluent draws its runner only under the skin-tone folders.
That one takes `Default`, which is the yellow non-human tone the rest of the
set is drawn in, so it sits with its neighbours rather than picking a skin.

WHERE THE CHOICE COMES FROM

Not from this file. `subjects.icon` and `levels.icon` in the database already
name the right glyph for each row, so the glyph column below is only a
transcription of them — adding a subject is still an insert, and its art
follows. What this file does add is the path, because Fluent names its folders
after the emoji's English name rather than its codepoint, and a handful are not
guessable: 🌍 keeps its hyphen in `globe_showing_europe-africa`, and ➗ is
filed under "Divide" rather than "Heavy division sign".

A subject with no row here prints FAILED and keeps the drawn stroke that
`components/art.tsx` falls back to, which is the same bargain the exam logos
make.

  python3 scripts/emoji-art.py              # everything
  python3 scripts/emoji-art.py science math # just these

Needs Pillow (`pip3 install Pillow`).
"""

import os
import subprocess
import sys
import urllib.parse

from PIL import Image

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
FLUENT = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/{}'
ROOT = os.path.join(os.path.dirname(__file__), '..', 'apps', 'mobile', 'assets')

# The tile is drawn at 46pt on the subject step and 54pt on the level step. The
# larger of those is 162px on a 3x screen, so 128 — what the flat set was
# written at — was being upscaled on every phone sold in the last five years.
# 192 clears it, and costs about 30KB a picture.
SIZE = 192

# id -> (the glyph that row carries in the database, Fluent's path for it).
SUBJECTS = {
    'art': ('🎨', 'Artist palette/3D/artist_palette_3d.png'),
    'biology': ('🧬', 'Dna/3D/dna_3d.png'),
    'cdp': ('🧠', 'Brain/3D/brain_3d.png'),
    'chemistry': ('⚗️', 'Alembic/3D/alembic_3d.png'),
    'commerce': ('🧾', 'Receipt/3D/receipt_3d.png'),
    'computer': ('💻', 'Laptop/3D/laptop_3d.png'),
    'computer-science': ('🖥️', 'Desktop computer/3D/desktop_computer_3d.png'),
    'economics': ('📈', 'Chart increasing/3D/chart_increasing_3d.png'),
    'english': ('🔤', 'Input latin letters/3D/input_latin_letters_3d.png'),
    'evs': ('🌿', 'Herb/3D/herb_3d.png'),
    'fine-arts': ('🖼️', 'Framed picture/3D/framed_picture_3d.png'),
    'geography': ('🗺️', 'World map/3D/world_map_3d.png'),
    'gk': ('🌍', 'Globe showing europe-africa/3D/globe_showing_europe-africa_3d.png'),
    'gujarati': ('📕', 'Closed book/3D/closed_book_3d.png'),
    'haryana-gk': ('🌾', 'Sheaf of rice/3D/sheaf_of_rice_3d.png'),
    'hindi': ('📖', 'Open book/3D/open_book_3d.png'),
    'history': ('🏛️', 'Classical building/3D/classical_building_3d.png'),
    'home-science': ('🏠', 'House/3D/house_3d.png'),
    'kannada': ('📒', 'Ledger/3D/ledger_3d.png'),
    'malayalam': ('📔', 'Notebook with decorative cover/3D/notebook_with_decorative_cover_3d.png'),
    'marathi': ('📚', 'Books/3D/books_3d.png'),
    'math': ('➗', 'Divide/3D/divide_3d.png'),
    'maths-science': ('🔬', 'Microscope/3D/microscope_3d.png'),
    'music': ('🎵', 'Musical note/3D/musical_note_3d.png'),
    'nepali': ('📙', 'Orange book/3D/orange_book_3d.png'),
    'odia': ('📗', 'Green book/3D/green_book_3d.png'),
    'physical-education': (
        '🏃',
        'Person running facing right/Default/3D/person_running_facing_right_3d_default.png',
    ),
    'physics': ('🧲', 'Magnet/3D/magnet_3d.png'),
    'political-science': ('⚖️', 'Balance scale/3D/balance_scale_3d.png'),
    'psychology': ('🧩', 'Puzzle piece/3D/puzzle_piece_3d.png'),
    'punjabi': ('🪔', 'Diya lamp/3D/diya_lamp_3d.png'),
    'quantitative-aptitude': ('🔢', 'Input numbers/3D/input_numbers_3d.png'),
    'reasoning': ('🧩', 'Puzzle piece/3D/puzzle_piece_3d.png'),
    'sanskrit': ('🕉️', 'Om/3D/om_3d.png'),
    'science': ('🔬', 'Microscope/3D/microscope_3d.png'),
    'sociology': ('👥', 'Busts in silhouette/3D/busts_in_silhouette_3d.png'),
    'sst': ('🗺️', 'World map/3D/world_map_3d.png'),
    'tamil': ('📓', 'Notebook/3D/notebook_3d.png'),
    'telugu': ('📘', 'Blue book/3D/blue_book_3d.png'),
    'urdu': ('📜', 'Scroll/3D/scroll_3d.png'),
}

# `other-subject` is ⋯ and `other` is too — a typographic ellipsis, not an
# emoji, so there is no artwork for it. Those two keep the drawn icon.
LEVELS = {
    'prt': ('🔤', 'Input latin letters/3D/input_latin_letters_3d.png'),
    'tgt': ('📘', 'Blue book/3D/blue_book_3d.png'),
    'pgt': ('📙', 'Orange book/3D/orange_book_3d.png'),
}


def fetch(path: str) -> bytes:
    """Fluent's folders carry spaces and one carries a hyphen the filename
    keeps, so the path is quoted rather than slugged."""
    url = FLUENT.format(urllib.parse.quote(f'assets/{path}'))
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
        for key, (glyph, path) in sorted(table.items()):
            if wanted and key not in wanted:
                continue
            try:
                raw = fetch(path)
            except Exception as err:
                print(f'{key:<22} FAILED  {glyph}  {err}')
                failures += 1
                continue
            file = os.path.join(out, f'{key}.png')
            with open(file, 'wb') as handle:
                handle.write(raw)
            # Trim the render's own margin so the art fills the tile it is
            # given, then square it so a wide picture is not stretched tall.
            image = Image.open(file).convert('RGBA')
            box = image.getbbox()
            if box:
                image = image.crop(box)
            w, h = image.size
            side = max(w, h)
            square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            square.paste(image, ((side - w) // 2, (side - h) // 2))
            square.resize((SIZE, SIZE), Image.LANCZOS).save(file)
            print(f'{key:<22} ok      {glyph}')
    print(f'\nwritten to apps/mobile/assets/{{subject-art,level-art}}/')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
