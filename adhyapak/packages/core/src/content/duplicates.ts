import type { Bilingual, MaybeBilingual } from '../types';
import type { ContentQuestion, PyqRef } from './types';

/**
 * Duplicate detection.
 *
 * A real question bank is assembled from many sources — one file per year, one
 * per contributor, the same paper typed twice — so the same question arrives
 * repeatedly with cosmetic differences: curly quotes, a trailing full stop,
 * "Which of the following" versus "Which of  the  following", a Devanagari
 * danda instead of a period.
 *
 * A fingerprint over the *normalised* question text catches those. It is
 * deliberately conservative: it never merges or deletes anything, and it never
 * treats two questions as the same just because they sit in the same topic. A
 * false positive costs an educator one glance; a false negative puts the same
 * question in front of a learner twice, and a wrong merge destroys a question.
 */

/**
 * Reduces a question to the characters that carry meaning.
 *
 * Case, punctuation, quote style and whitespace all vary between typists and
 * none of them change what is being asked. Devanagari is left intact — Hindi
 * has no case to fold, and stripping its marks would collide distinct
 * questions.
 */
export const normaliseText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKC')
    // Curly quotes, dashes and the danda are typographic noise.
    .replace(/[‘’‚‛′‵]/g, "'")
    .replace(/[“”„‟″‶]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[।॥]/g, '.')
    // Anything that is not a letter, a digit or a space carries no meaning here.
    // `\p{M}` is not optional: Devanagari vowel signs are combining marks, not
    // letters, so leaving it out silently reduces पियाजे to "प य ज" and makes
    // every Hindi question with the same consonant skeleton look like the same
    // question. Hindi is the primary language here — that is not a rounding
    // error, it is the fingerprint failing at its one job.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The key two copies of one question share.
 *
 * Both languages participate: a bank that carries only Hindi still fingerprints,
 * and a question whose English matches but whose Hindi differs is a different
 * question — usually a translation fix worth seeing, not a duplicate to hide.
 *
 * The halves are joined with U+001F rather than concatenated, so a question
 * ending where the next begins cannot collide. It is written as an escape on
 * purpose: this file used to carry the character literally, which made the
 * separator invisible in every editor, grep and diff — and hid a real
 * mismatch with the SQL mirror of this function until a parity test caught it.
 */
const FIELD_SEPARATOR = '\u001F';

export const fingerprint = (text: MaybeBilingual): string => {
  const en = normaliseText(text.en ?? '');
  const hi = normaliseText(text.hi ?? '');
  return `${en}${FIELD_SEPARATOR}${hi}`;
};

/** How confident the match is, and why — shown to the educator, never acted on. */
export type DuplicateConfidence = 'exact' | 'likely';

export interface DuplicateMatch {
  /** Row or question being examined. */
  id: string;
  /** What it collides with — an id already in the library, or a row in this file. */
  matchesId: string;
  /** 'file' when both are in the upload; 'library' when one is already stored. */
  scope: 'file' | 'library';
  confidence: DuplicateConfidence;
  reason: string;
}

const samePaper = (a: PyqRef | undefined, b: PyqRef | undefined): boolean =>
  Boolean(
    a &&
      b &&
      a.examId === b.examId &&
      a.year === b.year &&
      (a.paperLabel ?? '') === (b.paperLabel ?? '') &&
      (a.shift ?? '') === (b.shift ?? ''),
  );

/**
 * Finds questions that look like copies of each other.
 *
 * `existing` is what the library already holds — the caller fetches the
 * fingerprints it cares about rather than the whole bank, so this stays a pure
 * function and a 20,000-row file never has to be compared against 20,000 rows
 * in the browser.
 *
 * Nothing is removed. The result is a list of observations for a human.
 */
export function findDuplicates(
  rows: ContentQuestion[],
  existing: { id: string; fingerprint: string; pyq?: PyqRef }[] = [],
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  const library = new Map<string, { id: string; pyq?: PyqRef }[]>();
  for (const row of existing) {
    const bucket = library.get(row.fingerprint) ?? [];
    bucket.push({ id: row.id, pyq: row.pyq });
    library.set(row.fingerprint, bucket);
  }

  const seenInFile = new Map<string, { id: string; pyq?: PyqRef }>();

  for (const row of rows) {
    const key = fingerprint(row.text);
    // An empty question is a validation problem, not a duplicate one.
    if (key === '') continue;

    const earlier = seenInFile.get(key);
    if (earlier) {
      matches.push({
        id: row.id,
        matchesId: earlier.id,
        scope: 'file',
        confidence: samePaper(row.pyq, earlier.pyq) ? 'exact' : 'likely',
        reason: samePaper(row.pyq, earlier.pyq)
          ? 'Same question text and same paper as an earlier row in this file'
          : 'Same question text as an earlier row in this file',
      });
    } else {
      seenInFile.set(key, { id: row.id, pyq: row.pyq });
    }

    for (const hit of library.get(key) ?? []) {
      matches.push({
        id: row.id,
        matchesId: hit.id,
        scope: 'library',
        confidence: samePaper(row.pyq, hit.pyq) ? 'exact' : 'likely',
        reason: samePaper(row.pyq, hit.pyq)
          ? 'Already in the library, from the same paper'
          : 'Already in the library',
      });
    }
  }

  return matches;
}

/* --------------------------------------------------------------- guessing */

/**
 * The nearest known id to something a contributor typed.
 *
 * An import that says only `Unknown subject "chemsitry"` leaves the educator to
 * find the right spelling themselves, across a file with 4,000 rows. Suggesting
 * `chemistry` turns that into one keystroke.
 *
 * Levenshtein distance over a short list of ids — the candidate lists here are
 * dozens of entries, not thousands, so the simple algorithm is the right one.
 */
export function nearest(value: string, candidates: string[], maxDistance = 3): string | undefined {
  const needle = normaliseText(value).replace(/\s/g, '');
  if (!needle) return undefined;

  let best: { id: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const hay = normaliseText(candidate).replace(/\s/g, '');
    if (hay === needle) return candidate;
    const distance = editDistance(needle, hay);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { id: candidate, distance };
    }
  }
  return best?.id;
}

/** Classic two-row Levenshtein. Bounded input, so the simple version is enough. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1]! + 1, // insertion
        previous[j]! + 1, // deletion
        previous[j - 1]! + cost, // substitution
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length]!;
}
