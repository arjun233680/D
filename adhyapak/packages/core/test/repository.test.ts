import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QUESTIONS,
  buildPracticeSet,
  countQuestions,
  fetchNote,
  isBackendConfigured,
  listNotes,
  listPyqYears,
  listQuestions,
  listTests,
  listTopicFrequency,
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

  it('still returns questions, so a dead connection is not an error screen', async () => {
    const questions = await listQuestions({ limit: 5 });
    assert.ok(questions.length > 0);
    assert.ok(questions[0]!.text.en);
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
  it('narrows by subject', async () => {
    const list = await listQuestions({ subjectId: 'cdp' });
    assert.ok(list.length > 0);
    assert.ok(list.every((q) => q.subjectId === 'cdp'));
  });

  it('narrows by topic', async () => {
    const topicId = QUESTIONS[0]!.topicId;
    const list = await listQuestions({ topicId });
    assert.ok(list.length > 0);
    assert.ok(list.every((q) => q.topicId === topicId));
  });

  it('narrows by exam', async () => {
    const list = await listQuestions({ examId: 'ctet' });
    assert.ok(list.length > 0);
    assert.ok(list.every((q) => q.examIds.includes('ctet')));
  });

  it('narrows by difficulty', async () => {
    const list = await listQuestions({ difficulty: 'easy' });
    assert.ok(list.every((q) => q.difficulty === 'easy'));
  });

  it('combines subject and difficulty', async () => {
    const list = await listQuestions({ subjectId: 'cdp', difficulty: 'medium' });
    assert.ok(list.every((q) => q.subjectId === 'cdp' && q.difficulty === 'medium'));
  });

  it('returns only previous-year questions when asked', async () => {
    const list = await listQuestions({ pyqOnly: true });
    assert.ok(list.every((q) => Boolean(q.previousYear)));
  });

  it('returns an empty list for a filter nothing matches', async () => {
    const list = await listQuestions({ topicId: 'no-such-topic' });
    assert.deepEqual(list, [], 'an empty result is a value, not an error');
  });

  it('honours limit and offset so a large bank can be paged', async () => {
    const first = await listQuestions({ limit: 3 });
    const second = await listQuestions({ limit: 3, offset: 3 });
    assert.equal(first.length, 3);
    assert.equal(second.length, 3);
    assert.notEqual(first[0]!.id, second[0]!.id, 'offset actually moves the window');
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
