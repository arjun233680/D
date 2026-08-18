import type { Bilingual, Exam } from '../types';
import { EXAMS } from '../data/exams';
import { getSubject } from '../data/subjects';

/**
 * How a list of choices should be shown.
 *
 * The app asks the learner to pick from lists of wildly different sizes — three
 * posts, twelve TGT subjects, twenty-one PGT subjects, twenty-eight exams,
 * twenty-odd languages — and it was showing all of them the same way: a row of
 * chips that scrolls sideways. That works for three and fails for everything
 * else. A horizontally scrolling row hides most of its contents off the right
 * edge with no indication of how many are there, so a candidate looking for
 * Sanskrit among twenty-one PGT subjects has to drag through the list to find
 * out whether it is even offered.
 *
 * The rule is about count, not about what the list contains:
 *
 *   up to 5   — chips. Everything is visible at once; a row is the cheapest
 *               thing to scan and to tap.
 *   6 to 24   — a grid that wraps. Still everything at once, two or three
 *               columns deep, no sideways scrolling.
 *   over 24   — a search box and a grouped list. At this size finding beats
 *               browsing, and grouping is what makes the browse still work for
 *               somebody who does not know what to type.
 */
export type PickerLayout = 'chips' | 'grid' | 'search';

export const CHIP_LIMIT = 5;
export const GRID_LIMIT = 24;

export const pickerLayout = (count: number): PickerLayout =>
  count <= CHIP_LIMIT ? 'chips' : count <= GRID_LIMIT ? 'grid' : 'search';

/**
 * Whether a haystack matches what somebody typed.
 *
 * Both languages and the short name are searched, because a Hindi reader types
 * "गणित" and the same person types "math" ten seconds later, and neither should
 * come back empty. Case and surrounding space are ignored; nothing cleverer is
 * attempted, because a fuzzy match on a list this size finds things the learner
 * did not ask for and hides the one they did.
 */
export const matchesQuery = (query: string, ...haystack: (string | undefined)[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => (h ?? '').toLowerCase().includes(q));
};

/** One entry in a searchable, grouped picker. */
export interface PickerItem {
  value: string;
  labelEn: string;
  labelHi: string;
  /** Shown under the label — the exam's full name, a language's script. */
  hintEn?: string;
  hintHi?: string;
  icon?: string;
}

export interface PickerGroup {
  title: Bilingual;
  items: PickerItem[];
}

const examItem = (exam: Exam): PickerItem => ({
  value: exam.id,
  labelEn: exam.shortName,
  labelHi: exam.shortName,
  hintEn: exam.name.en,
  hintHi: exam.name.hi,
  icon: exam.emoji,
});

/**
 * The twenty-eight exams, grouped and filtered.
 *
 * National first because CTET is what most people are looking for and it is one
 * row rather than twenty-three. The state tests are alphabetical by their short
 * name in whichever language is being read — a Hindi reader scanning for
 * "बिहार" is not helped by an order built from English spellings.
 */
export const examPickerGroups = (query: string, lang: 'en' | 'hi'): PickerGroup[] => {
  const matches = (e: Exam) =>
    matchesQuery(query, e.shortName, e.name.en, e.name.hi, e.state?.en, e.state?.hi);

  const byName = (a: Exam, b: Exam) =>
    a.shortName.localeCompare(b.shortName, lang === 'hi' ? 'hi' : 'en');

  const national = EXAMS.filter((e) => e.scope === 'national' && matches(e)).sort(byName);
  const state = EXAMS.filter((e) => e.scope === 'state' && matches(e)).sort(byName);

  return [
    { title: { en: 'National', hi: 'राष्ट्रीय' }, items: national.map(examItem) },
    { title: { en: 'State', hi: 'राज्य' }, items: state.map(examItem) },
  ].filter((g) => g.items.length > 0);
};

/**
 * Subjects as picker items, in the order the group offers them.
 *
 * The order is the blueprint's, not alphabetical: an elective group lists its
 * subjects the way the board lists them, and re-sorting would put Art above
 * Science on a paper whose own notification does the opposite.
 */
export const subjectPickerItems = (subjectIds: readonly string[]): PickerItem[] =>
  subjectIds
    .map((id): PickerItem | undefined => {
      const subject = getSubject(id);
      return subject
        ? { value: id, labelEn: subject.name.en, labelHi: subject.name.hi, icon: subject.icon }
        : undefined;
    })
    .filter((i): i is PickerItem => i !== undefined);

/**
 * Filters picker items by a query, keeping their order.
 *
 * Used by the grid and search layouts alike: a twelve-item grid does not show a
 * search box, but the same function serves a twenty-one-item one that does.
 */
export const filterPickerItems = (items: PickerItem[], query: string): PickerItem[] =>
  items.filter((i) => matchesQuery(query, i.labelEn, i.labelHi, i.hintEn, i.hintHi));

/**
 * Moves the likely answers to the front of a long list.
 *
 * Language I is the state's own language, so a Gujarat TET candidate should
 * find Gujarati without typing and without scrolling past nineteen others. The
 * pinned ones keep their given order; the rest follow in theirs, and nothing is
 * removed — a list that hid the unlikely options would be a list that cannot
 * answer an unusual case.
 */
export const pinFirst = (items: PickerItem[], pinned: readonly string[]): PickerItem[] => {
  const first = pinned
    .map((id) => items.find((i) => i.value === id))
    .filter((i): i is PickerItem => i !== undefined);
  const rest = items.filter((i) => !pinned.includes(i.value));
  return [...first, ...rest];
};
