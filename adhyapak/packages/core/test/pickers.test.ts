import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
const HTET_TGT = [
  'science', 'math', 'music', 'hindi', 'english', 'home-science',
  'sanskrit', 'sst', 'art', 'punjabi', 'physical-education', 'urdu',
];

import {
  CHIP_LIMIT,
  electivePickerItems,
  examFixedSubjects,
  GRID_LIMIT,
  examPickerGroups,
  filterPickerItems,
  matchesQuery,
  pickerLayout,
  pinFirst,
  subjectPickerItems,
} from '../src/engine/pickers';

/**
 * The rule that decides how a list of choices is shown.
 *
 * Everything used to be a sideways-scrolling chip row, which works for three
 * posts and fails for twenty-one PGT subjects — most of the list sits off the
 * right edge with nothing saying how much is there. What is tested here is the
 * boundary, because the real sizes in this app sit on both sides of it.
 */

describe('how many choices decides how they are shown', () => {
  it('uses chips for the small lists', () => {
    assert.equal(pickerLayout(2), 'chips', 'PRT / TGT');
    assert.equal(pickerLayout(CHIP_LIMIT), 'chips');
  });

  it('switches to a grid before a row would need scrolling', () => {
    assert.equal(pickerLayout(CHIP_LIMIT + 1), 'grid');
    assert.equal(pickerLayout(12), 'grid', 'HTET TGT subjects');
    assert.equal(pickerLayout(21), 'grid', 'HTET PGT subjects');
    assert.equal(pickerLayout(GRID_LIMIT), 'grid');
  });

  it('switches to search when a grid would be a wall', () => {
    assert.equal(pickerLayout(GRID_LIMIT + 1), 'search');
    assert.equal(pickerLayout(28), 'search', 'every exam');
  });
});

describe('searching finds the same thing in either language', () => {
  it('matches on the Hindi name and the English one', () => {
    assert.equal(matchesQuery('math', 'Mathematics', 'गणित'), true);
    assert.equal(matchesQuery('गणित', 'Mathematics', 'गणित'), true);
  });

  it('ignores case and surrounding space', () => {
    assert.equal(matchesQuery('  CTET ', 'ctet'), true);
  });

  it('matches everything when nothing was typed', () => {
    assert.equal(matchesQuery('', 'anything'), true);
  });

  it('does not match what is not there', () => {
    assert.equal(matchesQuery('physics', 'Mathematics', 'गणित'), false);
  });
});

describe('the exam picker', () => {
  it('puts national before state', () => {
    const groups = examPickerGroups('', 'en');
    assert.equal(groups[0]?.title.en, 'National');
    assert.equal(groups[1]?.title.en, 'State');
  });

  it('narrows to what was typed, and drops a group that empties', () => {
    const groups = examPickerGroups('htet', 'en');
    const values = groups.flatMap((g) => g.items.map((i) => i.value));
    assert.ok(values.includes('htet'));
    assert.ok(!values.includes('ctet'));
    assert.ok(
      groups.every((g) => g.items.length > 0),
      'an empty heading with nothing under it is worse than no heading',
    );
  });

  it('finds a state exam by its state rather than its acronym', () => {
    // Somebody in Kerala does not necessarily know the test is called KTET.
    const values = examPickerGroups('kerala', 'en').flatMap((g) => g.items.map((i) => i.value));
    assert.ok(values.includes('ktet'));
  });

  it('carries a hint, so an acronym is not the only thing on the row', () => {
    const ctet = examPickerGroups('ctet', 'en')[0]?.items[0];
    assert.equal(ctet?.labelEn, 'CTET');
    assert.match(ctet?.hintEn ?? '', /Central Teacher Eligibility Test/);
  });
});

describe('subject items keep the order the board gave them', () => {
  it('does not re-sort alphabetically', () => {
    const items = subjectPickerItems(['science', 'math', 'art']);
    assert.deepEqual(
      items.map((i) => i.value),
      ['science', 'math', 'art'],
      'Art above Science would contradict the paper it came from',
    );
  });

  it('drops an id no subject exists for, rather than rendering a blank tile', () => {
    assert.equal(subjectPickerItems(['science', 'not-a-subject']).length, 1);
  });

  it('filters without reordering', () => {
    const items = subjectPickerItems(['science', 'math', 'sanskrit']);
    assert.deepEqual(
      filterPickerItems(items, 'san').map((i) => i.value),
      ['sanskrit'],
    );
  });
});

describe('pinning the likely answers', () => {
  const items = subjectPickerItems(['hindi', 'english', 'gujarati', 'math']);

  it('moves them to the front in the order given', () => {
    assert.deepEqual(
      pinFirst(items, ['gujarati', 'english']).map((i) => i.value),
      ['gujarati', 'english', 'hindi', 'math'],
    );
  });

  it('keeps everything else, because an unusual case still has to be answerable', () => {
    assert.equal(pinFirst(items, ['gujarati']).length, items.length);
  });

  it('ignores a pin that is not in the list', () => {
    assert.deepEqual(
      pinFirst(items, ['telugu']).map((i) => i.value),
      items.map((i) => i.value),
    );
  });
});

describe('an elective list puts this exam’s own languages first', () => {
  it('pins Punjabi for a Punjab exam', () => {
    // PSTET's Language I is Punjabi, so a candidate choosing a TGT subject
    // should not scroll past eleven others to reach it.
    const order = electivePickerItems(HTET_TGT, 'pstet').map((i) => i.value);
    assert.equal(order[0], 'punjabi');
    assert.ok(order.indexOf('english') < order.indexOf('science'));
  });

  it('pins Hindi for a Hindi-belt exam', () => {
    const order = electivePickerItems(HTET_TGT, 'utet').map((i) => i.value);
    assert.ok(order.indexOf('hindi') < order.indexOf('science'));
  });

  it('drops nothing — an unusual choice still has to be reachable', () => {
    const order = electivePickerItems(HTET_TGT, 'pstet');
    assert.equal(order.length, HTET_TGT.length);
  });

  it('leaves the board’s order alone when the exam pins nothing', () => {
    assert.deepEqual(
      electivePickerItems(['science', 'math'], undefined).map((i) => i.value),
      ['science', 'math'],
    );
  });

  it('reads the blueprint rather than a state-to-language map', () => {
    // Gujarat TET's Language I is Gujarati, and nothing in this module names
    // Gujarat or Gujarati — it comes out of the paper's own fixed sections.
    assert.ok(examFixedSubjects('gtet').includes('gujarati'));
    assert.ok(!examFixedSubjects('gtet').includes('telugu'));
  });
});
