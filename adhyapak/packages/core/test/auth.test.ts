import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  configureBackend,
  getSession,
  onAuthStateChange,
  resolveStudioAccess,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '../src/index.ts';

/**
 * The auth module's contract, exercised without a server.
 *
 * These cover the promises screens depend on: nothing throws, every failure
 * arrives in both languages, and the three Studio states stay distinct. The
 * happy path needs a real Supabase project and is checked in the browser.
 */

afterEach(() => configureBackend(null));

describe('with no backend configured', () => {
  it('reads as signed out, and says so without pretending it could sign in', async () => {
    const session = await getSession();
    assert.equal(session.userId, null);
    assert.equal(session.backendConfigured, false);
  });

  it('refuses to sign in rather than throwing', async () => {
    const result = await signInWithPassword('someone@example.com', 'password');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });

  it('refuses to create an account rather than throwing', async () => {
    const result = await signUpWithPassword('someone@example.com', 'password', 'Someone');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });

  it('refuses to sign out rather than throwing', async () => {
    const result = await signOut();
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });

  it('still calls the listener, and returns a callable unsubscribe', async () => {
    const seen: unknown[] = [];
    const unsubscribe = onAuthStateChange((s) => seen.push(s));
    assert.equal(typeof unsubscribe, 'function');
    unsubscribe();
    assert.deepEqual(seen, [{ userId: null, backendConfigured: false }]);
  });

  it('resolves the Studio to no-backend, not to signed-out', async () => {
    // The distinction is the point: one is fixed by deploying with credentials,
    // the other by signing in.
    const access = await resolveStudioAccess(async () => false);
    assert.equal(access.kind, 'no-backend');
  });
});

describe('every auth error is renderable', () => {
  // Both funnels are covered: a learner meets these on the sign-up form as
  // often as an educator meets them on sign-in, and an English-only failure on
  // a Hindi screen is the one place the bilingual promise would break first.
  for (const [name, attempt] of [
    ['signing in', () => signInWithPassword('a@b.c', 'x')],
    ['signing up', () => signUpWithPassword('a@b.c', 'x', 'A')],
    ['signing out', () => signOut()],
  ] as const) {
    it(`carries both languages when ${name}`, async () => {
      const result = await attempt();
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.ok(result.error.en.length > 0, 'English message');
      assert.ok(result.error.hi.length > 0, 'Hindi message');
      assert.notEqual(result.error.en, result.error.hi, 'not the same string twice');
      // Devanagari, not a transliteration of the English.
      assert.match(result.error.hi, /[ऀ-ॿ]/);
    });
  }
});

describe('the three Studio states stay distinct', () => {
  it('is signed-out when there is a backend but no session', async () => {
    configureBackend({ url: 'https://example.supabase.co', anonKey: 'anon-key' });
    const access = await resolveStudioAccess(async () => false);
    assert.equal(access.kind, 'signed-out', 'no session means signed-out, never not-staff');
  });

  it('asks the role question only once a session exists', async () => {
    configureBackend({ url: 'https://example.supabase.co', anonKey: 'anon-key' });
    let asked = 0;
    await resolveStudioAccess(async () => {
      asked += 1;
      return true;
    });
    // Signed out: there is no point asking the database about a role.
    assert.equal(asked, 0);
  });
});
