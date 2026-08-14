import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EXAMS,
  QUESTIONS,
  SUBJECTS,
  describeReport,
  formatPyq,
  importQuestionsFromCsv,
  parseAnswer,
  parseDelimited,
  refsFrom,
  toQuestion,
  validateNote,
  validateQuestion,
  validateTest,
  type ContentQuestion,
} from '../src/index.ts';

/**
 * The import path is where a 20,000-row question bank becomes production data.
 * Every test here describes something that would corrupt the library if it got
 * through: an answer pointing past the options, a duplicate id silently
 * overwriting a question, a comma inside question text shifting every column.
 */

const bi = (en: string, hi = en) => ({ en, hi });

const goodQuestion = (over: Partial<ContentQuestion> = {}): ContentQuestion => ({
  id: 'q-1',
  status: 'published',
  kind: 'mcq-single',
  examIds: ['ctet'],
  levels: [],
  subjectId: 'cdp',
  topicId: 'cdp-piaget',
  text: bi('Who proposed the four stages?', 'चार अवस्थाएँ किसने दीं?'),
  options: [bi('Piaget', 'पियाजे'), bi('Vygotsky', 'वायगोत्स्की'), bi('Skinner', 'स्किनर'), bi('Bruner', 'ब्रूनर')],
  correctIndices: [0],
  explanation: bi('Piaget.', 'पियाजे।'),
  difficulty: 'easy',
  tags: [],
  conceptTags: [],
  avgTimeSeconds: 40,
  accuracy: 0.6,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('question validation', () => {
  it('accepts a complete question', () => {
    assert.equal(validateQuestion(goodQuestion()).ok, true);
  });

  it('rejects an answer that points past the options', () => {
    const r = validateQuestion(goodQuestion({ correctIndices: [7] }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'out.of.range'));
  });

  it('rejects a question with no correct answer', () => {
    const r = validateQuestion(goodQuestion({ correctIndices: [] }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.field === 'correctIndices'));
  });

  it('rejects two answers on a single-correct question', () => {
    const r = validateQuestion(goodQuestion({ correctIndices: [0, 1] }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'too.many'));
  });

  it('allows two answers when the question says multiple', () => {
    assert.equal(validateQuestion(goodQuestion({ kind: 'mcq-multiple', correctIndices: [0, 1] })).ok, true);
  });

  it('blocks publishing without Hindi, but allows a draft', () => {
    const noHindi = goodQuestion({ text: { en: 'English only', hi: '' } });
    assert.equal(validateQuestion(noHindi).ok, false, 'published needs Hindi');
    const draft = validateQuestion({ ...noHindi, status: 'draft' });
    assert.equal(draft.ok, true, 'a draft may still be missing Hindi');
    assert.ok(draft.warnings.some((w) => w.code === 'missing.hi'));
  });

  it('always requires English, because every screen falls back to it', () => {
    const r = validateQuestion(goodQuestion({ text: { en: '  ', hi: 'हिंदी' }, status: 'draft' }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'missing.en'));
  });

  it('rejects references to subjects and topics that do not exist', () => {
    const refs = refsFrom({
      exams: EXAMS.map((e) => e.id),
      subjects: SUBJECTS.map((s) => s.id),
      topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
    });
    assert.equal(validateQuestion(goodQuestion(), refs).ok, true);
    const bad = validateQuestion(goodQuestion({ topicId: 'not-a-topic' }), refs);
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.code === 'unknown.ref'));
  });

  it('rejects an implausible previous-year date', () => {
    const r = validateQuestion(goodQuestion({ pyq: { examId: 'ctet', year: 1287 } }));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.field === 'pyq.year'));
  });

  it('warns about a repeated option instead of blocking', () => {
    const r = validateQuestion(
      goodQuestion({
        options: [bi('Piaget'), bi('piaget'), bi('Skinner'), bi('Bruner')],
      }),
    );
    assert.equal(r.ok, true);
    assert.ok(r.warnings.some((w) => w.code === 'duplicate'));
  });
});

describe('test validation', () => {
  const draft = {
    id: 't-1',
    title: bi('Mock 1', 'मॉक 1'),
    examId: 'ctet',
    durationMinutes: 90,
    marksPerQuestion: 1,
    negativeMarking: 0,
    sections: [{ title: bi('A'), questionIds: ['q-1', 'q-2'] }],
  };

  it('accepts a well-formed test', () => {
    assert.equal(validateTest(draft, new Set(['q-1', 'q-2'])).ok, true);
  });

  it('rejects a question that appears twice, even across sections', () => {
    const r = validateTest({
      ...draft,
      sections: [
        { title: bi('A'), questionIds: ['q-1'] },
        { title: bi('B'), questionIds: ['q-1'] },
      ],
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'duplicate'));
  });

  it('rejects a reference to a question that does not exist', () => {
    const r = validateTest(draft, new Set(['q-1']));
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'unknown.ref'));
  });

  it('rejects a zero duration and an empty section', () => {
    assert.equal(validateTest({ ...draft, durationMinutes: 0 }).ok, false);
    assert.equal(validateTest({ ...draft, sections: [{ title: bi('A'), questionIds: [] }] }).ok, false);
  });

  it('warns when a wrong answer costs more than a right one earns', () => {
    const r = validateTest({ ...draft, marksPerQuestion: 1, negativeMarking: 2 }, new Set(['q-1', 'q-2']));
    assert.ok(r.warnings.some((w) => w.code === 'suspicious'));
  });
});

describe('note validation', () => {
  it('rejects a relative file URL', () => {
    const r = validateNote({
      id: 'n-1',
      status: 'published',
      title: bi('Notes', 'नोट्स'),
      subjectId: 'cdp',
      fileUrl: '/files/notes.pdf',
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.field === 'fileUrl'));
  });
});

describe('CSV parsing', () => {
  it('keeps commas that are inside quoted fields', () => {
    const rows = parseDelimited('Question,Answer\n"Which of A, B, or C?",B');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.Question, 'Which of A, B, or C?');
    assert.equal(rows[0]!.Answer, 'B');
  });

  it('handles escaped quotes and newlines inside a field', () => {
    const rows = parseDelimited('Question,Answer\n"He said ""hi""\nthen left",A');
    assert.equal(rows[0]!.Question, 'He said "hi"\nthen left');
    assert.equal(rows[0]!.Answer, 'A');
  });

  it('handles CRLF line endings from Excel', () => {
    const rows = parseDelimited('A,B\r\n1,2\r\n3,4\r\n');
    assert.equal(rows.length, 2);
    assert.equal(rows[1]!.B, '4');
  });
});

describe('answer parsing', () => {
  it('reads letters, numbers and prose', () => {
    assert.deepEqual(parseAnswer('B', 4), [1]);
    assert.deepEqual(parseAnswer('b', 4), [1]);
    assert.deepEqual(parseAnswer('2', 4), [1]);
    assert.deepEqual(parseAnswer('Option C', 4), [2]);
    assert.deepEqual(parseAnswer('A and C', 4), [0, 2]);
  });

  it('returns nothing for an answer outside the options', () => {
    assert.deepEqual(parseAnswer('E', 4), []);
    assert.deepEqual(parseAnswer('', 4), []);
  });
});

describe('bulk import', () => {
  const csv = [
    'Exam,Subject,Topic,Question,Question Hi,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Explanation Hi,Year,Paper,Shift,Difficulty',
    'ctet,cdp,cdp-piaget,"Who proposed four stages of development?",चार अवस्थाएँ किसने दीं?,Piaget,Vygotsky,Skinner,Bruner,A,Piaget did.,पियाजे ने।,2024,Paper 1,1,easy',
    'ctet,cdp,cdp-piaget,Assimilation means?,आत्मसातीकरण का अर्थ?,Fit in,Change,Ignore,Forget,B,Schema changes.,स्कीमा बदलती है।,,,,medium',
  ].join('\n');

  const now = () => '2026-01-01T00:00:00.000Z';

  it('imports valid rows as drafts, not as live content', () => {
    const report = importQuestionsFromCsv(csv, { now });
    assert.equal(report.stats.accepted, 2);
    assert.equal(report.stats.rejected, 0);
    assert.ok(report.accepted.every((q) => q.status === 'draft'), 'imports must be reviewed');
  });

  it('turns a year and paper into structured PYQ metadata', () => {
    const report = importQuestionsFromCsv(csv, { now });
    const [first, second] = report.accepted;
    assert.deepEqual(first!.pyq, {
      examId: 'ctet',
      year: 2024,
      paperLabel: 'Paper 1',
      shift: '1',
      questionNumber: undefined,
    });
    assert.equal(second!.pyq, undefined, 'a row without a year is not a PYQ');
    assert.equal(report.stats.withPyq, 1);
  });

  it('maps the answer letter to the right option', () => {
    const report = importQuestionsFromCsv(csv, { now });
    assert.deepEqual(report.accepted[0]!.correctIndices, [0]);
    assert.deepEqual(report.accepted[1]!.correctIndices, [1]);
  });

  it('accepts alternative column spellings', () => {
    const alt = [
      'exam,subject,topic,question,option_a,option_b,option_c,option_d,ans',
      'ctet,cdp,cdp-piaget,Q?,One,Two,Three,Four,C',
    ].join('\n');
    const report = importQuestionsFromCsv(alt, { now, status: 'draft' });
    assert.equal(report.stats.accepted, 1);
    assert.deepEqual(report.accepted[0]!.correctIndices, [2]);
  });

  it('rejects a row whose answer is not one of its options, naming the row', () => {
    const bad = [
      'exam,subject,topic,question,option_a,option_b,ans',
      'ctet,cdp,cdp-piaget,Q?,One,Two,D',
    ].join('\n');
    const report = importQuestionsFromCsv(bad, { now });
    assert.equal(report.stats.accepted, 0);
    assert.equal(report.rejected[0]!.row, 2, 'row numbers match the spreadsheet');
    assert.ok(report.rejected[0]!.issues.some((i) => i.field === 'correctIndices'));
  });

  it('rejects a duplicate id rather than overwriting the earlier question', () => {
    const dupe = [
      'id,exam,subject,topic,question,option_a,option_b,ans',
      'q-9,ctet,cdp,cdp-piaget,First?,One,Two,A',
      'q-9,ctet,cdp,cdp-piaget,Second?,One,Two,B',
    ].join('\n');
    const report = importQuestionsFromCsv(dupe, { now });
    assert.equal(report.stats.accepted, 1);
    assert.equal(report.stats.duplicateIds, 1);
    assert.equal(report.accepted[0]!.text.en, 'First?');
  });

  it('rejects unknown subjects when given the real reference ids', () => {
    const refs = refsFrom({
      exams: EXAMS.map((e) => e.id),
      subjects: SUBJECTS.map((s) => s.id),
      topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
    });
    const typo = [
      'exam,subject,topic,question,option_a,option_b,ans',
      'ctet,chemsitry,cdp-piaget,Q?,One,Two,A',
    ].join('\n');
    const report = importQuestionsFromCsv(typo, { now, refs });
    assert.equal(report.stats.rejected, 1);
    assert.ok(report.rejected[0]!.issues.some((i) => i.code === 'unknown.ref'));
  });

  it('writes nothing — the bundled bank is untouched', () => {
    const before = QUESTIONS.length;
    const report = importQuestionsFromCsv(csv, { now });
    assert.equal(QUESTIONS.length, before, 'import must not mutate the bundled bank');
    assert.ok(describeReport(report).includes('2 of 2 rows ready'));
  });
});

describe('render adapter', () => {
  it('narrows a published question to the shape screens render', () => {
    const rendered = toQuestion(goodQuestion());
    assert.ok(rendered);
    assert.equal(rendered!.correctIndex, 0);
    assert.equal(rendered!.options.length, 4);
  });

  it('refuses to render a draft', () => {
    assert.equal(toQuestion(goodQuestion({ status: 'draft' })), null);
  });

  it('refuses to render a kind no screen supports', () => {
    assert.equal(toQuestion(goodQuestion({ kind: 'match-the-following' })), null);
  });

  it('renders PYQ metadata as a citation', () => {
    const q = goodQuestion({ pyq: { examId: 'ctet', year: 2024, session: 'december', paperLabel: 'Paper 1' } });
    assert.equal(formatPyq(q.pyq!, 'CTET'), 'CTET December 2024 Paper 1');
    assert.equal(toQuestion(q, 'CTET')!.previousYear, 'CTET December 2024 Paper 1');
  });
});
