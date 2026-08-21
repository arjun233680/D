import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Nothing in the app renders below 12pt.
 *
 * Aspirants read this on cheap five-inch phones, often outdoors, and the
 * smallest type has to survive that. The rule is written in CLAUDE.md, and a
 * rule that is only written down is a rule that gets broken: 11.5 crept into
 * the level step's authority line, the subject step's chip and the exam
 * chooser's hint, at different times, and each one had to be found by reading
 * every `fontSize` on the screen.
 *
 * So the repository checks itself. Half points are allowed above 12 — 12.5 is
 * a real size — but nothing may go under.
 */

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '../../../apps/mobile');
const SKIP = new Set(['node_modules', 'dist', '.expo', 'assets', 'ios', 'android']);

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) yield path;
  }
}

/** Every literal `fontSize: n` in a file, with the line it sits on. */
const fontSizes = (source: string): { line: number; size: number }[] =>
  source
    .split('\n')
    .flatMap((text, i) => {
      const match = /fontSize:\s*([0-9]+(?:\.[0-9]+)?)/.exec(text);
      return match ? [{ line: i + 1, size: Number(match[1]) }] : [];
    });

describe('the app has a floor under its type', () => {
  const files = [...sourceFiles(MOBILE)];

  it('finds the screens at all', () => {
    assert.ok(files.length >= 20, `expected the app's sources, found ${files.length}`);
  });

  for (const file of files) {
    const undersized = fontSizes(readFileSync(file, 'utf8')).filter(({ size }) => size < 12);
    if (undersized.length === 0) continue;
    it(`${relative(MOBILE, file)} sets nothing below 12pt`, () => {
      assert.deepEqual(
        undersized,
        [],
        `${relative(MOBILE, file)} has type under 12pt: ` +
          undersized.map(({ line, size }) => `line ${line} is ${size}`).join(', '),
      );
    });
  }
});
