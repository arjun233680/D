import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextOnboardingStep, type LearnerSubject, type Level } from '../src/index.ts';

/**
 * The step decision, and the loop it exists to prevent.
 *
 * Three screens read this: the dashboard to decide whether to send somebody
 * back, the chooser to decide where to send them on, and the subject step to
 * decide whether it has anything left to ask. Disagreement between any two of
 * them is not a wrong page — it is a learner bounced between two screens
 * forever, which is why the PRT cases below are the point of this file.
 */

const level = (id: string, requiresSubject: boolean): Level => ({
  id,
  name: id.toUpperCase(),
  fullName: { en: id, hi: id },
  icon: '📘',
  color: '#000000',
  sortOrder: 10,
  requiresSubject,
});

const PRT = level('prt', false);
const TGT = level('tgt', true);
const PGT = level('pgt', true);
const LEVELS = [PRT, TGT, PGT];

const sub = (levelId: string, subjectId: string): LearnerSubject => ({ levelId, subjectId });

describe('which onboarding question is outstanding', () => {
  it('asks for exams when there are none', () => {
    assert.equal(nextOnboardingStep([], LEVELS, [], []), 'exams');
  });

  it('asks for a level once exams are chosen', () => {
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, [], []), 'level');
  });

  it('asks for a subject when a level wants one', () => {
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, ['tgt'], []), 'subject');
  });

  it('is done once every asking level has an answer', () => {
    assert.equal(
      nextOnboardingStep(['ctet'], LEVELS, ['tgt'], [sub('tgt', 'science')]),
      'done',
    );
  });

  it('keeps asking while one of several levels is unanswered', () => {
    assert.equal(
      nextOnboardingStep(['ctet'], LEVELS, ['tgt', 'pgt'], [sub('tgt', 'science')]),
      'subject',
    );
    assert.equal(
      nextOnboardingStep(
        ['ctet'],
        LEVELS,
        ['tgt', 'pgt'],
        [sub('tgt', 'science'), sub('pgt', 'chemistry')],
      ),
      'done',
    );
  });
});

describe('a level with no subject to choose', () => {
  /*
   * The loop. PRT alone leaves `learner_subjects` empty, so anything testing
   * "has subjects" concludes onboarding is unfinished — while the chooser,
   * seeing nothing owed, concludes it is finished and sends them on. The two
   * then volley. `done` here is what makes that impossible.
   */
  it('is finished with PRT alone, despite no subject row existing', () => {
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, ['prt'], []), 'done');
  });

  it('is skipped when it sits alongside a level that does ask', () => {
    // PRT contributes nothing to the question; TGT is what is outstanding.
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, ['prt', 'tgt'], []), 'subject');
    assert.equal(
      nextOnboardingStep(['ctet'], LEVELS, ['prt', 'tgt'], [sub('tgt', 'science')]),
      'done',
    );
  });

  it('never asks for PRT even if a subject row somehow exists for it', () => {
    // A row left behind by an earlier build must not resurrect the question.
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, ['prt'], [sub('prt', 'evs')]), 'done');
  });

  /*
   * A level the client does not know about cannot be counted as owing, or an
   * unrecognised id would strand somebody on a step with nothing to show.
   */
  it('ignores a level id that is not in the level list', () => {
    assert.equal(nextOnboardingStep(['ctet'], LEVELS, ['not-a-level'], []), 'done');
  });
});
