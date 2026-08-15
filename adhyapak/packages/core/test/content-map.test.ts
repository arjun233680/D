import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { HTET_VALUE_ALIASES, SUBJECT_BY_ID, TOPIC_BY_ID } from '../src/index.ts';

/**
 * The topic map, and the two things that make it trustworthy.
 *
 * It has to agree with the JSON a reviewer actually reads, and every id it
 * produces has to exist — a map that points at `cdp-piagett` would file real
 * questions under a topic no screen can find, and nothing else would notice.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const json = JSON.parse(readFileSync(join(ROOT, 'content/topic-map.json'), 'utf8')) as Record<
  string,
  Record<string, string>
>;

const withoutComments = (table: Record<string, string>) =>
  Object.fromEntries(Object.entries(table).filter(([k]) => !k.startsWith('$')));

describe('the generated map matches content/topic-map.json', () => {
  for (const field of ['level', 'subject', 'topic'] as const) {
    it(`${field} is identical in both`, () => {
      assert.deepEqual(
        HTET_VALUE_ALIASES[field],
        withoutComments(json[field]!),
        `packages/core/src/content/htet-topic-map.ts is stale — run \`npm run content:map\``,
      );
    });
  }
});

describe('every mapped id exists in the taxonomy', () => {
  it('maps topics onto real topic ids', () => {
    for (const [label, id] of Object.entries(HTET_VALUE_ALIASES.topic ?? {})) {
      assert.ok(TOPIC_BY_ID.has(id), `"${label}" maps to unknown topic id "${id}"`);
    }
  });

  it('maps subjects onto real subject ids', () => {
    for (const [label, id] of Object.entries(HTET_VALUE_ALIASES.subject ?? {})) {
      assert.ok(SUBJECT_BY_ID.has(id), `"${label}" maps to unknown subject id "${id}"`);
    }
  });

  it('files every topic under the subject that owns it', () => {
    // A CDP label pointing at a Haryana GK topic would import cleanly and be
    // wrong in a way only a human reading the practice screen would catch.
    for (const [label, id] of Object.entries(HTET_VALUE_ALIASES.topic ?? {})) {
      const topic = TOPIC_BY_ID.get(id)!;
      assert.ok(
        SUBJECT_BY_ID.has(topic.subjectId),
        `"${label}" -> ${id} belongs to unknown subject ${topic.subjectId}`,
      );
    }
  });

  it('uses only levels the app defines', () => {
    const levels = ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'];
    for (const [label, id] of Object.entries(HTET_VALUE_ALIASES.level ?? {})) {
      assert.ok(levels.includes(id), `"${label}" maps to unknown level "${id}"`);
    }
  });
});

describe('the map covers the source files', () => {
  it('names all three HTET posts', () => {
    assert.deepEqual(Object.keys(HTET_VALUE_ALIASES.level ?? {}).sort(), ['PGT', 'PRT', 'TGT']);
  });

  it('covers both subject spellings CDP.xlsx uses', () => {
    const subjects = HTET_VALUE_ALIASES.subject ?? {};
    assert.equal(subjects['CDP'], 'cdp');
    assert.equal(subjects['Child Development & Pedagogy'], 'cdp');
    assert.equal(subjects['G.K. & Awareness'], 'haryana-gk');
  });

  it('maps 27 CDP labels and 8 GK labels', () => {
    const topics = HTET_VALUE_ALIASES.topic ?? {};
    const cdp = Object.values(topics).filter((id) => id.startsWith('cdp-')).length;
    const gk = Object.values(topics).filter((id) => id.startsWith('hgk-')).length;
    // 27 distinct CDP labels in the file collapse to 26 entries here, because
    // "Socialization Processes" and "Socialization processes" differ only in
    // case and the lookup is case-insensitive.
    assert.equal(cdp, 26, 'CDP labels');
    assert.equal(gk, 8, 'GK labels');
  });
});
