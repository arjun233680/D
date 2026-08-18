import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  codeFromCallback,
  completeOAuthSignIn,
  configureBackend,
  signInWithGoogle,
  toAuthError,
} from '../src/index.ts';

/**
 * Google sign-in, exercised without a network.
 *
 * The round trip itself needs a real project and a real browser, so what is
 * pinned here is everything that can be wrong *before* the network: the code is
 * read back out of the redirect the phone receives, provider failures arrive in
 * both languages, and no entry point throws when there is no backend at all.
 */

afterEach(() => configureBackend(null));

describe('reading the code out of a provider redirect', () => {
  // The phone's callback is a custom scheme. `new URL()` refuses these in some
  // React Native engines, which is why the parser is a pattern — if this ever
  // moves to `new URL()`, this case is what catches it.
  it('reads a custom-scheme deep link', () => {
    assert.equal(codeFromCallback('adhyapak://auth-callback?code=abc123'), 'abc123');
  });

  it('reads an Expo Go development link', () => {
    assert.equal(
      codeFromCallback('exp://192.168.1.5:8081/--/auth-callback?code=dev-code'),
      'dev-code',
    );
  });

  it('reads the website form, where the code is not the first parameter', () => {
    assert.equal(
      codeFromCallback('https://arjun233680.github.io/D/web/?state=x&code=web-code'),
      'web-code',
    );
  });

  it('decodes an escaped code rather than handing back the escape', () => {
    assert.equal(codeFromCallback('adhyapak://cb?code=a%2Fb%2Bc'), 'a/b+c');
  });

  it('stops at a fragment instead of swallowing it into the code', () => {
    assert.equal(codeFromCallback('adhyapak://cb?code=abc#other=1'), 'abc');
  });

  it('is null when the provider sent an error back instead of a code', () => {
    assert.equal(codeFromCallback('adhyapak://cb?error=access_denied'), null);
  });

  it('is not fooled by a parameter that merely ends in "code"', () => {
    // `?authcode=` must not match: the boundary in the pattern is the point.
    assert.equal(codeFromCallback('adhyapak://cb?authcode=nope'), null);
  });
});

describe('provider failures are renderable', () => {
  /*
   * The regression guard for the bug a live sign-in found: "Email not
   * confirmed" fell through to `unknown`, and `unknown` renders the raw message
   * for both languages — so a learner reading the app in Hindi was shown an
   * English sentence from GoTrue, with no hint that the fix was in their inbox.
   *
   * These are the strings GoTrue actually returns, not invented ones.
   */
  for (const [raw, kind] of [
    ['Email not confirmed', 'email-unconfirmed'],
    ['email_not_confirmed', 'email-unconfirmed'],
    ['Unsupported provider: provider is not enabled', 'oauth-unavailable'],
    ['Invalid login credentials', 'invalid-credentials'],
    ['User already registered', 'email-taken'],
  ] as const) {
    it(`maps "${raw}" to ${kind}, in both languages`, () => {
      const error = toAuthError(new Error(raw));
      assert.equal(error.kind, kind);
      assert.ok(error.en.length > 0, 'English message');
      assert.ok(error.hi.length > 0, 'Hindi message');
      assert.notEqual(error.en, error.hi, 'not the raw message twice');
      // Devanagari, not the English text wearing a Hindi label.
      assert.match(error.hi, /[ऀ-ॿ]/);
      // And never the provider's own wording, in either language.
      assert.notEqual(error.en, raw);
    });
  }

  it('tells a learner where the fix is when their email is unconfirmed', () => {
    // The kind alone is not the promise — the message has to point at the inbox,
    // because "Email not confirmed" left people retyping a correct password.
    const error = toAuthError(new Error('Email not confirmed'));
    // Deliberately not matching on "email": the raw provider string contains it,
    // so an assertion that allowed it would pass while the mapping was missing —
    // which is exactly the state this test exists to catch.
    assert.match(error.en, /link|inbox/i);
    assert.match(error.hi, /लिंक/);
  });
});

describe('with no backend configured', () => {
  it('refuses to start Google rather than throwing', async () => {
    const result = await signInWithGoogle('https://example.test/');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });

  it('refuses to finish Google rather than throwing', async () => {
    const result = await completeOAuthSignIn('adhyapak://cb?code=abc');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });
});

describe('a redirect that carried no code', () => {
  it('fails with a renderable message instead of calling the network', async () => {
    // Configured, so this would reach Supabase if the guard were missing. The
    // fake project is never contacted, which is the assertion: a cancelled or
    // denied sign-in must not turn into a hanging request.
    configureBackend({ url: 'https://example.supabase.co', anonKey: 'anon-key' });
    const result = await completeOAuthSignIn('adhyapak://cb?error=access_denied');
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.kind, 'oauth-unavailable');
    assert.match(result.error.hi, /[ऀ-ॿ]/);
  });
});
