import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { configureBackend, sendPhoneOtp, toE164India, verifyPhoneOtp } from '../src/index.ts';

/**
 * Phone sign-in, exercised without a server.
 *
 * The half worth testing here is the normalising. Sending the code needs a live
 * SMS provider and is checked by hand, but which strings count as a mobile
 * number is a decision this package makes on its own — and it is the decision
 * that decides whether an aspirant who typed their number the way they always
 * write it gets in or gets told it is invalid.
 */

afterEach(() => configureBackend(null));

describe('reading a typed Indian mobile number', () => {
  it('accepts the ways a number is actually written', () => {
    // Every one of these is the same number.
    for (const typed of [
      '9876543210',
      '98765 43210',
      '98765-43210',
      '+91 98765 43210',
      '+919876543210',
      '91 98765 43210',
      '09876543210',
      '0 98765 43210',
      ' 9876543210 ',
    ]) {
      assert.equal(toE164India(typed), '+919876543210', `failed on ${JSON.stringify(typed)}`);
    }
  });

  it('rejects what cannot be a mobile number', () => {
    for (const typed of [
      '', // nothing typed
      '98765', // half a number
      '98765432101', // one digit too many
      '1234567890', // mobile numbers never begin below 6
      '5876543210',
      'not a number',
    ]) {
      assert.equal(toE164India(typed), null, `should have rejected ${JSON.stringify(typed)}`);
    }
  });

  /*
   * A landline written with its STD code is ten digits once the leading zero
   * goes, and would sail through a length check. The first digit is what tells
   * them apart, and getting this wrong means an SMS sent to a phone that
   * cannot receive it.
   */
  it('does not mistake a landline with an STD code for a mobile', () => {
    assert.equal(toE164India('011 2345 6789'), null);
    assert.equal(toE164India('0532 245 6789'), null);
  });
});

describe('with no backend configured', () => {
  it('refuses to send a code rather than throwing', async () => {
    const result = await sendPhoneOtp('9876543210');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });

  it('refuses to verify a code rather than throwing', async () => {
    const result = await verifyPhoneOtp('+919876543210', '123456');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'no-backend');
  });
});

describe('a number that cannot be texted', () => {
  /*
   * Caught before the network, and reported in both languages like every other
   * failure — the screen renders `error.hi` or `error.en` and never has to know
   * that this one never left the device.
   */
  it('is rejected without a round trip, in both languages', async () => {
    configureBackend({ url: 'https://example.supabase.co', anonKey: 'test-anon-key' });
    const result = await sendPhoneOtp('12345');
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.error.kind, 'invalid-phone');
    assert.ok(result.ok === false && result.error.hi.length > 0);
    assert.ok(result.ok === false && result.error.en.length > 0);
  });
});
