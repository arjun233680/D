import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_COLUMNS,
  EXAMS,
  SUBJECTS,
  fingerprint,
  findDuplicates,
  importQuestions,
  importQuestionsFromCsv,
  nearest,
  normaliseText,
  parseDelimited,
  refsFrom,
  resolveColumns,
  validateQuestion,
  type ContentQuestion,
} from '../src/index.ts';

/**
 * The Studio import path.
 *
 * These cover the parts a wrong answer would corrupt a question bank with:
 * duplicate detection that must not merge distinct questions, column mapping
 * that must survive whatever a contributor named their columns, and the
 * bilingual rule that Hindi and English never overwrite one another.
 */

const REFS = refsFrom({
  exams: EXAMS.map((e) => e.id),
  subjects: SUBJECTS.map((s) => s.id),
  topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
  levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
});

const now = () => '2026-01-01T00:00:00.000Z';

/**
 * The dataset the brief asks for: 10 valid rows, 3 invalid, 2 near-duplicates,
 * several years and topics, Hindi and English throughout, PYQ metadata.
 */
const HTET_CSV = [
  'Exam,Level,Subject,Topic,Question Text,Question Hi,Option A,Option B,Option C,Option D,Option A Hi,Option B Hi,Option C Hi,Option D Hi,Correct Answer,Explanation,Explanation Hi,Year,Paper,Shift,Q No,Difficulty',
  // --- 10 valid
  'htet,upper-primary,cdp,cdp-piaget,Object permanence develops in which stage?,वस्तु स्थायित्व किस अवस्था में?,Sensorimotor,Pre-operational,Concrete,Formal,संवेदी-पेशीय,पूर्व-संक्रियात्मक,मूर्त,औपचारिक,A,Hallmark of the sensorimotor stage.,संवेदी-पेशीय अवस्था की पहचान।,2024,Paper 1,1,27,easy',
  'htet,upper-primary,cdp,cdp-piaget,"Calling every four-legged animal a ""dog"" is:",हर चौपाये को कुत्ता कहना है:,Accommodation,Assimilation,Equilibration,Conservation,समायोजन,आत्मसातीकरण,संतुलनीकरण,संरक्षण,B,Fitting new input into an old schema.,पुरानी स्कीमा में नई सूचना।,2024,Paper 1,2,31,medium',
  'htet,upper-primary,cdp,cdp-inclusive,Inclusive education mainly means:,समावेशी शिक्षा का अर्थ:,Separate schools,Teaching all together,Only gifted,Home schooling,अलग विद्यालय,सबको साथ पढ़ाना,केवल प्रतिभाशाली,गृह शिक्षा,B,All learners in one classroom.,सभी एक ही कक्षा में।,2023,Paper 1,1,12,easy',
  'htet,upper-primary,cdp,cdp-inclusive,A child with dyslexia mainly struggles with:,डिस्लेक्सिया में कठिनाई होती है:,Reading,Running,Singing,Drawing,पढ़ने में,दौड़ने में,गाने में,चित्र बनाने में,A,Dyslexia is a reading difficulty.,डिस्लेक्सिया पठन कठिनाई है।,2023,Paper 1,2,19,medium',
  'htet,upper-primary,cdp,cdp-piaget,Schema is best described as:,स्कीमा है:,A mental structure,A test,A school,A subject,मानसिक संरचना,एक परीक्षा,एक विद्यालय,एक विषय,A,Schema is the mental structure.,स्कीमा मानसिक संरचना है।,2022,Paper 1,1,8,easy',
  'htet,upper-primary,cdp,cdp-learning,Reinforcement was central to which theorist?,पुनर्बलन किसका केंद्रीय विचार?,Skinner,Piaget,Vygotsky,Bruner,स्किनर,पियाजे,वायगोत्स्की,ब्रूनर,A,Operant conditioning.,क्रिया-प्रसूत अनुबंधन।,2022,Paper 1,2,15,easy',
  'htet,upper-primary,cdp,cdp-learning,The zone of proximal development belongs to:,निकटस्थ विकास क्षेत्र किसका?,Vygotsky,Piaget,Skinner,Thorndike,वायगोत्स्की,पियाजे,स्किनर,थार्नडाइक,A,Vygotsky.,वायगोत्स्की।,2021,Paper 1,1,22,medium',
  'htet,upper-primary,cdp,cdp-piaget,Formal operational stage typically begins at:,औपचारिक संक्रियात्मक अवस्था प्रारंभ:,11 years,2 years,7 years,15 years,11 वर्ष,2 वर्ष,7 वर्ष,15 वर्ष,A,Around eleven.,लगभग ग्यारह वर्ष।,2021,Paper 1,2,29,hard',
  'htet,upper-primary,cdp,cdp-inclusive,Continuous and comprehensive evaluation is mainly:,सतत एवं व्यापक मूल्यांकन मुख्यतः:,Formative,Only summative,Only oral,Only written,रचनात्मक,केवल योगात्मक,केवल मौखिक,केवल लिखित,A,Formative in intent.,रचनात्मक प्रकृति।,2020,Paper 1,1,33,medium',
  'htet,upper-primary,cdp,cdp-learning,Learning by insight was proposed by:,अंतर्दृष्टि द्वारा अधिगम किसने दिया?,Kohler,Skinner,Pavlov,Watson,कोहलर,स्किनर,पावलव,वाटसन,A,Gestalt psychology.,गेस्टाल्ट मनोविज्ञान।,2020,Paper 1,2,41,medium',
  // --- 3 invalid: answer out of range, unknown subject, no question text
  'htet,upper-primary,cdp,cdp-piaget,Answer points nowhere,उत्तर कहीं नहीं,One,Two,Three,Four,एक,दो,तीन,चार,F,none,कोई नहीं,2024,Paper 1,1,50,easy',
  'htet,upper-primary,maths,cdp-piaget,Unknown subject row,अज्ञात विषय,One,Two,Three,Four,एक,दो,तीन,चार,A,none,कोई नहीं,2024,Paper 1,1,51,easy',
  'htet,upper-primary,cdp,cdp-piaget,,,One,Two,Three,Four,एक,दो,तीन,चार,A,none,कोई नहीं,2024,Paper 1,1,52,easy',
  // --- 2 near-duplicates of row 1, differing only in punctuation and spacing
  'htet,upper-primary,cdp,cdp-piaget,Object permanence develops in which stage?,वस्तु स्थायित्व किस अवस्था में?,Sensorimotor,Pre-operational,Concrete,Formal,संवेदी-पेशीय,पूर्व-संक्रियात्मक,मूर्त,औपचारिक,A,Duplicate of row 2.,पंक्ति 2 की प्रति।,2024,Paper 1,1,27,easy',
  'htet,upper-primary,cdp,cdp-piaget,"Object  permanence   develops in which stage",वस्तु स्थायित्व किस अवस्था में,Sensorimotor,Pre-operational,Concrete,Formal,संवेदी-पेशीय,पूर्व-संक्रियात्मक,मूर्त,औपचारिक,A,Spacing differs only.,केवल अंतराल भिन्न।,2019,Paper 1,1,9,easy',
].join('\n');

describe('the realistic HTET dataset', () => {
  const report = importQuestionsFromCsv(HTET_CSV, { now, refs: REFS });

  it('parses every row', () => {
    assert.equal(report.stats.total, 15);
  });

  it('accepts the twelve importable rows and rejects the three broken ones', () => {
    assert.equal(report.stats.rejected, 3);
    assert.equal(report.stats.accepted, 12, 'ten valid plus the two duplicates');
  });

  it('names each rejection by spreadsheet line and field', () => {
    const lines = report.rejected.map((r) => r.row);
    assert.deepEqual(lines, [12, 13, 14]);
    assert.ok(report.rejected[0]!.issues.some((i) => i.field.startsWith('correctIndices')));
    assert.ok(report.rejected[1]!.issues.some((i) => i.field === 'subjectId'));
    assert.ok(report.rejected[2]!.issues.some((i) => i.field === 'text.en'));
  });

  it('suggests the intended spelling for a typo’d subject', () => {
    const issue = report.rejected[1]!.issues.find((i) => i.field === 'subjectId');
    assert.equal(issue?.suggestion, 'math', 'maths → math');
  });

  it('offers no suggestion when the value resembles nothing in the taxonomy', () => {
    // Guessing here would be worse than staying silent: a confident wrong
    // suggestion gets accepted, and the question lands under the wrong subject.
    const rows = parseDelimited(
      ['exam,subject,topic,question,option_a,option_b,ans', 'htet,zzzzzz,cdp-piaget,Q?,One,Two,A'].join('\n'),
    );
    const r = importQuestions(rows, { now, refs: REFS });
    const issue = r.rejected[0]!.issues.find((i) => i.field === 'subjectId');
    assert.equal(issue?.suggestion, undefined);
  });

  it('keeps Hindi and English apart on every accepted row', () => {
    for (const q of report.accepted) {
      assert.ok(q.text.en.trim(), `${q.id} lost its English`);
      assert.ok(q.text.hi.trim(), `${q.id} lost its Hindi`);
      assert.notEqual(q.text.en, q.text.hi, `${q.id} has the same text in both languages`);
      q.options.forEach((o, i) => {
        assert.ok(o.en.trim() && o.hi.trim(), `${q.id} option ${i + 1} lost a language`);
      });
    }
  });

  it('reads structured PYQ metadata across several years', () => {
    const years = new Set(report.accepted.map((q) => q.pyq?.year));
    assert.deepEqual([...years].sort(), [2019, 2020, 2021, 2022, 2023, 2024]);
    assert.equal(report.stats.withPyq, 12);
  });

  it('records both shifts of the same paper distinctly', () => {
    const shifts = report.accepted.filter((q) => q.pyq?.year === 2024).map((q) => q.pyq?.shift);
    assert.ok(shifts.includes('1') && shifts.includes('2'));
  });

  it('imports everything as a draft, never published', () => {
    assert.ok(report.accepted.every((q) => q.status === 'draft'));
  });

  it('spreads across topics rather than collapsing into one', () => {
    const topics = new Set(report.accepted.map((q) => q.topicId));
    assert.ok(topics.size >= 3, `only ${topics.size} topics`);
  });
});

describe('duplicate detection', () => {
  const report = importQuestionsFromCsv(HTET_CSV, { now, refs: REFS });
  const duplicates = findDuplicates(report.accepted);

  it('finds both near-duplicates of the first question', () => {
    assert.equal(duplicates.length, 2, JSON.stringify(duplicates, null, 2));
  });

  it('calls a same-paper repeat exact and a different-paper repeat likely', () => {
    const confidences = duplicates.map((d) => d.confidence).sort();
    assert.deepEqual(confidences, ['exact', 'likely']);
  });

  it('never removes anything — it only reports', () => {
    assert.equal(report.accepted.length, 12, 'the accepted set is untouched by detection');
  });

  it('ignores punctuation, case, spacing and curly quotes', () => {
    const a = fingerprint({ en: 'Which of the following?', hi: 'इनमें से कौन-सा?' });
    const b = fingerprint({ en: 'which of   the following', hi: 'इनमें से कौन-सा' });
    assert.equal(a, b);
  });

  it('treats a Devanagari danda like a full stop', () => {
    assert.equal(normaliseText('यह सही है।'), normaliseText('यह सही है.'));
  });

  it('keeps Devanagari vowel signs, which are marks and not letters', () => {
    // This shipped broken: the class was `[^\p{L}\p{N}\s]`, and because matras
    // are combining marks rather than letters it reduced पियाजे to "प य ज".
    // Every Hindi question sharing a consonant skeleton then fingerprinted the
    // same, which in the primary language of this product is the whole feature
    // failing quietly.
    assert.equal(normaliseText('पियाजे'), 'पियाजे');
    assert.equal(normaliseText('निकटस्थ विकास'), 'निकटस्थ विकास');
    assert.notEqual(normaliseText('कल'), normaliseText('किला'));
  });

  it('separates the two languages, so a shifted boundary is not a match', () => {
    // "ab"+"c" and "a"+"bc" would be one string without a separator.
    assert.notEqual(fingerprint({ en: 'ab', hi: 'c' }), fingerprint({ en: 'a', hi: 'bc' }));
  });

  it('does not collapse two genuinely different questions', () => {
    const a = fingerprint({ en: 'Who proposed assimilation?', hi: 'आत्मसातीकरण किसने?' });
    const b = fingerprint({ en: 'Who proposed accommodation?', hi: 'समायोजन किसने?' });
    assert.notEqual(a, b);
  });

  it('does not treat a translation fix as a duplicate', () => {
    // Same English, corrected Hindi — worth an editor's eye, not a silent skip.
    const a = fingerprint({ en: 'Object permanence?', hi: 'वस्तु स्थायित्व' });
    const b = fingerprint({ en: 'Object permanence?', hi: 'वस्तु स्थायित्व क्या है' });
    assert.notEqual(a, b);
  });

  it('flags a question the library already holds', () => {
    const first = report.accepted[0]!;
    const matches = findDuplicates([first], [
      { id: 'q-existing', fingerprint: fingerprint(first.text), pyq: first.pyq },
    ]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]!.scope, 'library');
    assert.equal(matches[0]!.confidence, 'exact');
  });

  it('ignores an empty question rather than matching every other empty one', () => {
    const blank = (id: string): ContentQuestion => ({
      id,
      status: 'draft',
      kind: 'mcq-single',
      examIds: [],
      levels: [],
      subjectId: 'cdp',
      topicId: 'cdp-piaget',
      text: { en: '', hi: '' },
      options: [],
      correctIndices: [],
      explanation: { en: '', hi: '' },
      difficulty: 'easy',
      tags: [],
      conceptTags: [],
      avgTimeSeconds: 40,
      accuracy: 0.5,
      createdAt: now(),
      updatedAt: now(),
    });
    assert.deepEqual(findDuplicates([blank('a'), blank('b')]), []);
  });
});

describe('column mapping', () => {
  it('recognises the aliases the brief lists', () => {
    const headers = [
      'Question Text',
      'question_hi',
      'OPTIONA',
      'option_b',
      'Correct Answer',
      'pyq_year',
      'Shift',
      'subject',
      'topic',
    ];
    const resolved = resolveColumns(headers, DEFAULT_COLUMNS);
    assert.equal(resolved.question, 'Question Text');
    assert.equal(resolved.questionHi, 'question_hi');
    assert.equal(resolved.optionA, 'OPTIONA');
    assert.equal(resolved.optionB, 'option_b');
    assert.equal(resolved.answer, 'Correct Answer');
    assert.equal(resolved.year, 'pyq_year');
    assert.equal(resolved.shift, 'Shift');
  });

  it('lets a manual mapping override the aliases entirely', () => {
    const rows = parseDelimited(
      ['col1,col2,col3,col4,col5,col6', 'What?,One,Two,A,cdp,cdp-piaget'].join('\n'),
    );
    // Headers that match no alias at all — the educator maps them by hand.
    const report = importQuestions(rows, {
      now,
      refs: REFS,
      columns: {
        question: ['col1'],
        optionA: ['col2'],
        optionB: ['col3'],
        answer: ['col4'],
        subject: ['col5'],
        topic: ['col6'],
      },
    });
    assert.equal(report.stats.accepted, 1, JSON.stringify(report.rejected));
    assert.equal(report.accepted[0]!.text.en, 'What?');
    assert.deepEqual(report.accepted[0]!.correctIndices, [0]);
  });

  it('reports a missing required column as a rejection, not a crash', () => {
    const rows = parseDelimited(['question,option_a,option_b', 'What?,One,Two'].join('\n'));
    const report = importQuestions(rows, { now, refs: REFS });
    assert.equal(report.stats.accepted, 0);
    assert.ok(report.rejected[0]!.issues.some((i) => i.field === 'correctIndices'));
    assert.ok(report.rejected[0]!.issues.some((i) => i.field === 'subjectId'));
  });
});

describe('suggestions', () => {
  it('finds the nearest known id for a plausible typo', () => {
    assert.equal(nearest('maths', ['math', 'evs', 'cdp']), 'math');
    assert.equal(nearest('cdp-piagets', ['cdp-piaget', 'cdp-learning']), 'cdp-piaget');
  });

  it('suggests nothing when the value resembles nothing', () => {
    assert.equal(nearest('zzzzzzzz', ['chemistry', 'physics']), undefined);
  });
});

describe('publish protection', () => {
  it('a row missing Hindi imports as a draft but cannot be published', () => {
    const rows = parseDelimited(
      [
        'exam,subject,topic,question,option_a,option_b,ans',
        'htet,cdp,cdp-piaget,English only?,One,Two,A',
      ].join('\n'),
    );
    const report = importQuestions(rows, { now, refs: REFS });
    assert.equal(report.stats.accepted, 1, 'a draft may be missing Hindi');

    const asPublished = validateQuestion(
      { ...report.accepted[0]!, status: 'published' },
      REFS,
    );
    assert.equal(asPublished.ok, false, 'publishing it is refused');
    assert.ok(asPublished.errors.some((e) => e.code === 'missing.hi'));
  });
});

describe('large files', () => {
  it('validates ten thousand rows without collapsing', () => {
    const header =
      'exam,subject,topic,question,question_hi,option_a,option_b,option_c,option_d,ans,year';
    const lines = [header];
    for (let i = 0; i < 10_000; i += 1) {
      lines.push(
        `htet,cdp,cdp-piaget,Question number ${i}?,प्रश्न ${i}?,One,Two,Three,Four,A,${2015 + (i % 10)}`,
      );
    }
    const started = Date.now();
    const report = importQuestionsFromCsv(lines.join('\n'), { now, refs: REFS });
    const elapsed = Date.now() - started;

    assert.equal(report.stats.total, 10_000);
    assert.equal(report.stats.accepted, 10_000);
    assert.equal(report.stats.rejected, 0);
    // Not a benchmark — a guard against an accidental quadratic in parsing or
    // validation, which is the failure mode that only shows up at scale.
    assert.ok(elapsed < 20_000, `took ${elapsed}ms`);
  });

  it('detects duplicates across a large file without pairwise comparison', () => {
    const rows: ContentQuestion[] = [];
    for (let i = 0; i < 5_000; i += 1) {
      rows.push({
        id: `q-${i}`,
        status: 'draft',
        kind: 'mcq-single',
        examIds: ['htet'],
        levels: [],
        subjectId: 'cdp',
        topicId: 'cdp-piaget',
        // Every hundredth question repeats an earlier one.
        text: { en: `Question ${i % 100}?`, hi: `प्रश्न ${i % 100}?` },
        options: [{ en: 'A', hi: 'अ' }, { en: 'B', hi: 'ब' }],
        correctIndices: [0],
        explanation: { en: '', hi: '' },
        difficulty: 'easy',
        tags: [],
        conceptTags: [],
        avgTimeSeconds: 40,
        accuracy: 0.5,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    const started = Date.now();
    const duplicates = findDuplicates(rows);
    const elapsed = Date.now() - started;

    assert.equal(duplicates.length, 4_900, 'every repeat after the first hundred');
    assert.ok(elapsed < 5_000, `took ${elapsed}ms — detection must not be O(n²)`);
  });
});
