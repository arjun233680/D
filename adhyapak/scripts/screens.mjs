/**
 * Looks at the phone app the way a person on a phone would.
 *
 * WHY THIS EXISTS
 *
 * The mobile app was built for a long time without anyone — human or
 * otherwise — ever looking at a rendered screen. The first screenshot that was
 * finally taken found three bugs on the login screen alone: the logo was an
 * empty tile, the icon on its card was missing, and the arrow had gone from
 * every gradient button in the app. None of those are visible in the source;
 * all three are obvious in a picture.
 *
 * So this is not a test. It is a pair of eyes, and it is checked in so that it
 * is there next time instead of being rebuilt from memory.
 *
 * WHAT IT REPORTS
 *
 * For each route, at each width: a PNG, plus two measurements that a screenshot
 * cannot show you because the screenshot has already been cropped to the
 * viewport —
 *
 *   - whether the document is wider than the screen, which is how a layout
 *     drawn for one width fails at another;
 *   - any tap target under 40pt, which is the other way a design drawn on a
 *     desktop fails on a handset.
 *
 * WHY IT DRIVES CHROME OVER THE DEVTOOLS PROTOCOL
 *
 * `chrome --headless --window-size=390,844 --screenshot` looks like it does
 * this and does not: headless Chrome on macOS will not make a window narrower
 * than about 500pt, so every "390px" screenshot is really a 500px page with its
 * right edge cropped. That artefact looks exactly like a broken layout, and it
 * cost an afternoon of fixing a bug that was never there.
 * `Emulation.setDeviceMetricsOverride` sets the viewport the page actually
 * sees, which is the only way to get an honest picture.
 *
 * USAGE
 *
 *   npm run screens                      # every route, 390pt
 *   npm run screens -- --width 360       # a narrower handset
 *   npm run screens -- /onboarding/exams # one route
 *   npm run screens -- --base https://arjun233680.github.io/D
 *
 * Needs the dev server up (`npm run dev:mobile`) unless --base points
 * elsewhere. Writes PNGs to adhyapak/.screens/, which is git-ignored.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

/* --------------------------------------------------------------- arguments */

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const WIDTH = Number(flag('width', 390));
const HEIGHT = Number(flag('height', 844));
const BASE = flag('base', 'http://localhost:8081').replace(/\/$/, '');
const OUT = resolve(flag('out', '.screens'));
const SETTLE = Number(flag('settle', 7000));
const PORT = Number(flag('port', 9222));

/**
 * Every screen worth looking at, in the order a learner meets them.
 *
 * Most of these sit behind the auth gate, so without a session they render the
 * login screen instead — which the run reports rather than hides, because a
 * folder of twenty identical login screenshots is worse than being told once.
 */
const ALL_ROUTES = [
  '/',
  '/onboarding/exams',
  '/onboarding/level',
  '/onboarding/subject',
  '/prep',
  '/prep/pyq',
  '/prep/tests',
  '/explore',
  '/notes',
  '/videos',
  '/tests',
  '/batches',
  '/practice',
  '/practice/pyq',
  '/doubts',
  '/current-affairs',
  '/studio',
];

const routes = argv.filter((a) => a.startsWith('/'));
const ROUTES = routes.length > 0 ? routes : ALL_ROUTES;

/* ------------------------------------------------------------------ chrome */

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(OUT, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${OUT}/.chrome`,
    'about:blank',
  ],
  { stdio: 'ignore', detached: false },
);

const waitFor = async (probe, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    try {
      return await probe();
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('gave up waiting');
};

const targets = await waitFor(async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const list = await res.json();
  const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('no page yet');
  return page;
});

const ws = new WebSocket(targets.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
});
await new Promise((r) => ws.addEventListener('open', r));

await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 2,
  mobile: true,
});
await send('Page.enable');

/* ------------------------------------------------------------------ probe */

const PROBE = `(() => {
  const overflow = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    /*
     * Two things legitimately reach past the edge and neither is a bug: a
     * horizontal rail, which is meant to be scrolled, and decoration inside a
     * clipping box — the login backdrop's circles are drawn at x=490 and then
     * cut off by an overflow-hidden parent, exactly as intended. Reporting
     * either buries the real overflow in noise.
     */
    let excused = false;
    for (let n = el.parentElement; n; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 1) { excused = true; break; }
      const o = getComputedStyle(n);
      if (o.overflowX === 'hidden' || o.overflowX === 'clip' || o.overflow === 'hidden') {
        excused = true; break;
      }
    }
    if (excused) continue;
    if (r.right > innerWidth + 1 || r.left < -1) {
      const key = Math.round(r.left) + ':' + Math.round(r.right);
      if (seen.has(key)) continue;
      seen.add(key);
      overflow.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 28),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  }

  const small = [];
  const tappable = '[role="button"],[role="link"],[role="checkbox"],[role="radio"],button,a,input';
  for (const el of document.querySelectorAll(tappable)) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.height < 40) small.push({ text: (el.textContent || '').trim().slice(0, 22), h: Math.round(r.height) });
  }

  const body = (document.body.textContent || '');
  return JSON.stringify({
    scrollW: document.documentElement.scrollWidth,
    innerW: innerWidth,
    overflow: overflow.slice(0, 6),
    small: small.slice(0, 6),
    smallCount: small.length,
    // Named so a run against a signed-out app says so once per route rather
    // than leaving twenty identical pictures to be discovered by eye.
    looksLikeLogin: body.includes('Send OTP') || body.includes('OTP भेजें'),
  });
})()`;

/* ------------------------------------------------------------------- sweep */

let problems = 0;
console.log(`\n${WIDTH}×${HEIGHT} · ${BASE}\n`);

for (const route of ROUTES) {
  await send('Page.navigate', { url: `${BASE}${route}` });
  await new Promise((r) => setTimeout(r, SETTLE));

  const raw = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const info = JSON.parse(raw?.result?.value ?? '{}');

  const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) writeFileSync(`${OUT}/${slug}-${WIDTH}.png`, Buffer.from(shot.data, 'base64'));

  const wide = info.scrollW > info.innerW;
  const bad = wide || info.smallCount > 0;
  if (bad) problems++;

  const notes = [];
  if (wide) notes.push(`document ${info.scrollW}pt wide in a ${info.innerW}pt screen`);
  if (info.smallCount) notes.push(`${info.smallCount} tap target(s) under 40pt`);
  if (info.looksLikeLogin && route !== '/') notes.push('rendered the login screen — no session');

  console.log(
    `${bad ? '✗' : '✓'} ${route.padEnd(22)} ${slug}-${WIDTH}.png` +
      (notes.length ? `\n    ${notes.join('\n    ')}` : ''),
  );
  if (info.overflow?.length) console.log(`    ${JSON.stringify(info.overflow)}`);
  if (info.small?.length) console.log(`    small: ${JSON.stringify(info.small)}`);
}

console.log(
  `\n${ROUTES.length} route(s), ${problems} with something to look at. PNGs in ${OUT}\n`,
);

ws.close();
chrome.kill();
process.exit(0);
