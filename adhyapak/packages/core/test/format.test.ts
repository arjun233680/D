import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { formatDate, revealsDuringPaper, testBriefing, timeAgo } from '../src/index.ts';

/**
 * Dates have to read the same everywhere they are rendered.
 *
 * The website is a static export: Node builds the HTML, Chromium renders it.
 * When the two disagree by even one character React discards the
 * server-rendered subtree and re-renders it, reporting hydration error #418.
 * That is what `toLocaleDateString('hi-IN', { month: 'short' })` did — Node 22
 * writes October as "अक्टू॰", Chromium writes "अक्तू॰" — and it broke every
 * page carrying an October date in Hindi, silently.
 */

describe('formatDate does not depend on the runtime', () => {
  // Deliberately spelled out. If a future change reaches for the platform's
  // locale data again, these are the values it has to keep producing, and
  // October is the one that caught it the first time.
  const EXPECTED_HI = [
    '15 जन॰ 2026', '15 फ़र॰ 2026', '15 मार्च 2026', '15 अप्रैल 2026',
    '15 मई 2026', '15 जून 2026', '15 जुल॰ 2026', '15 अग॰ 2026',
    '15 सित॰ 2026', '15 अक्टू॰ 2026', '15 नव॰ 2026', '15 दिस॰ 2026',
  ];
  const EXPECTED_EN = [
    '15 Jan 2026', '15 Feb 2026', '15 Mar 2026', '15 Apr 2026',
    '15 May 2026', '15 Jun 2026', '15 Jul 2026', '15 Aug 2026',
    '15 Sept 2026', '15 Oct 2026', '15 Nov 2026', '15 Dec 2026',
  ];

  for (let m = 0; m < 12; m++) {
    const iso = `2026-${String(m + 1).padStart(2, '0')}-15`;
    it(`formats ${iso} identically every time`, () => {
      assert.equal(formatDate(iso, 'hi'), EXPECTED_HI[m]);
      assert.equal(formatDate(iso, 'en'), EXPECTED_EN[m]);
    });
  }

  it('reads the date in UTC, so the day does not shift with the reader', () => {
    // A bare YYYY-MM-DD is midnight UTC. Read with local getters it would print
    // the previous day anywhere west of Greenwich — and print a different day
    // on the build machine than in the browser, which is the same bug again.
    assert.equal(formatDate('2026-08-16', 'en'), '16 Aug 2026');
    assert.equal(formatDate('2026-01-01', 'en'), '1 Jan 2026');
    assert.equal(formatDate('2026-12-31', 'en'), '31 Dec 2026');
  });

  it('hands back an unparseable date rather than inventing one', () => {
    assert.equal(formatDate('not a date', 'hi'), 'not a date');
    assert.equal(formatDate('', 'en'), '');
  });
});

describe('timeAgo takes its clock from the caller', () => {
  // The parameter is what lets a screen keep the server and the first client
  // render identical. Removing it would put the clock back inside render.
  const now = new Date('2026-08-16T12:00:00Z');

  it('reads a fixed instant the same way every time', () => {
    assert.equal(timeAgo('2026-08-16T11:59:30Z', 'en', now), 'just now');
    assert.equal(timeAgo('2026-08-16T11:30:00Z', 'en', now), '30m ago');
    assert.equal(timeAgo('2026-08-16T09:00:00Z', 'en', now), '3h ago');
    assert.equal(timeAgo('2026-08-11T12:00:00Z', 'en', now), '5d ago');
    assert.equal(timeAgo('2026-05-16T12:00:00Z', 'en', now), '3mo ago');
  });

  it('says the same things in Hindi', () => {
    assert.equal(timeAgo('2026-08-11T12:00:00Z', 'hi', now), '5 दिन पहले');
    assert.match(timeAgo('2026-08-16T09:00:00Z', 'hi', now), /[ऀ-ॿ]/);
  });

  it('never reports a future instant as negative time', () => {
    assert.equal(timeAgo('2026-09-01T00:00:00Z', 'en', now), 'just now');
  });
});

/* -------------------------------------------------------------- the guard */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    // `test` is skipped because nothing in it renders to a learner — and
    // because this very file has to name the call in order to forbid it.
    if (name === 'node_modules' || name === '.next' || name === '.expo' || name === 'dist') continue;
    if (name === 'test') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

describe('nothing formats a date from the platform’s locale data', () => {
  /**
   * `formatDate` is the only place allowed to turn a date into words, because
   * it is the only implementation that produces the same words in Node and in
   * the browser. Two screens had inlined `toLocaleDateString` instead and
   * carried the same hydration bug into the dashboards.
   *
   * `toLocaleString` on a *number* is not forbidden: Indian digit grouping —
   * 1,50,000 — was checked against both runtimes and they agree.
   */
  it('calls toLocaleDateString nowhere but in a comment explaining why not', () => {
    const offenders: string[] = [];
    for (const dir of ['apps', 'packages']) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
          if (!/toLocaleDateString|toLocaleTimeString/.test(line)) continue;
          // Prose about the rule is not a breach of it.
          if (/^\s*(\*|\/\/)/.test(line)) continue;
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      }
    }
    assert.deepEqual(offenders, [], 'use formatDate from @adhyapak/core');
  });

  it('is looking at real files', () => {
    assert.ok([...sourceFiles(join(ROOT, 'apps'))].length > 40, 'the walk found the sources');
  });
});

describe('the briefing reads the paper, never a screen', () => {
  /**
   * The instructions page is where a wrong number costs the most: somebody
   * plans two and a half hours around it. Every figure is therefore derived
   * from the test, and both apps read the same one.
   */
  const paper = {
    id: 't', title: { en: 'T', hi: 'T' }, examId: 'htet', type: 'mock' as const,
    durationMinutes: 150, marksPerQuestion: 1, negativeMarking: 0,
    access: 'free' as const, instructions: [],
    sections: [
      { id: 's1', name: { en: 'CDP', hi: 'सीडीपी' }, subjectId: 'cdp', questionIds: ['a', 'b', 'c'] },
      { id: 's2', name: { en: 'Language', hi: 'भाषा' }, subjectId: 'hindi', questionIds: ['d', 'e'] },
    ],
  };

  it('counts the questions and marks off the sections', () => {
    const b = testBriefing(paper);
    assert.equal(b.questionCount, 5);
    assert.equal(b.maxMarks, 5);
    assert.equal(b.durationMinutes, 150);
    assert.deepEqual(
      b.sections.map((s) => [s.name.en, s.questionCount]),
      [['CDP', 3], ['Language', 2]],
    );
  });

  it('multiplies by the marks the paper actually carries', () => {
    // A paper worth 2 a question is 10 marks, not 5 — the figure a candidate
    // divides their target by.
    assert.equal(testBriefing({ ...paper, marksPerQuestion: 2 }).maxMarks, 10);
  });

  it('keeps the two solution modes apart', () => {
    // The whole point of the choice: only one of them shows anything mid-paper.
    assert.equal(revealsDuringPaper('guided'), true);
    assert.equal(revealsDuringPaper('exam'), false);
  });
});
