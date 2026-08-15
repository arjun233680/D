import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  EXAMS,
  HTET_VALUE_ALIASES,
  SUBJECTS,
  importQuestions,
  readWorkbook,
  refsFrom,
  resolveColumns,
  sheetToRows,
} from '@adhyapak/core';
import { columnMapFrom, parseFile, type ColumnMapping } from '../lib/importPipeline';

/**
 * Clearing a column in the import wizard.
 *
 * "— not mapped —" did nothing. It set the field to `undefined`, and the pass
 * that restores defaults for untouched fields could not tell that apart from
 * "never touched", so it put the aliases straight back and the column re-mapped
 * itself. The operator had no way to override a bad automatic mapping.
 *
 * That was not theoretical: the HTET sheet's prose "Sub-Topic" column mapped to
 * `subtopic`, all 630 CDP rows were rejected with "Map that column to Tags, or
 * leave it unmapped", and neither of those instructions could be carried out —
 * subtopic's own default alias matched the same header either way.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('clearing a column', () => {
  it('keeps a field unmapped even when its default alias matches the header', () => {
    const map = columnMapFrom({ subtopic: null });
    assert.deepEqual(map.subtopic, [], 'cleared fields match no header');

    // The proof that matters: resolving real headers finds nothing for it.
    const resolved = resolveColumns(['Sub-Topic', 'Q (English)'], map);
    assert.equal(resolved.subtopic, undefined, '"Sub-Topic" must not come back');
  });

  it('leaves a field the operator never touched on its defaults', () => {
    const map = columnMapFrom({ question: 'Q (English)' });
    assert.deepEqual(
      map.subtopic,
      ['subtopic', 'subtopicid', 'concept'],
      'untouched fields keep working as before',
    );
    assert.deepEqual(map.question, ['Q (English)'], 'a manual choice wins');
    assert.equal(resolveColumns(['Sub-Topic'], map).subtopic, 'Sub-Topic');
  });

  it('treats undefined as untouched and null as cleared', () => {
    // The two used to be one value. They must never collapse again.
    assert.deepEqual(columnMapFrom({ subtopic: undefined }).subtopic, [
      'subtopic',
      'subtopicid',
      'concept',
    ]);
    assert.deepEqual(columnMapFrom({ subtopic: null }).subtopic, []);
  });

  it('clears one field without disturbing its neighbours', () => {
    const mapping: ColumnMapping = { subtopic: null, topic: 'Topic', question: undefined };
    const map = columnMapFrom(mapping);
    assert.deepEqual(map.subtopic, []);
    assert.deepEqual(map.topic, ['Topic']);
    assert.ok((map.question ?? []).length > 1, 'question keeps its alias list');
  });

  it('survives being cleared and then chosen again', () => {
    assert.deepEqual(columnMapFrom({ subtopic: null }).subtopic, []);
    assert.deepEqual(columnMapFrom({ subtopic: 'Tags' }).subtopic, ['Tags']);
  });
});

describe('the real Sub-Topic case', () => {
  const refs = refsFrom({
    exams: EXAMS.map((e) => e.id),
    subjects: SUBJECTS.map((s) => s.id),
    topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
    levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
  });

  const cdpRows = async () => {
    const bytes = new Uint8Array(readFileSync(join(ROOT, 'content/CDP.xlsx')));
    const workbook = await readWorkbook(bytes);
    return sheetToRows(workbook.read('Sheet1')).rows;
  };

  const runWith = async (mapping: ColumnMapping) =>
    importQuestions(await cdpRows(), {
      refs,
      valueAliases: HTET_VALUE_ALIASES,
      defaultExamIds: ['htet'],
      status: 'draft',
      columns: columnMapFrom(mapping),
      now: () => '2026-01-01T00:00:00.000Z',
    });

  it('rejects every row while Sub-Topic is mapped', async () => {
    const report = await runWith({ subtopic: 'Sub-Topic' });
    assert.equal(report.accepted.length, 0);
    assert.equal(report.rejected.length, 630, 'the failure this bug left no way out of');
  });

  it('validates all 630 rows once Sub-Topic is cleared', async () => {
    const report = await runWith({ subtopic: null });
    assert.equal(report.rejected.length, 0, JSON.stringify(report.rejected.slice(0, 2), null, 2));
    assert.equal(report.accepted.length, 630);
  });

  it('also works when the operator maps it to Tags instead', async () => {
    // The other half of the instruction the wizard gave and could not honour.
    const report = await runWith({ subtopic: null, tags: 'Sub-Topic' });
    assert.equal(report.rejected.length, 0);
    assert.equal(report.accepted.length, 630);
    assert.ok(
      report.accepted[0]!.tags?.length,
      'the prose is kept as a tag rather than discarded',
    );
  });
});

describe('a column that could never resolve is not auto-mapped', () => {
  const asFile = (name: string, bytes: Uint8Array) =>
    ({
      name,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      text: async () => new TextDecoder().decode(bytes),
    }) as unknown as File;

  it('clears Sub-Topic on upload and says so, instead of failing 630 rows at Review', async () => {
    const bytes = new Uint8Array(readFileSync(join(ROOT, 'content/CDP.xlsx')));
    const parsed = await parseFile(asFile('CDP.xlsx', bytes));

    assert.equal(parsed.autoMapping.subtopic, null, 'cleared before the operator sees it');
    const notice = parsed.unmappable.find((u) => u.field === 'subtopic');
    assert.ok(notice, 'and reported, so the column does not look overlooked');
    assert.equal(notice!.header, 'Sub-Topic');
    assert.equal(notice!.label, 'Subtopic');
  });

  it('leaves fields with real ids behind them alone', async () => {
    const bytes = new Uint8Array(readFileSync(join(ROOT, 'content/CDP.xlsx')));
    const parsed = await parseFile(asFile('CDP.xlsx', bytes));
    // Topics do have ids, so that column keeps its automatic mapping.
    assert.equal(parsed.autoMapping.topic, 'Topic');
    assert.ok(!parsed.unmappable.some((u) => u.field === 'topic'));
  });
});
