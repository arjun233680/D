import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTopic } from '../src/data/subjects';
import {
  QUESTIONS,
  buildPracticeSet,
  countQuestions,
  fetchNote,
  getCurrentUser,
  isBackendConfigured,
  listNotes,
  listPyqYears,
  listQuestions,
  listTests,
  listTopicFrequency,
  setGoalRemote,
  toggleBookmarkRemote,
  toggleEnrolmentRemote,
  toggleSavedNoteRemote,
  updateProfileRemote,
} from '../src/index.ts';

/**
 * The repository is the boundary the whole app now goes through, so what is
 * tested here is the contract screens rely on: the same shape comes back
 * whether or not a backend is configured, filters compose, and nothing
 * unpublished can arrive.
 *
 * With no credentials in the environment every call takes the offline branch,
 * which is exactly the path an aspirant on a dead connection gets — so these
 * also cover the fallback. The published-only rule against a live database is
 * proved separately, in SQL, because it is enforced by RLS and by
 * `set_question_status`, not by TypeScript.
 */

describe('offline fallback', () => {
  it('runs offline when no backend is configured', () => {
    assert.equal(isBackendConfigured(), false, 'test env must have no credentials');
  });

  it('returns an empty bank rather than throwing, now that there is no bundle', async () => {
    // The 67 bundled questions went with 0011. Offline is therefore an empty
    // bank, and the contract that matters is that every screen gets a list back
    // rather than an exception — the empty states already exist for the
    // "no database configured" case this is indistinguishable from.
    const questions = await listQuestions({ limit: 5 });
    assert.deepEqual(questions, []);
  });

  it('returns tests and notes rather than throwing', async () => {
    assert.ok((await listTests()).length > 0);
    assert.ok((await listNotes()).length > 0);
  });

  it('reports no PYQ years and no frequency offline, instead of inventing them', async () => {
    // The bundled bank records provenance as prose. Parsing it back into years
    // would be guessing, so the honest answer is "none".
    assert.deepEqual(await listPyqYears('ctet'), []);
    assert.deepEqual(await listTopicFrequency('ctet'), []);
  });
});

describe('filters compose', () => {
  // These used to answer each filter against the bundled bank. With the bundle
  // gone the offline branch has nothing to narrow, so what is still worth
  // asserting here is that every filter combination is accepted and comes back
  // as a list — the shape screens destructure — rather than throwing. The
  // filters themselves are now proved against the database, in SQL: they are
  // `where` clauses and RLS, not TypeScript.
  const FILTERS = [
    { subjectId: 'cdp' },
    { topicId: 'cdp-piaget' },
    { examId: 'ctet' },
    { difficulty: 'easy' as const },
    { paperId: 'ctet-paper-1' },
    { subjectId: 'cdp', difficulty: 'medium' as const },
    { pyqOnly: true },
    { year: 2024 },
  ];

  for (const filter of FILTERS) {
    it(`accepts ${JSON.stringify(filter)} and returns a list`, async () => {
      const list = await listQuestions(filter);
      assert.ok(Array.isArray(list));
    });
  }

  it('returns an empty list for a filter nothing matches', async () => {
    const list = await listQuestions({ topicId: 'no-such-topic' });
    assert.deepEqual(list, [], 'an empty result is a value, not an error');
  });

  it('honours limit and offset without throwing on an empty bank', () => {
    // Paging is a `range()` on the query now, so what it does to a large bank
    // is a database fact. Offline there is nothing to page, and the contract
    // that survives is that asking for a page is still safe.
    return Promise.all([
      listQuestions({ limit: 5 }),
      listQuestions({ limit: 5, offset: 5 }),
    ]).then(([first, second]) => {
      assert.deepEqual(first, []);
      assert.deepEqual(second, []);
    });
  });

  it('counts without fetching the questions', async () => {
    const count = await countQuestions({ subjectId: 'cdp' });
    const list = await listQuestions({ subjectId: 'cdp' });
    assert.equal(count, list.length);
  });
});

describe('notes', () => {
  it('narrows by subject', async () => {
    const list = await listNotes({ subjectId: 'cdp' });
    assert.ok(list.every((n) => n.subjectId === 'cdp'));
  });

  it('fetches one note by id, and null for one that does not exist', async () => {
    const all = await listNotes();
    const one = await fetchNote(all[0]!.id);
    assert.equal(one?.id, all[0]!.id);
    assert.equal(await fetchNote('no-such-note'), null);
  });
});

describe('the offline path matches the practice engine', () => {
  it('listQuestions and buildPracticeSet agree, so behaviour does not change with connectivity', async () => {
    const viaRepository = await listQuestions({ subjectId: 'cdp', limit: 10 });
    const direct = buildPracticeSet({ subjectId: 'cdp', limit: 10 });
    assert.deepEqual(
      viaRepository.map((q) => q.id),
      direct.map((q) => q.id),
    );
  });
});

describe("the learner's own record, with nothing to write to", () => {
  /**
   * These are the writes that used to not exist: a goal, a language, a
   * bookmark and an enrolment all lived in `localStorage` and nowhere else, so
   * signing in on a second phone produced a stranger with an empty streak.
   *
   * Offline they must not throw and must not claim success. The store applies
   * the change locally first and reads the boolean to decide whether it is
   * still only local — a `true` here would tell it the write had landed in
   * Postgres, and the retry that would have carried it there never happens.
   */
  it('reports every learner write as not-persisted rather than throwing', async () => {
    assert.equal(await setGoalRemote('htet', 'htet-prt'), false);
    assert.equal(await updateProfileRemote({ name: 'Someone', language: 'en' }), false);
    assert.equal(await toggleBookmarkRemote('q-cdp-007', true), false);
    assert.equal(await toggleSavedNoteRemote('note-cdp-01', true), false);
    assert.equal(await toggleEnrolmentRemote('batch-ctet-p1-foundation', true), false);
  });

  it('has no current user offline, so nothing renders a half-real profile', async () => {
    assert.equal(await getCurrentUser(), null);
  });
});
