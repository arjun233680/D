#!/usr/bin/env python3
"""
Fetches each exam board's own logo and prepares it for the exam chooser.

WHY A SCRIPT AND NOT A ONE-OFF

Seventeen of these were gathered by hand the first time, and half the work was
discovering which of a page's forty images is the logo, and that several boards
publish a horizontal lockup rather than a mark. That knowledge is worth keeping
where it can be re-run, for the same reason scripts/screens.mjs is checked in.

WHAT IT DOES

  fetch  -> the URL below for each exam, with a browser user-agent, because
            several of these hosts refuse an unknown client
  clean  -> drop the opaque white box that JPEGs and palette PNGs carry, so the
            logo sits on the card's own tile instead of in a white square
  trim   -> crop to the ink
  square -> a lockup wider than 3:2 is cropped back to its crest, since the
            board's name is already printed on the card; anything else is
            letterboxed. MPTET is the exception that proves it: its logo IS a
            wordmark, so cropping took the B off "ESB".
  write  -> 96x96 RGBA PNG into apps/mobile/assets/exam-logos/

THE THREE RUNGS

Not every conducting body has a logo, so each exam takes the highest rung it
can reach. SOURCES says which rung an exam is on.

  1. LOGO    the board's own device. Off the board's own site where it
             serves one; off Wikipedia for PSEB and BSEB, whose sites refuse
             this client and whose logos are non-free, so they are not on
             Commons either.
  2. EMBLEM  the state emblem, for bodies that have no device of their own and
             sign with the state's. HSSC, KARTET, KTET and UPTET are like this:
             Kerala's Pareeksha Bhavan turned out to use the same elephants as
             every other Kerala department, only in red.
  3. MAP     the state's outline, for Rajasthan and Telangana, whose emblems
             are on no public archive. Wikimedia publishes these as locator
             maps — the whole country in grey with one state picked out in
             colour — so `highlight()` keeps only the coloured pixels, which
             leaves that state on its own.

Ten boards refuse this client outright or were unreachable, and their exams sit
on rung 2 or 3 for that reason rather than by choice. UTET is the odd one: its
site loads, and simply never puts the board's own mark on the page — the only
logo in its header belongs to Digital India.

Some sites hide the logo behind JavaScript, which curl cannot see. Those are
found by rendering the page:

  chrome --headless --virtual-time-budget=9000 --dump-dom <url>

then reading the alt text rather than the filename. That is how NVS was found,
and it is worth doing carefully: NVS's page also carries the CBSE, NCERT, NIOS
and KVS logos in a related-links bar, and the KVS one was very nearly saved as
NVS's.

KVS publishes a true vector with no raster inside it, so it is rendered through
headless Chrome rather than an SVG library — the same Chrome scripts/screens.mjs
already depends on, so this adds no new tool.

  python3 scripts/exam-logos.py            # everything
  python3 scripts/exam-logos.py htet ctet  # just these

Needs Pillow (`pip3 install Pillow`).
"""

import base64
import colorsys
import io
import os
import re
import subprocess
import sys
import tempfile
from PIL import Image

UA = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/128.0 Safari/537.36'
)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT = os.path.join(os.path.dirname(__file__), '..', 'apps', 'mobile', 'assets', 'exam-logos')

# Exam id -> where its mark comes from. The comment on each line is the rung:
# LOGO (the board's own), EMBLEM (its state's), MAP (its state's outline).
SOURCES = {
    # ---------------------------------------------------------------- LOGO
    'ctet': 'https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2023/03/2023032156.png',
    # The site carries several SVGs; 2023110324-2 is a tricolour rule, not the
    # mark. This one is the sunburst over an open book.
    'kvs': 'https://cdnbbsr.s3waas.gov.in/s32d2ca7eedf739ef4c3800713ec482e1a/uploads/2023/04/2023042118.svg',
    # Only findable by rendering the page: the site is a JS app and the emblem
    # is the one image on it tagged as such. Every other logo on that page
    # belongs to somebody else.
    'nvs': 'https://navodaya.gov.in/nvs3/uploads/logo-1783847247391.png',
    'htet': 'https://bseh.org.in/logo.png',
    'hpsc-pgt': 'https://hpsc.gov.in/Portals/0/Images/hpsc-logo.png',
    'dsssb': 'https://dsssb.delhi.gov.in/sites/default/files/DSSSB/logo/dsssb.png',
    'mahatet': 'https://mahatet.in/Images/logo.png',
    'mptet': 'https://esb.mp.gov.in/new_look_images/PEB_LOGO_NEW1.jpg',
    'awes': 'https://awesindia.com/images/icon/awes_logo.png',
    'gtet': 'https://sebexam.org/Content/images/SEBLogo.png',
    'hptet': 'https://hpbose.org/images/HPBoSE_logo.png',
    'jtet': 'https://jac.jharkhand.gov.in/assets/images/jac-logo-1.png',
    'otet': 'https://cdn.bseodisha.ac.in/images12/logo.png',
    'tntet': 'https://trb.tn.gov.in/images/logo1.png',
    # NESTS publishes the EMRS seal itself. An earlier pass settled for the
    # little school glyph the ministry uses as a UI icon, which was a picture
    # of a school rather than the school system's own mark.
    'emrs': 'https://nests.tribal.gov.in/images/logo_emrs.jpg',
    # PSEB and BSEB do have devices of their own; neither board's site would
    # serve them to this client, and both sit on Wikipedia rather than Commons
    # because they are non-free logos. That is where these come from.
    'pstet': 'https://upload.wikimedia.org/wikipedia/en/2/21/Punjab_School_Education_Board_%28logo%29.jpg',
    'bihartet': 'https://upload.wikimedia.org/wikipedia/en/c/c3/BSEB_LOGO.svg',

    # -------------------------------------------------------------- EMBLEM
    'hssc-tgt-pgt': 'https://hssc.gov.in/images/logo.png',
    'uptet': 'https://updeled.gov.in/images/logo.png',
    'kartet': 'https://schooleducation.karnataka.gov.in/assets/front/images/kar_main_logo.png',
    'ktet': 'https://ktet.kerala.gov.in/images/keralagov_logo.png',
    'supertet': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Seal_of_Uttar_Pradesh.svg',
    'aptet': 'https://upload.wikimedia.org/wikipedia/commons/3/37/Emblem_of_Andhra_Pradesh.svg',
    'sktet': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Seal_of_Sikkim.svg',
    'wbtet': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Emblem_of_West_Bengal_%282026%29.png',
    'utet': 'https://upload.wikimedia.org/wikipedia/commons/9/99/Seal_of_Uttarakhand.svg',

    # ----------------------------------------------------------------- MAP
    'reet': 'https://upload.wikimedia.org/wikipedia/commons/c/cd/IN-RJ.svg',
    'tstet': 'https://upload.wikimedia.org/wikipedia/commons/a/ae/IN-TG.svg',
}

# Locator maps, which need the highlighted state lifted off the grey country.
MAPS = {'reet', 'tstet'}

# Marks that are a wordmark rather than a crest beside a name, so the
# crop-to-the-crest rule must not touch them. MPTET is why the rule has an
# exception at all: its logo IS the letters ESB, and cropping took the B off.
WORDMARKS = {'mptet'}


def fetch(url: str) -> bytes:
    """curl rather than urllib: the Python shipped with macOS has no CA bundle
    of its own, so every one of these https hosts fails certificate
    verification before a byte arrives."""
    done = subprocess.run(
        ['curl', '-sSL', '-m', '30', '-A', UA, url],
        capture_output=True, timeout=60, check=True,
    )
    if not done.stdout:
        raise RuntimeError('empty response')
    return done.stdout


def rasterise_svg(data: bytes, size: int = 512) -> Image.Image:
    """An SVG with a base64 PNG inside it is unwrapped; a real vector is drawn
    by Chrome, which is already a dependency of scripts/screens.mjs."""
    text = data.decode('utf8', 'ignore')
    embedded = re.search(r'base64,([A-Za-z0-9+/=]{500,})', text)
    if embedded:
        return Image.open(io.BytesIO(base64.b64decode(embedded.group(1))))

    with tempfile.TemporaryDirectory() as work:
        svg = os.path.join(work, 'logo.svg')
        page = os.path.join(work, 'logo.html')
        shot = os.path.join(work, 'shot.png')
        with open(svg, 'wb') as handle:
            handle.write(data)
        with open(page, 'w') as handle:
            handle.write(
                '<body style="margin:0;background:transparent">'
                '<img src="logo.svg" style="width:512px;height:512px;object-fit:contain">'
            )
        subprocess.run(
            [CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
             '--default-background-color=00000000', f'--screenshot={shot}',
             f'--window-size={size},{size}', f'file://{page}'],
            capture_output=True, timeout=90, check=False,
        )
        return Image.open(shot).copy()


def highlight(image: Image.Image) -> Image.Image:
    """Lift the one coloured state off a grey locator map.

    Wikimedia publishes state maps as the whole country in grey with the
    subject state picked out in colour. Rendered as-is into a 36pt tile that
    is a grey blob of India; what is wanted is the state on its own. Grey has
    no saturation and the highlight does, which is the whole test."""
    image = image.convert('RGBA')
    pixels = image.load()
    width, height = image.size
    lifted = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    out = lifted.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 40:
                continue
            _, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if saturation > 0.25 and 0.15 < lightness < 0.75:
                out[x, y] = (r, g, b, 255)

    box = lifted.getbbox()
    if box is None:
        raise RuntimeError('no highlighted region in this map')
    return lifted.crop(box)


def prepare(image: Image.Image, wordmark: bool) -> Image.Image:
    image = image.convert('RGBA')
    pixels = image.load()
    width, height = image.size

    corner = pixels[0, 0]
    if corner[3] == 255 and all(channel > 240 for channel in corner[:3]):
        for y in range(height):
            for x in range(width):
                r, g, b, _ = pixels[x, y]
                if r > 243 and g > 243 and b > 243:
                    pixels[x, y] = (r, g, b, 0)

    box = image.getbbox()
    if box:
        image = image.crop(box)
    width, height = image.size

    if not wordmark and width / height > 1.5:
        image = image.crop((0, 0, height, height))
        box = image.getbbox()
        if box:
            image = image.crop(box)
        width, height = image.size

    side = max(width, height)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(image, ((side - width) // 2, (side - height) // 2))
    return square.resize((96, 96), Image.LANCZOS)


def main() -> int:
    wanted = sys.argv[1:] or sorted(SOURCES)
    os.makedirs(OUT, exist_ok=True)
    failures = 0

    for exam_id in wanted:
        url = SOURCES.get(exam_id)
        if not url:
            print(f'{exam_id:<14} no source on record')
            failures += 1
            continue
        try:
            raw = fetch(url)
            is_map = exam_id in MAPS
            # A map is rendered four times over, because the state is a small
            # part of the country and what survives the crop is all there is.
            if url.endswith('.svg'):
                image = rasterise_svg(raw, 1600 if is_map else 512)
            else:
                image = Image.open(io.BytesIO(raw))
            if is_map:
                image = highlight(image)
            prepare(image, exam_id in WORDMARKS).save(os.path.join(OUT, f'{exam_id}.png'))
            print(f'{exam_id:<14} ok{"  (map)" if is_map else ""}')
        except Exception as error:  # noqa: BLE001 - report and carry on
            print(f'{exam_id:<14} FAILED  {error}')
            failures += 1

    print(f'\n{len(wanted) - failures}/{len(wanted)} written to apps/mobile/assets/exam-logos/')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
