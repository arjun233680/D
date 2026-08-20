import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { configureBackend, saveLearnerExamIds, saveLearnerLevelIds } from '../src/index.ts';

/**
 * The learner writes, and the shape their failures arrive in.
 *
 * These went out as a bare boolean once, so no screen could tell an expired
 * session from a real failure and every one of them reported "check your
 * connection" — advice that cannot work when the server is answering 401.
 *
 * The callability check is not busywork: `writeWithSession` is declared below
 * the functions that call it, which is legal only because the call happens
 * inside an async body that runs after the module has finished evaluating.
 * Moving either one could break that silently, and nothing else would catch it.
 */

afterEach(() => configureBackend(null));

describe('a learner write with no backend', () => {
  it('fails without claiming the session expired', async () => {
    const outcome = await saveLearnerExamIds(['ctet']);
    assert.equal(outcome.ok, false);
    assert.equal(outcome.ok === false && outcome.expired, false);
  });
});

describe('a learner write that cannot reach the server', () => {
  it('returns an outcome rather than throwing', async () => {
    configureBackend({ url: 'https://example.supabase.co', anonKey: 'test-anon-key' });
    for (const outcome of [
      await saveLearnerExamIds(['ctet']),
      await saveLearnerLevelIds(['tgt']),
    ]) {
      assert.equal(outcome.ok, false);
      assert.equal(typeof (outcome as { expired: boolean }).expired, 'boolean');
    }
  });
});
