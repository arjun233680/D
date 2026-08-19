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

/**
 * The subjects an exam's own papers already examine, in blueprint order.
 *
 * Used to pin the likely answers to the front of a long elective list. Language
 * I is the state's own language, so a Punjab candidate choosing a TGT subject
 * should find Punjabi without scrolling past eleven others, and a Gujarat one
 * should find Gujarati. It reads the blueprint rather than a hand-written map
 * of state to language, because the blueprint is where that fact already lives
 * and a second copy would be a second thing to keep correct.
 *
 * Only the fixed blocks count. An elective's own choices are the list being
 * ordered, so pinning them by themselves would pin everything.
 */
export const examFixedSubjects = (examId: string | undefined): string[] => {
  if (!examId) return [];
  const exam = EXAMS.find((e) => e.id === examId);
  if (!exam) return [];
  const ids: string[] = [];
  for (const paper of exam.papers) {
    for (const section of paper.sections) {
      if (section.subjectId && !ids.includes(section.subjectId)) ids.push(section.subjectId);
    }
  }
  return ids;
};

/**
 * An elective list with this exam's own languages first.
 *
 * The pinned ones are whichever of the exam's fixed subjects the group actually
 * offers — for PSTET's TGT list that is Punjabi and English, for Gujarat's it is
 * Gujarati and English. Everything else follows in the order the board gave it,
 * and nothing is dropped.
 */
export const electivePickerItems = (
  choices: readonly string[],
  examId?: string,
): PickerItem[] => {
  const items = subjectPickerItems(choices);
  return pinFirst(items, examFixedSubjects(examId));
};

/* ------------------------------------------------------------ exam chooser */

/**
 * The tabs above the exam chooser's grid.
 *
 * `centre` rather than `national` because that is the word on the screen and
 * the word an aspirant uses — "centre ki exam". The scope stored in the
 * database stays `national`; this type is the reader's vocabulary, and the
 * mapping between the two lives in one place below.
 */
export type ExamChooserFilter = 'all' | 'centre' | 'state' | 'important';

export const EXAM_CHOOSER_FILTERS: readonly ExamChooserFilter[] = [
  'all',
  'centre',
  'state',
  'important',
];

/**
 * The exams a chooser tab should show, in the order the database gave them.
 *
 * Deliberately does not re-sort. `listExams` already returns `sort_order` then
 * short name, and sorting again here would mean the grid's order depended on
 * which tab you arrived through — the same exam sitting in a different place
 * under "All" than under "State" is exactly the kind of thing that makes a list
 * feel untrustworthy.
 *
 * The search runs over both languages, the short name and the state, so
 * "Haryana" finds HTET and HSSC without either of them carrying the word in its
 * short name.
 */
export const filterExamsForChooser = (
  exams: readonly Exam[],
  filter: ExamChooserFilter,
  query: string,
): Exam[] =>
  exams.filter((e) => {
    const inTab =
      filter === 'all' ||
      (filter === 'centre' && e.scope === 'national') ||
      (filter === 'state' && e.scope === 'state') ||
      (filter === 'important' && e.featured === true);
    if (!inTab) return false;
    return matchesQuery(query, e.shortName, e.name.en, e.name.hi, e.state?.en, e.state?.hi);
  });

/**
 * The line under an exam's short name in the chooser.
 *
 * What a card wants is the acronym spelled out, and where that lives differs by
 * row. Most exam names are written "SHORT — the words it stands for", so the
 * half after the dash is exactly it. The recruitment exams are not: KVS's name
 * is "KVS PRT / TGT / PGT", which is a list of posts rather than an expansion,
 * and the words a candidate would recognise are the body's — Kendriya Vidyalaya
 * Sangathan. So: the tail of the name when there is a dash, the authority
 * otherwise.
 *
 * The em dash is the separator every seeded row uses. A hyphen is not accepted
 * on purpose — "HSSC TGT / PGT / PRT — Haryana" would split at the wrong place
 * if any hyphen counted.
 */
export const examSubtitle = (exam: Exam, lang: 'en' | 'hi'): string => {
  const name = lang === 'hi' ? exam.name.hi : exam.name.en;
  const dash = name.indexOf('—');
  if (dash !== -1) {
    const tail = name.slice(dash + 1).trim();
    if (tail) return tail;
  }
  return lang === 'hi' ? exam.authority.hi : exam.authority.en;
};
