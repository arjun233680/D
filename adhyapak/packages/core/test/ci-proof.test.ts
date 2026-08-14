import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * TEMPORARY — proves CI actually runs the test suite. Removed in the next commit.
 */
describe('CI gate proof', () => {
  it('fails on purpose so the workflow can be seen going red', () => {
    assert.equal(2 + 2, 5, 'deliberate failure to prove CI runs the tests');
  });
});
