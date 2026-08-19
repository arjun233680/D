import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { examSubtitle, filterExamsForChooser, type Exam } from '../src/index.ts';

/**
 * The exam chooser's two pure decisions.
 *
 * Everything else on that screen comes from the database and is checked by
 * looking at it. These two are judgements made in code — which tab an exam
 * belongs to, and which column spells its acronym out — and both have a wrong
 * answer that looks fine until you meet the row that breaks it.
 */

const exam = (over: Partial<Exam> & Pick<Exam, 'id' | 'shortName'>): Exam => ({
  slug: over.id,
  name: { en: over.shortName, hi: over.shortName },
  authority: { en: 'Some Board', hi: 'कोई बोर्ड' },
  scope: 'state',
  about: { en: '', hi: '' },
  frequency: { en: '', hi: '' },
  papers: [],
  color: '#000000',
  emoji: '📘',
  eligibility: [],
  highlights: [],
  officialSite: '',
  updates: [],
  sources: [],
  ...over,
});

const CTET = exam({
  id: 'ctet',
  shortName: 'CTET',
  scope: 'national',
  featured: true,
  name: {
    en: 'CTET — Central Teacher Eligibility Test',
    hi: 'CTET — केंद्रीय शिक्षक पात्रता परीक्षा',
  },
  authority: { en: 'Central Board of Secondary Education (CBSE)', hi: 'केंद्रीय माध्यमिक शिक्षा बोर्ड' },
});

const KVS = exam({
  id: 'kvs',
  shortName: 'KVS',
  scope: 'national',
  featured: true,
  name: { en: 'KVS PRT / TGT / PGT', hi: 'KVS PRT / TGT / PGT' },
  authority: { en: 'Kendriya Vidyalaya Sangathan', hi: 'केंद्रीय विद्यालय संगठन' },
});

const HTET = exam({
  id: 'htet',
  shortName: 'HTET',
  featured: true,
  name: {
    en: 'HTET — Haryana Teacher Eligibility Test',
    hi: 'HTET — हरियाणा शिक्षक पात्रता परीक्षा',
  },
  state: { en: 'Haryana', hi: 'हरियाणा' },
});

const APTET = exam({
  id: 'aptet',
  shortName: 'AP TET',
  name: { en: 'AP TET — Andhra Pradesh Teacher Eligibility Test', hi: 'AP TET' },
  state: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' },
});

const ALL = [CTET, KVS, HTET, APTET];

describe('which exams a chooser tab shows', () => {
  it('shows everything under All', () => {
    assert.equal(filterExamsForChooser(ALL, 'all', '').length, 4);
  });

  it('splits centre from state by scope', () => {
    const centre = filterExamsForChooser(ALL, 'centre', '').map((e) => e.id);
    const state = filterExamsForChooser(ALL, 'state', '').map((e) => e.id);
    assert.deepEqual(centre, ['ctet', 'kvs']);
    assert.deepEqual(state, ['htet', 'aptet']);
  });

  it('shows only the headlined exams under Important', () => {
    assert.deepEqual(
      filterExamsForChooser(ALL, 'important', '').map((e) => e.id),
      ['ctet', 'kvs', 'htet'],
    );
  });

  /*
   * The order is the database's. Re-sorting inside a tab would mean the same
   * exam sat in a different place depending on which tab you arrived through.
   */
  it('keeps the order it was given rather than re-sorting', () => {
    const reversed = [...ALL].reverse();
    assert.deepEqual(
      filterExamsForChooser(reversed, 'all', '').map((e) => e.id),
      ['aptet', 'htet', 'kvs', 'ctet'],
    );
  });

  /*
   * Nobody types "HTET" when they are looking for their state's test — they
   * type where they live. The state is searched for exactly this reason, and
   * no short name here contains the word.
   */
  it('finds an exam by its state, not only by its short name', () => {
    assert.deepEqual(
      filterExamsForChooser(ALL, 'all', 'haryana').map((e) => e.id),
      ['htet'],
    );
  });

  it('searches both languages', () => {
    assert.deepEqual(
      filterExamsForChooser(ALL, 'all', 'हरियाणा').map((e) => e.id),
      ['htet'],
    );
  });

  it('narrows within the chosen tab rather than escaping it', () => {
    // Andhra is a state exam, so a centre search for it finds nothing.
    assert.deepEqual(filterExamsForChooser(ALL, 'centre', 'andhra'), []);
  });
});

describe('spelling an exam acronym out', () => {
  it('takes the words after the dash when the name has them', () => {
    assert.equal(examSubtitle(CTET, 'en'), 'Central Teacher Eligibility Test');
    assert.equal(examSubtitle(CTET, 'hi'), 'केंद्रीय शिक्षक पात्रता परीक्षा');
  });

  /*
   * The failure this rule exists to avoid. KVS's name is a list of posts, so
   * stripping a prefix would put "PRT / TGT / PGT" under the heading KVS —
   * three more acronyms in place of the expansion the card is there to give.
   */
  it('falls back to the authority when the name is a list of posts', () => {
    assert.equal(examSubtitle(KVS, 'en'), 'Kendriya Vidyalaya Sangathan');
    assert.equal(examSubtitle(KVS, 'hi'), 'केंद्रीय विद्यालय संगठन');
  });

  it('never returns an empty line', () => {
    const trailingDash = exam({
      id: 'odd',
      shortName: 'ODD',
      name: { en: 'ODD —', hi: 'ODD —' },
      authority: { en: 'Some Board', hi: 'कोई बोर्ड' },
    });
    assert.equal(examSubtitle(trailingDash, 'en'), 'Some Board');
  });
});
