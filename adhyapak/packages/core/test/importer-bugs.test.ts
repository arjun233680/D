import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_COLUMNS,
  EXAMS,
  SUBJECTS,
  importQuestions,
  integerFrom,
  parseAnswer,
  refsFrom,
  resolveColumns,
} from '../src/index.ts';

/**
 * Three importer bugs, each verified against the shape of the real HTET sheet
 * that is about to be imported rather than against a convenient fixture.
 *
 * Together they rejected 100% of that file: the answer column parsed to
 * nothing, the question and option columns mapped to nothing, and the numeric
 * columns arrived from Google Sheets as floats.
 */

const REFS = refsFrom({
  exams: EXAMS.map((e) => e.id),
  subjects: SUBJECTS.map((s) => s.id),
  topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
  levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
});

const now = () => '2026-01-01T00:00:00.000Z';

/** One row with exactly the headers and value shapes the real export produces. */
const realRow = (over: Record<string, string> = {}): Record<string, string> => ({
  'Q (English)': 'According to Piaget, which stage comes first?',
  'Q (Hindi)': 'पियाजे के अनुसार पहली अवस्था कौन-सी है?',
  'Opt-A': 'Sensorimotor',
  'Opt-B': 'Pre-operational',
  'Opt-C': 'Concrete operational',
  'Opt-D': 'Formal operational',
  // The row is bilingual, so its options have to be too: options in a language
  // the question is not asked in are rejected now, which is what a
  // half-translated sheet produces.
  'Opt-A (Hindi)': 'संवेदी-पेशीय',
  'Opt-B (Hindi)': 'पूर्व-संक्रियात्मक',
  'Opt-C (Hindi)': 'मूर्त संक्रियात्मक',
  'Opt-D (Hindi)': 'औपचारिक संक्रियात्मक',
  'Correct Answer': 'Opt-A',
  Explanation: 'The sensorimotor stage is first.',
  'Explanation (Hindi)': 'संवेदी-पेशीय अवस्था पहली है।',
  Subject: 'cdp',
  Topic: 'cdp-piaget',
  Exam: 'htet',
  HTET: 'upper-primary',
  Year: '2020.0',
  'Q.No': '22.0',
  ...over,
});

describe('(a) answers written as Opt-A..Opt-D', () => {
  it('reads the Opt- prefix the real sheet uses', () => {
    assert.deepEqual(parseAnswer('Opt-A', 4), [0]);
    assert.deepEqual(parseAnswer('Opt-B', 4), [1]);
    assert.deepEqual(parseAnswer('Opt-C', 4), [2]);
    assert.deepEqual(parseAnswer('Opt-D', 4), [3]);
  });

  it('reads the separators a human actually types', () => {
    assert.deepEqual(parseAnswer('opt-b', 4), [1], 'lower case');
    assert.deepEqual(parseAnswer('OPT_D', 4), [3], 'underscore — not a word boundary');
    assert.deepEqual(parseAnswer('Opt A', 4), [0], 'space');
    assert.deepEqual(parseAnswer('opt. c', 4), [2], 'full stop');
    assert.deepEqual(parseAnswer('opt3', 4), [2], 'a number rather than a letter');
  });

  it('still reads every spelling that already worked', () => {
    assert.deepEqual(parseAnswer('B', 4), [1]);
    assert.deepEqual(parseAnswer('b', 4), [1]);
    assert.deepEqual(parseAnswer('2', 4), [1]);
    assert.deepEqual(parseAnswer('Option B', 4), [1]);
    assert.deepEqual(parseAnswer('A and C', 4), [0, 2]);
    assert.deepEqual(parseAnswer('option a, option c', 4), [0, 2]);
  });

  it('still refuses what is not an answer', () => {
    assert.deepEqual(parseAnswer('', 4), []);
    assert.deepEqual(parseAnswer('Z', 4), [], 'a letter with no such option');
    assert.deepEqual(parseAnswer('Opt-Z', 4), []);
    assert.deepEqual(parseAnswer('E', 4), [], 'beyond this question’s option count');
    assert.deepEqual(parseAnswer('1.5', 4), [], 'a fraction is not an option index');
  });
});

describe('(b) headers with brackets, and the sheet’s own spellings', () => {
  const HEADERS = [
    'Q (English)', 'Q (Hindi)',
    'Opt-A', 'Opt-B', 'Opt-C', 'Opt-D',
    'Opt-A (Hindi)', 'Opt-B (Hindi)', 'Opt-C (Hindi)', 'Opt-D (Hindi)',
    'Correct Answer', 'Subject', 'Topic', 'Subtopic', 'HTET', 'Year', 'Q.No',
  ];

  it('maps every column in the real header row', () => {
    const mapping = resolveColumns(HEADERS);
    const unmapped = HEADERS.filter((h) => !Object.values(mapping).includes(h));
    assert.deepEqual(unmapped, [], 'headers the importer does not recognise');
  });

  it('resolves bracketed language suffixes to the right field', () => {
    const m = resolveColumns(HEADERS);
    assert.equal(m.question, 'Q (English)');
    assert.equal(m.questionHi, 'Q (Hindi)');
    assert.equal(m.optionA, 'Opt-A');
    assert.equal(m.optionAHi, 'Opt-A (Hindi)');
    assert.equal(m.optionD, 'Opt-D');
    assert.equal(m.optionDHi, 'Opt-D (Hindi)');
  });

  it('treats a column headed with the exam name as the level', () => {
    assert.equal(resolveColumns(HEADERS).level, 'HTET');
  });

  it('does not confuse "Q (Hindi)" with "Q (English)"', () => {
    const m = resolveColumns(['Q (Hindi)', 'Q (English)']);
    assert.equal(m.question, 'Q (English)');
    assert.equal(m.questionHi, 'Q (Hindi)');
  });
});

describe('(c) numeric columns exported as floats', () => {
  it('reads an integer out of a float-shaped string', () => {
    assert.equal(integerFrom('2020.0'), 2020);
    assert.equal(integerFrom('22.0'), 22);
    assert.equal(integerFrom(' 2020.0 '), 2020, 'with the whitespace a sheet leaves');
    assert.equal(integerFrom('2020'), 2020, 'and a plain integer');
  });

  it('refuses a value that is genuinely fractional or not a number', () => {
    // Truncating would turn a broken cell into a plausible-looking year.
    assert.equal(integerFrom('2020.5'), undefined);
    assert.equal(integerFrom('abc'), undefined);
    assert.equal(integerFrom(''), undefined);
    assert.equal(integerFrom(undefined), undefined);
  });

  it('gives the imported question a real year and question number', () => {
    const report = importQuestions([realRow()], { refs: REFS, now });
    assert.equal(report.rejected.length, 0);
    const pyq = report.accepted[0]!.pyq;
    assert.equal(pyq?.year, 2020);
    assert.equal(pyq?.questionNumber, 22);
    // Not "2020.0" carried through as a string, and not NaN.
    assert.equal(typeof pyq?.year, 'number');
    assert.equal(typeof pyq?.questionNumber, 'number');
  });
});

describe('a prose value in an id column', () => {
  it('is rejected per row, not left to the database foreign key', () => {
    // The real Sub-Topic column reads "Basic processes of teaching and
    // learning". subtopic_id is a foreign key and this taxonomy defines no
    // subtopics, so before this the whole 840-row batch died on a Postgres
    // constraint the operator could do nothing with.
    const report = importQuestions(
      [realRow({ Subtopic: 'Basic processes of teaching and learning' })],
      { refs: REFS, now },
    );
    assert.equal(report.accepted.length, 0);
    const issue = report.rejected[0]!.issues.find((i) => i.field === 'subtopicId');
    assert.ok(issue, 'the subtopic column is named');
    assert.match(issue!.message, /Map that column to Tags, or leave it unmapped/);
  });

  it('accepts the row once that column is not treated as an id', () => {
    const report = importQuestions(
      [realRow({ Subtopic: 'Basic processes of teaching and learning' })],
      { refs: REFS, now, columns: { ...DEFAULT_COLUMNS, subtopic: [] } },
    );
    assert.equal(report.rejected.length, 0);
    assert.equal(report.accepted.length, 1);
  });
});

describe('the three bugs together', () => {
  it('imports the real row that used to be rejected outright', () => {
    const report = importQuestions([realRow()], { refs: REFS, now });

    assert.equal(report.rejected.length, 0, JSON.stringify(report.rejected, null, 2));
    assert.equal(report.accepted.length, 1);

    const q = report.accepted[0]!;
    assert.deepEqual(q.correctAnswers, ['A'], 'Opt-A is the first option');
    assert.equal(q.text.en, 'According to Piaget, which stage comes first?');
    assert.match(q.text.hi ?? '', /पियाजे/);
    assert.equal(q.options.length, 4);
    assert.equal(q.topicId, 'cdp-piaget');
    assert.deepEqual(q.levels, ['upper-primary']);
  });

  it('still rejects a row whose answer points at no option', () => {
    const report = importQuestions([realRow({ 'Correct Answer': 'Opt-Z' })], { refs: REFS, now });
    assert.equal(report.accepted.length, 0);
    assert.ok(
      report.rejected[0]!.issues.some((i) => i.field === 'correctAnswers'),
      'the answer column should still be checked',
    );
  });
});
