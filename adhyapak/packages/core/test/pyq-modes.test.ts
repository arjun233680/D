import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultPyqSelection,
  pyqSelectionToParams,
  resolvePyqSelection,
} from '../src/engine/pyq-filter';
import {
  PYQ_MODES,
  pyqModeEmptyReason,
  pyqModeFilter,
  pyqModeModel,
} from '../src/engine/pyq-modes';

/**
 * The three PYQ modes.
 *
 * What is worth testing here is not that each returns something, but that they
 * return *different* things — the whole reason they are three tabs rather than
 * one screen with filters is that a full paper, a section and a topic are three
 * different questions. A change that quietly made topic practice honour the
 * year filter would look fine on screen and would silently answer the wrong
 * question, so the absences are asserted as hard as the presences.
 */

describe('the three modes are three different requests', () => {
  it('offers exactly three, in the order the tabs read', () => {
    assert.deepEqual([...PYQ_MODES], ['full-paper', 'section', 'topic']);
  });

  it('asks for a whole paper without narrowing to a subject', () => {
    const f = pyqModeFilter('full-paper', { examId: 'htet', paperId: 'htet-l2', year: 2024 }, 'science');
    assert.equal(f.paperId, 'htet-l2');
    assert.equal(f.year, 2024);
    assert.equal(f.subjectId, undefined, 'a full paper is not one subject of it');
    assert.equal(f.orderByQuestionNo, true, 'a rehearsal runs in printed order');
  });

  it('narrows a section to one subject of one year', () => {
    const f = pyqModeFilter('section', { examId: 'htet', paperId: 'htet-l2', year: 2024 }, 'cdp');
    assert.equal(f.paperId, 'htet-l2');
    assert.equal(f.year, 2024);
    assert.equal(f.subjectId, 'cdp');
  });

  it('mixes every year in topic practice, and does not filter by paper', () => {
    const f = pyqModeFilter(
      'topic',
      { examId: 'htet', paperId: 'htet-l2', year: 2024, topicId: 'cdp-piaget' },
      'cdp',
    );
    assert.equal(f.topicId, 'cdp-piaget');
    assert.equal(f.year, undefined, 'mixing years is the point of topic practice');
    assert.equal(f.paperId, undefined, 'a Piaget question is a Piaget question');
  });
});

describe('the subject tabs follow the learner, not the paper', () => {
  const selection = { examId: 'htet', paperId: 'htet-l2' };

  it('offers the common blocks plus the one elective that was chosen', () => {
    const model = pyqModeModel('topic', selection, 'science');
    const ids = model.subjectTabs.map((o) => o.value);
    assert.ok(ids.includes('cdp'), 'CDP is common to every candidate');
    assert.ok(ids.includes('science'), 'and their own subject');
    assert.ok(
      !ids.includes('sanskrit'),
      'a Science candidate has no Sanskrit tab — showing one implies the bank has Sanskrit for them',
    );
  });

  it('says the elective is missing rather than offering all twelve', () => {
    const model = pyqModeModel('topic', selection, undefined);
    assert.equal(model.needsElective, true);
    assert.deepEqual(model.subjectTabs, []);
    const reason = pyqModeEmptyReason(model, selection);
    assert.match(reason?.en ?? '', /Choose your subject/);
    assert.ok(reason?.hi, 'and says so in Hindi too');
  });

  it('has no elective to want on a paper without one', () => {
    const model = pyqModeModel('topic', { examId: 'ctet', paperId: 'ctet-p1' }, undefined);
    assert.equal(model.needsElective, false);
    assert.ok(model.subjectTabs.length > 0);
  });
});

describe('sections come from the blueprint with the elective resolved', () => {
  it('marks which block is the one the candidate chose', () => {
    const model = pyqModeModel('section', { examId: 'htet', paperId: 'htet-l2' }, 'science');
    const elective = model.sections.filter((s) => s.elective);
    assert.equal(elective.length, 1, 'exactly one block is the choice');
    assert.equal(elective[0]!.subjectId, 'science');
    assert.ok(model.sections.some((s) => s.subjectId === 'cdp' && !s.elective));
  });

  it('adds up to the paper it describes', () => {
    const model = pyqModeModel('section', { examId: 'ctet', paperId: 'ctet-p2' }, 'sst');
    assert.equal(
      model.sections.reduce((n, s) => n + s.questions, 0),
      150,
    );
  });
});

describe('an empty screen says what to do about it', () => {
  const selection = { examId: 'htet', paperId: 'htet-l2' };

  it('asks for a year before a paper or a section', () => {
    for (const mode of ['full-paper', 'section'] as const) {
      const model = pyqModeModel(mode, selection, 'science');
      assert.match(pyqModeEmptyReason(model, selection)?.en ?? '', /year/);
    }
  });

  it('never asks for a year in topic practice', () => {
    const model = pyqModeModel('topic', selection, 'science');
    const reason = pyqModeEmptyReason(model, selection);
    assert.doesNotMatch(reason?.en ?? '', /year/);
    assert.match(reason?.en ?? '', /topic/i);
  });

  it('says nothing once the selection is complete', () => {
    const done = { ...selection, year: 2024, subjectId: 'cdp' };
    const model = pyqModeModel('section', done, 'science');
    assert.equal(pyqModeEmptyReason(model, done), undefined);
  });

  it('shows years for the first two modes and not the third', () => {
    assert.equal(pyqModeModel('full-paper', selection, 'science').showYears, true);
    assert.equal(pyqModeModel('section', selection, 'science').showYears, true);
    assert.equal(pyqModeModel('topic', selection, 'science').showYears, false);
  });
});

describe('the post switcher, and what it asks next', () => {
  it('offers the exam’s posts the way a candidate says them', () => {
    const model = pyqModeModel('full-paper', { examId: 'htet', paperId: 'htet-l1' }, undefined);
    assert.deepEqual(
      model.paperOptions.map((o) => o.labelEn),
      ['PRT', 'TGT', 'PGT'],
    );
  });

  it('asks nothing more for PRT', () => {
    const model = pyqModeModel('full-paper', { examId: 'htet', paperId: 'htet-l1' }, undefined);
    assert.deepEqual(model.electiveOptions, [], 'a primary paper has no subject choice');
    assert.equal(model.needsElective, false, 'so it goes straight to the year');
  });

  it('asks which subject for TGT, and for PGT', () => {
    for (const [paperId, count] of [
      ['htet-l2', 12],
      ['htet-l3', 21],
    ] as const) {
      const model = pyqModeModel('full-paper', { examId: 'htet', paperId }, undefined);
      assert.equal(model.electiveOptions.length, count, paperId);
      assert.equal(model.needsElective, true, `${paperId} waits for an answer`);
    }
  });

  it('lets a TGT candidate browse the PGT paper without changing what they prepare for', () => {
    // The profile says Science, a TGT subject. Reading the PGT paper means
    // saying which PGT subject — and that answer is about this screen, not
    // about them.
    const browsing = { examId: 'htet', paperId: 'htet-l3', electiveSubjectId: 'physics' };
    const model = pyqModeModel('topic', browsing, 'science');
    assert.equal(model.electiveSubjectId, 'physics', 'the browsing choice wins');
    assert.equal(model.needsElective, false);
    assert.ok(model.subjectTabs.some((o) => o.value === 'physics'));
    assert.ok(
      !model.subjectTabs.some((o) => o.value === 'science'),
      'and their own subject is not smuggled into a paper that does not offer it',
    );
  });

  it('falls back to the profile when nothing is being browsed', () => {
    const model = pyqModeModel('topic', { examId: 'htet', paperId: 'htet-l2' }, 'science');
    assert.equal(model.electiveSubjectId, 'science');
    assert.equal(model.needsElective, false);
  });

  it('carries the browsing subject through a link', () => {
    const params = pyqSelectionToParams({ examId: 'htet', electiveSubjectId: 'physics' });
    assert.equal(params.elective, 'physics');
  });
});

describe('the chips can only ever come from the goal exam', () => {
  it('ignores a saved paper that belongs to another exam', () => {
    // The reported bug: a profile still holding CTET's Paper 2 from an earlier
    // goal, alongside HTET. The paper existed, so it was accepted, and every
    // chip below it came from CTET.
    const selection = defaultPyqSelection({ goalExamId: 'htet', targetPaperId: 'ctet-p2' });
    assert.equal(selection.examId, 'htet');
    assert.equal(selection.paperId, 'htet-l1', 'falls back to this exam’s first paper');
  });

  it('keeps a saved paper that does belong to the exam', () => {
    const selection = defaultPyqSelection({ goalExamId: 'htet', targetPaperId: 'htet-l3' });
    assert.equal(selection.paperId, 'htet-l3');
  });

  it('shows this exam’s posts, never another exam’s', () => {
    const model = pyqModeModel('full-paper', { examId: 'htet', paperId: 'ctet-p2' }, undefined);
    assert.deepEqual(
      model.paperOptions.map((o) => o.labelEn),
      ['PRT', 'TGT', 'PGT'],
      'HTET posts, not CTET’s Paper I / Paper II',
    );
    assert.deepEqual(
      model.electiveOptions,
      [],
      'and not CTET Paper 2’s Mathematics & Science / Social Studies',
    );
  });

  it('carries the elective through a URL round trip, on every field', () => {
    // Both of these were written to the URL and then dropped on resolve, so a
    // chip lit up and nothing under it changed.
    const url = {
      examId: 'htet',
      paperId: 'htet-l2',
      topicId: 'cdp-piaget',
      electiveSubjectId: 'science',
    };
    const resolved = resolvePyqSelection(url, { goalExamId: 'htet', targetPaperId: 'htet-l1' });
    assert.equal(resolved.topicId, 'cdp-piaget');
    assert.equal(resolved.electiveSubjectId, 'science');
  });

  it('falls back to the profile’s elective for the profile’s own exam', () => {
    const resolved = resolvePyqSelection(
      {},
      { goalExamId: 'htet', targetPaperId: 'htet-l2', electiveSubjectId: 'science' },
    );
    assert.equal(resolved.electiveSubjectId, 'science');
  });

  it('does not carry it to a different exam', () => {
    const resolved = resolvePyqSelection(
      { examId: 'ctet' },
      { goalExamId: 'htet', targetPaperId: 'htet-l2', electiveSubjectId: 'science' },
    );
    assert.equal(resolved.electiveSubjectId, undefined, 'CTET does not offer Science as an elective');
  });
});
