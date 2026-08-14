import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EXAMS,
  SUBJECT_BY_ID,
  electivesForPaper,
  getExam,
  getPaper,
  paperNeedsElective,
  resolvePaperSubjects,
  subjectsForPaperOrEmpty,
} from '../src/index.ts';

/**
 * The HTET blueprint, and the elective model that made it expressible.
 *
 * These are exam-day claims: a candidate plans their revision around the split
 * this file asserts. The previous data merged Quantitative Aptitude, Reasoning
 * and Haryana GK into one 30-mark "gk" block, invented a Science + Mathematics
 * pairing for Level 2 where the real paper has a 60-mark elective, and put
 * Level 3 at classes 11-12 when it covers 9-12.
 */

const htet = getExam('htet')!;
const paperOf = (id: string) => getPaper(id)!.paper;

describe('the HTET blueprint', () => {
  it('has three papers', () => {
    assert.deepEqual(htet.papers.map((p) => p.id), ['htet-l1', 'htet-l2', 'htet-l3']);
  });

  for (const paper of htet.papers) {
    describe(paper.id, () => {
      it('sums to exactly 150 questions and 150 marks', () => {
        const questions = paper.sections.reduce((n, s) => n + s.questions, 0);
        const marks = paper.sections.reduce((n, s) => n + s.marks, 0);
        assert.equal(questions, 150, 'questions across all sections');
        assert.equal(marks, 150, 'marks across all sections');
        assert.equal(paper.totalQuestions, 150);
      });

      it('runs 150 minutes with no negative marking and the NCTE cut-offs', () => {
        assert.equal(paper.durationMinutes, 150);
        assert.equal(paper.negativeMarking, 0);
        assert.equal(paper.marksPerQuestion, 1);
        assert.equal(paper.cutoffGeneral, 60);
        assert.equal(paper.cutoffReserved, 55);
      });

      it('carries the six common blocks every level shares', () => {
        const fixed = new Map(
          paper.sections
            .filter((s) => s.subjectId !== undefined)
            .map((s) => [s.subjectId!, s.marks]),
        );
        assert.equal(fixed.get('cdp'), 30);
        assert.equal(fixed.get('hindi'), 15);
        assert.equal(fixed.get('english'), 15);
        assert.equal(fixed.get('quantitative-aptitude'), 10);
        assert.equal(fixed.get('reasoning'), 10);
        assert.equal(fixed.get('haryana-gk'), 10);
      });

      it('references only subjects that exist', () => {
        for (const section of paper.sections) {
          if (section.subjectId === undefined) continue;
          assert.ok(
            SUBJECT_BY_ID.has(section.subjectId),
            `${paper.id} references unknown subject "${section.subjectId}"`,
          );
        }
      });
    });
  }

  it('splits Level 1 into the eight real blocks, not a merged GK section', () => {
    const l1 = paperOf('htet-l1');
    assert.equal(l1.sections.length, 8);
    const marks = new Map(l1.sections.map((s) => [s.subjectId!, s.marks]));
    assert.equal(marks.get('math'), 30);
    assert.equal(marks.get('evs'), 30);
    assert.equal(marks.get('gk'), undefined, 'the merged 30-mark "gk" block is gone');
    assert.equal(paperNeedsElective('htet-l1'), false, 'PRT has no elective');
  });

  it('puts Level 3 at classes 9 to 12', () => {
    assert.match(paperOf('htet-l3').name.en, /Classes 9 to 12/);
    assert.match(paperOf('htet-l3').name.hi, /कक्षा 9 से 12/);
  });

  it('cites the blueprint it claims', () => {
    assert.ok(htet.sources.length >= 4);
    for (const source of htet.sources) {
      assert.match(source.checkedOn, /^\d{4}-\d{2}-\d{2}$/, `${source.label} has no check date`);
      assert.match(source.url, /^https:\/\//);
    }
  });
});

describe('the elective sections', () => {
  for (const paperId of ['htet-l2', 'htet-l3']) {
    describe(paperId, () => {
      it('exposes exactly one 60-mark elective group', () => {
        const paper = paperOf(paperId);
        const elective = paper.sections.filter((s) => s.subjectId === undefined);
        assert.equal(elective.length, 1, 'one elective section');
        assert.equal(elective[0]!.questions, 60);
        assert.equal(elective[0]!.marks, 60);

        const groups = electivesForPaper(paperId);
        assert.equal(groups.length, 1);
        assert.equal(groups[0]!.id, elective[0]!.electiveGroupId);
        assert.equal(paperNeedsElective(paperId), true);
      });

      it('offers only subjects that exist', () => {
        for (const group of electivesForPaper(paperId)) {
          for (const choice of group.choices) {
            assert.ok(SUBJECT_BY_ID.has(choice), `unknown elective subject "${choice}"`);
          }
          assert.equal(
            new Set(group.choices).size,
            group.choices.length,
            'the choice list repeats a subject',
          );
        }
      });
    });
  }

  it('offers the twelve TGT subjects', () => {
    const choices = electivesForPaper('htet-l2')[0]!.choices;
    assert.equal(choices.length, 12);
    for (const id of ['science', 'math', 'music', 'hindi', 'english', 'home-science',
      'sanskrit', 'sst', 'art', 'punjabi', 'physical-education', 'urdu']) {
      assert.ok(choices.includes(id), `TGT is missing ${id}`);
    }
  });

  it('offers the twenty-one PGT subjects', () => {
    const choices = electivesForPaper('htet-l3')[0]!.choices;
    assert.equal(choices.length, 21);
    for (const id of ['hindi', 'english', 'sanskrit', 'punjabi', 'urdu', 'math', 'physics',
      'chemistry', 'biology', 'history', 'geography', 'political-science', 'economics',
      'sociology', 'psychology', 'commerce', 'computer-science', 'home-science',
      'physical-education', 'music', 'fine-arts']) {
      assert.ok(choices.includes(id), `PGT is missing ${id}`);
    }
  });
});

describe('resolving a paper against a learner', () => {
  it('is a typed error, not a silent default, when no elective is chosen', () => {
    const result = resolvePaperSubjects('htet-l2', undefined);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'not-chosen');
    assert.equal(result.ok === false && result.error.groupId, 'htet-l2-elective');
    // The caller gets the group so it can render the choices, not a subject list
    // it might mistake for the real syllabus.
    assert.ok(result.ok === false && result.error.kind === 'not-chosen' && result.error.group);
  });

  it('is a typed error when the saved choice is not offered by this paper', () => {
    // Physics is a PGT subject; a TGT candidate cannot sit it.
    const result = resolvePaperSubjects('htet-l2', 'physics');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'not-in-group');
    assert.equal(
      result.ok === false && result.error.kind === 'not-in-group' && result.error.chosen,
      'physics',
    );
  });

  it('resolves the elective section to the chosen subject', () => {
    const result = resolvePaperSubjects('htet-l2', 'science');
    assert.ok(result.ok);
    assert.ok(result.subjectIds.includes('science'));

    const elective = result.sections.find((s) => s.electiveGroupId);
    assert.equal(elective?.subjectId, 'science');
    assert.equal(elective?.section.marks, 60);

    // Two candidates on the same paper get different syllabi, which is the
    // whole reason this model exists.
    const other = resolvePaperSubjects('htet-l2', 'urdu');
    assert.ok(other.ok);
    assert.ok(other.subjectIds.includes('urdu'));
    assert.ok(!other.subjectIds.includes('science'));
  });

  it('needs no choice for a paper without electives', () => {
    const result = resolvePaperSubjects('htet-l1');
    assert.ok(result.ok);
    assert.deepEqual(result.subjectIds, [
      'cdp', 'hindi', 'english', 'quantitative-aptitude', 'reasoning', 'haryana-gk', 'math', 'evs',
    ]);
  });

  it('returns an empty list rather than throwing for an unknown paper', () => {
    const result = resolvePaperSubjects('no-such-paper');
    assert.ok(result.ok);
    assert.deepEqual(result.subjectIds, []);
  });

  it('collapses the unresolved case to empty only where that is explicit', () => {
    assert.deepEqual(subjectsForPaperOrEmpty('htet-l2'), []);
    assert.ok(subjectsForPaperOrEmpty('htet-l2', 'science').includes('science'));
  });
});

describe('every exam blueprint', () => {
  it('has sections that sum to the paper total', () => {
    for (const exam of EXAMS) {
      for (const paper of exam.papers) {
        const questions = paper.sections.reduce((n, s) => n + s.questions, 0);
        assert.equal(
          questions,
          paper.totalQuestions,
          `${exam.id}/${paper.id}: sections sum to ${questions}, paper claims ${paper.totalQuestions}`,
        );
      }
    }
  });

  it('declares an elective group for every elective section it references', () => {
    for (const exam of EXAMS) {
      for (const paper of exam.papers) {
        for (const section of paper.sections) {
          if (section.subjectId !== undefined) continue;
          assert.ok(
            paper.electives?.some((g) => g.id === section.electiveGroupId),
            `${paper.id} references undeclared group "${section.electiveGroupId}"`,
          );
        }
      }
    }
  });
});
