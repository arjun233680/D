import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultPyqSelection,
  pyqEmptyReason,
  pyqFilterModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  pyqTruncation,
  resolvePyqSelection,
} from '../src/index.ts';

/**
 * The previous-year funnel: exam → level → subject → year → shift.
 *
 * The screen it replaces offered a year and nothing else, while the repository
 * had always translated level, subject, topic and shift into real queries. The
 * capability existed; the UI never reached for it.
 */

describe('subject options come from the paper, not a fixed list', () => {
  it('offers HTET PRT exactly the eight blocks that paper tests', () => {
    const model = pyqFilterModel({ examId: 'htet', paperId: 'htet-l1' });
    assert.deepEqual(
      model.subjectOptions.map((o) => o.value),
      ['cdp', 'hindi', 'english', 'quantitative-aptitude', 'reasoning', 'haryana-gk', 'math', 'evs'],
    );
  });

  it('labels every option in both languages', () => {
    const model = pyqFilterModel({ examId: 'htet', paperId: 'htet-l1' });
    for (const option of model.subjectOptions) {
      assert.ok(option.labelEn.length > 0, `${option.value} has no English label`);
      assert.match(option.labelHi, /[ऀ-ॿ]/, `${option.value} has no Devanagari label`);
    }
  });

  it('includes the learner’s elective on TGT, and nobody else’s', () => {
    const physics = pyqFilterModel({ examId: 'htet', paperId: 'htet-l3' }, 'physics');
    assert.ok(physics.subjectOptions.some((o) => o.value === 'physics'));
    assert.ok(!physics.subjectOptions.some((o) => o.value === 'history'));

    const history = pyqFilterModel({ examId: 'htet', paperId: 'htet-l3' }, 'history');
    assert.ok(history.subjectOptions.some((o) => o.value === 'history'));
    assert.ok(!history.subjectOptions.some((o) => o.value === 'physics'));
  });

  it('reports the elective error rather than guessing a subject', () => {
    // Reusing P1's resolution: a TGT candidate who has not chosen yet.
    const model = pyqFilterModel({ examId: 'htet', paperId: 'htet-l2' });
    assert.equal(model.subjects.ok, false);
    assert.equal(model.electiveError?.kind, 'not-chosen');
    assert.deepEqual(model.subjectOptions, [], 'no options invented while unresolved');
  });

  it('still offers the fixed blocks of a paper with no elective', () => {
    const model = pyqFilterModel({ examId: 'htet', paperId: 'htet-l1' }, undefined);
    assert.ok(model.subjects.ok);
    assert.equal(model.electiveError, undefined);
  });
});

describe('the selection becomes a repository filter', () => {
  it('carries level from the chosen paper', () => {
    const model = pyqFilterModel({ examId: 'htet', paperId: 'htet-l1', subjectId: 'cdp' });
    assert.deepEqual(model.filter, {
      pyqOnly: true,
      examId: 'htet',
      level: 'primary',
      subjectId: 'cdp',
      year: undefined,
      shift: undefined,
    });
  });

  it('composes the full funnel down to a single paper', () => {
    const model = pyqFilterModel({
      examId: 'htet',
      paperId: 'htet-l1',
      subjectId: 'cdp',
      year: 2023,
      shift: '1',
    });
    assert.equal(model.filter.examId, 'htet');
    assert.equal(model.filter.level, 'primary');
    assert.equal(model.filter.subjectId, 'cdp');
    assert.equal(model.filter.year, 2023);
    assert.equal(model.filter.shift, '1');
    assert.equal(model.filter.pyqOnly, true);
  });

  it('drops a subject the chosen paper does not test', () => {
    // Switching PGT to PRT must not leave Physics quietly filtering to nothing.
    const model = pyqFilterModel(
      { examId: 'htet', paperId: 'htet-l1', subjectId: 'physics' },
      'physics',
    );
    assert.equal(model.filter.subjectId, undefined);
  });

  it('always asks for previous-year questions only', () => {
    assert.equal(pyqFilterModel({}).filter.pyqOnly, true);
  });
});

describe('defaults come from the learner’s profile', () => {
  it('starts on the goal exam and target paper', () => {
    const selection = defaultPyqSelection({ goalExamId: 'htet', targetPaperId: 'htet-l2' });
    assert.deepEqual(selection, { examId: 'htet', paperId: 'htet-l2' });
  });

  it('falls back to the first paper when none is targeted', () => {
    assert.equal(defaultPyqSelection({ goalExamId: 'htet' }).paperId, 'htet-l1');
  });

  it('ignores a stale paper id that is not this exam’s', () => {
    const selection = defaultPyqSelection({ goalExamId: 'htet', targetPaperId: 'nope' });
    assert.equal(selection.paperId, 'htet-l1');
  });
});

describe('the URL and the profile combine', () => {
  const learner = { goalExamId: 'ctet', targetPaperId: 'ctet-p1' };
  const fromUrl = (query: string) => {
    const params = new URLSearchParams(query);
    return pyqSelectionFromParams((k) => params.get(k));
  };

  it('opens on the learner’s own paper when the URL says nothing', () => {
    // The bug this replaces: the parser returns every key, `undefined` included,
    // so `{ ...profile, ...url }` erased the profile and the level picker came
    // up empty on every unfiltered visit.
    assert.deepEqual(resolvePyqSelection(fromUrl(''), learner), {
      examId: 'ctet',
      paperId: 'ctet-p1',
      subjectId: undefined,
      year: undefined,
      shift: undefined,
    });
    assert.ok(pyqFilterModel(resolvePyqSelection(fromUrl(''), learner)).papers.length > 1);
  });

  it('keeps the profile’s paper while honouring one filter from the URL', () => {
    const selection = resolvePyqSelection(fromUrl('year=2023'), learner);
    assert.equal(selection.paperId, 'ctet-p1');
    assert.equal(selection.year, 2023);
  });

  it('lets the URL override the profile entirely', () => {
    const selection = resolvePyqSelection(fromUrl('exam=htet&paper=htet-l1&subject=cdp'), learner);
    assert.deepEqual(selection, {
      examId: 'htet',
      paperId: 'htet-l1',
      subjectId: 'cdp',
      year: undefined,
      shift: undefined,
    });
  });

  it('does not carry the profile’s paper into a different exam', () => {
    const selection = resolvePyqSelection(fromUrl('exam=htet'), learner);
    assert.equal(selection.examId, 'htet');
    assert.equal(selection.paperId, undefined, 'ctet-p1 is not an HTET paper');
  });
});

describe('the filter round-trips through the URL', () => {
  it('writes only what is set', () => {
    assert.deepEqual(pyqSelectionToParams({ examId: 'htet', paperId: 'htet-l1' }), {
      exam: 'htet',
      paper: 'htet-l1',
    });
  });

  it('survives a round trip', () => {
    const selection = {
      examId: 'htet',
      paperId: 'htet-l1',
      subjectId: 'cdp',
      year: 2023,
      shift: '1',
    };
    const params = pyqSelectionToParams(selection);
    const back = pyqSelectionFromParams((k) => params[k] ?? null);
    assert.deepEqual(back, selection);
  });

  it('drops a year that is not a year', () => {
    assert.equal(pyqSelectionFromParams(() => 'banana').year, undefined);
    assert.equal(pyqSelectionFromParams(() => '').year, undefined);
  });
});

describe('a screen that cannot show everything says so', () => {
  it('admits the ceiling when the filter is wider than one screen', () => {
    // The whole HTET bank against a default page of 200: what the runner used
    // to present as the complete set.
    assert.deepEqual(pyqTruncation(861, 300, 300), { shown: 300, total: 861 });
  });

  it('stays quiet when the whole set is on screen', () => {
    assert.equal(pyqTruncation(30, 30, 300), null);
    assert.equal(pyqTruncation(0, 0, 300), null);
  });

  it('stays quiet while the count has not arrived', () => {
    assert.equal(pyqTruncation(undefined, 300, 300), null);
  });

  it('does not blame the ceiling for a list that never reached it', () => {
    // Count and list are two requests. A stale short list under a fresh larger
    // count is a race, not a truncation, and must not raise the warning.
    assert.equal(pyqTruncation(861, 42, 300), null);
  });
});

describe('an empty result names the filter that emptied it', () => {
  const model = (s: Parameters<typeof pyqFilterModel>[0]) => pyqFilterModel(s);

  it('blames the narrowest filter applied', () => {
    const selection = { examId: 'htet', paperId: 'htet-l1', subjectId: 'cdp', year: 2023, shift: '2' };
    assert.equal(pyqEmptyReason(selection, model(selection)).field, 'shift');
  });

  it('blames the year when no shift is chosen', () => {
    const selection = { examId: 'htet', paperId: 'htet-l1', subjectId: 'cdp', year: 2023 };
    const reason = pyqEmptyReason(selection, model(selection));
    assert.equal(reason.field, 'year');
    assert.match(reason.en, /2023/);
    assert.match(reason.hi, /2023/);
  });

  it('names the subject when only the subject is chosen', () => {
    const selection = { examId: 'htet', paperId: 'htet-l1', subjectId: 'cdp' };
    const reason = pyqEmptyReason(selection, model(selection));
    assert.equal(reason.field, 'subjectId');
    assert.match(reason.en, /Child Development/);
  });

  it('falls back to the paper, then to nothing at all', () => {
    const paperOnly = { examId: 'htet', paperId: 'htet-l1' };
    assert.equal(pyqEmptyReason(paperOnly, model(paperOnly)).field, 'paperId');
    assert.equal(pyqEmptyReason({}, model({})).field, 'none');
  });

  it('always says something in both languages', () => {
    const selection = { examId: 'htet', paperId: 'htet-l1', subjectId: 'cdp', year: 2023 };
    const reason = pyqEmptyReason(selection, model(selection));
    assert.ok(reason.en.length > 0);
    assert.match(reason.hi, /[ऀ-ॿ]/);
  });
});
