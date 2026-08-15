/**
 * Regenerates the TypeScript copy of content/topic-map.json.
 *
 * The JSON is the source of truth: it is the file a reviewer opens, and it
 * carries the reasoning for each judgement call. The browser needs the same
 * table, and importing JSON across a workspace boundary behaves differently in
 * webpack, Metro and tsx — so the table is emitted as an ordinary TypeScript
 * module and `content-map.test.ts` fails if the two ever drift.
 *
 *   npm run content:map
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'content/topic-map.json');
const target = join(root, 'packages/core/src/content/htet-topic-map.ts');

interface TopicMap {
  level: Record<string, string>;
  subject: Record<string, string>;
  topic: Record<string, string>;
}

const raw = JSON.parse(readFileSync(source, 'utf8')) as Record<string, unknown>;

/** `$comment` keys document the file for reviewers; they are not data. */
const clean = (table: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(table).filter(([k]) => !k.startsWith('$')));

const map: TopicMap = {
  level: clean(raw.level as Record<string, string>),
  subject: clean(raw.subject as Record<string, string>),
  topic: clean(raw.topic as Record<string, string>),
};

const entries = (table: Record<string, string>) =>
  Object.entries(table)
    .map(([label, id]) => `    ${JSON.stringify(label)}: ${JSON.stringify(id)},`)
    .join('\n');

const out = `import type { ImportOptions } from './import';

/**
 * The labels the HTET source spreadsheets use, mapped to ids in this taxonomy.
 *
 * GENERATED FROM content/topic-map.json — do not edit by hand. Change the JSON,
 * which carries the reasoning behind each call, then run \`npm run content:map\`.
 * A test fails if this file and the JSON disagree.
 *
 * A label that is not here is not guessed at: it passes through unchanged and
 * the row is rejected naming the value, so a new topic in a future paper is a
 * visible failure rather than a question filed under the wrong heading.
 */
export const HTET_VALUE_ALIASES: NonNullable<ImportOptions['valueAliases']> = {
  level: {
${entries(map.level)}
  },
  subject: {
${entries(map.subject)}
  },
  topic: {
${entries(map.topic)}
  },
};

/** Every topic id the map can produce, for asserting they all exist. */
export const HTET_MAPPED_TOPIC_IDS: string[] = ${JSON.stringify([...new Set(Object.values(map.topic))].sort(), null, 2)
  .split('\n')
  .join('\n')};
`;

writeFileSync(target, out);
console.log(
  `wrote ${target}\n  ${Object.keys(map.level).length} levels, ` +
    `${Object.keys(map.subject).length} subjects, ${Object.keys(map.topic).length} topics`,
);
