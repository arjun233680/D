import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { GUEST_USER, currentStreak } from '../src/index.ts';

/**
 * Who the apps think you are before you tell them.
 *
 * Both stores seed their state with a bundled `User`, so whatever is in that
 * value is what a first-time install renders: the name in the header, the
 * streak flame, the bookmark count, the batches on the Batches page. It used to
 * be `DEMO_USER` — named Arjun, carrying a real email address in a public
 * repository, with a twelve-day streak and an enrolment nobody had made.
 *
 * These are value assertions rather than a source scan because the failure mode
 * is a plausible-looking field being filled in, not an import appearing. The
 * guard has to fail on `name: 'Arjun'`, and a scan for imports would not.
 */

describe('the signed-out learner claims nothing', () => {
  it('has no contact details', () => {
    // The specific regression: a real person's address shipped in the bundle.
    assert.equal(GUEST_USER.email, undefined);
    assert.equal(GUEST_USER.phone, undefined);
  });

  it('has no identity of its own', () => {
    assert.equal(GUEST_USER.name, '', 'a seeded name is somebody else’s name');
    assert.equal(GUEST_USER.id, '');
    assert.equal(GUEST_USER.joinedAt, '', 'nobody has joined yet');
    assert.equal(GUEST_USER.state, undefined);
  });

  it('has no goal, which is what routes a new account to the picker', () => {
    assert.equal(GUEST_USER.goalExamId, '');
    assert.equal(GUEST_USER.targetPaperId, undefined);
    assert.equal(GUEST_USER.electiveSubjectId, undefined);
    assert.equal(GUEST_USER.onboarded, false);
    assert.equal(GUEST_USER.signedIn, false);
  });

  it('has no progress', () => {
    assert.deepEqual(GUEST_USER.activeDates, []);
    assert.deepEqual(GUEST_USER.bookmarkedQuestionIds, []);
    assert.deepEqual(GUEST_USER.savedNoteIds, []);
    assert.deepEqual(GUEST_USER.enrolledBatchIds, []);
    assert.equal(GUEST_USER.streakDays, 0);
  });

  it('agrees with the engine that renders it', () => {
    // The old seed disagreed with itself: it declared `streakDays: 12` while
    // `currentStreak` counted consecutive days ending *today*, so the twelve
    // dates went stale and the flame the learner saw dropped to zero on its own.
    assert.equal(currentStreak(GUEST_USER.activeDates), GUEST_USER.streakDays);
  });
});

/* -------------------------------------------------------------- the guard */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.expo' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

describe('no personal contact detail is compiled into the apps', () => {
  /**
   * The repository is public. An email address in a bundled seed is published
   * the moment it is pushed, and it stays in the deployed JavaScript after the
   * source is fixed. This is cheap enough to run over every source file.
   */
  it('has no email address in any source file', () => {
    const offenders: string[] = [];
    for (const dir of ['apps', 'packages']) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const source = readFileSync(file, 'utf8');
        // Deliberately narrow: real addresses in string literals. `example.com`
        // is what the tests themselves use and is not anybody's inbox.
        const found = source.match(/['"][\w.+-]+@[\w-]+\.[\w.]+['"]/g) ?? [];
        for (const hit of found) {
          if (/@example\.(com|org)|@adhyapak\b/.test(hit)) continue;
          offenders.push(`${relative(ROOT, file)}: ${hit}`);
        }
      }
    }
    assert.deepEqual(offenders, [], 'use example.com in fixtures, never a real address');
  });

  it('is looking at real files', () => {
    assert.ok([...sourceFiles(join(ROOT, 'apps'))].length > 40, 'the walk found the sources');
  });
});
