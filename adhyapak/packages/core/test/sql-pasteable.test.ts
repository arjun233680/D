import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/**
 * Every .sql file under supabase/ is documented as paste-able into the Supabase
 * SQL editor, and the migrations are applied by hand that way.
 *
 * A backslash command is psql-only. `\pset footer off` sat at the top of
 * verify.sql — the file whose own header says "Paste into the Supabase SQL
 * editor" — and the paste failed with `syntax error at or near "\"`. That
 * happened to the operator, so this is a test rather than a note.
 */

const SUPABASE = join(dirname(fileURLToPath(import.meta.url)), '../../../supabase');

function* sqlFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sqlFiles(path);
    else if (name.endsWith('.sql')) yield path;
  }
}

/**
 * A psql meta-command is a backslash at the very start of a line. A backslash
 * inside a string, a comment, or a `$$` body is ordinary SQL and must not trip
 * this — `\d` appears in regexes throughout the migrations.
 */
const metaCommands = (sql: string): { line: number; text: string }[] =>
  sql
    .split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => /^\\/.test(text));

describe('every SQL file can be pasted into the Supabase editor', () => {
  const files = [...sqlFiles(SUPABASE)];

  it('finds the SQL files at all', () => {
    assert.ok(files.length >= 10, `expected the migrations and seeds, found ${files.length}`);
  });

  for (const file of files) {
    const name = relative(SUPABASE, file);
    it(`${name} has no psql meta-command`, () => {
      const found = metaCommands(readFileSync(file, 'utf8'));
      assert.deepEqual(
        found,
        [],
        found.map((f) => `${name}:${f.line} starts with a backslash: ${f.text}`).join('\n'),
      );
    });
  }
});
