import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  configureBackend,
  explainWriteFailure,
  saveLearnerExamIds,
  saveLearnerLevelIds,
} from '../src/index.ts';

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

/**
 * How a refused write is classified.
 *
 * `writeWithSession` retries once, and it used to call whatever came back from
 * that retry a connection problem. It is not: `getSession()` hands back
 * whatever is in storage, so a browser whose refresh token the server has
 * already forgotten still looks signed in, gets refused twice, and was told to
 * check its connection — which sent the learner back to press the same button
 * against a request that could never succeed. The retry now goes through this
 * function, so what it says about a 401 is what the screen does.
 */
describe('classifying a refused write', () => {
  it('calls the auth refusals expired, whichever vocabulary they arrive in', async () => {
    for (const message of [
      'permission denied for function set_learner_exams',
      'JWT expired',
      'Request failed with status code 401',
      'Unauthorized',
    ]) {
      const outcome = await explainWriteFailure(new Error(message));
      assert.equal(outcome.ok, false);
      assert.equal(outcome.ok === false && outcome.expired, true, message);
    }
  });

  /*
   * There is deliberately no case here for a non-auth failure. With no backend
   * configured there is no session either, so `explainWriteFailure` reports
   * that one as expired as well — correctly, and for a reason that has nothing
   * to do with the message. Pinning it would enshrine the test's own setup.
   */
});
