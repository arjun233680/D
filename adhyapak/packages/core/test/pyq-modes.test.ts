import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
