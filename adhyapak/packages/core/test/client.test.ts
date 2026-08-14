import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { configureBackend, isBackendConfigured } from '../src/index.ts';

/**
 * Reading backend credentials out of the environment.
 *
 * These run in Node, where `process` exists and nothing is inlined, so they
 * cover the fallback order and the "both or neither" rule. They cannot prove
 * the part that actually broke — that Next and Metro substitute the literal
 * `process.env.NAME` at build time — because that happens in a bundler, not at
 * runtime. That half is checked by grepping the built output; the recipe is in
 * docs/BACKEND-SETUP.md, and the reason it exists is that this file was green
 * while the deployed app was permanently offline.
 */

const NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const name of NAMES) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  // Explicit credentials would take precedence over the environment.
  configureBackend(null);
});

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  configureBackend(null);
});

describe('backend configuration from the environment', () => {
  it('is offline when neither variable is set', () => {
    assert.equal(isBackendConfigured(), false);
  });

  it('is offline when only the URL is set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    assert.equal(isBackendConfigured(), false, 'a URL with no key is not a usable backend');
  });

  it('is offline when only the key is set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    assert.equal(isBackendConfigured(), false);
  });

  it('is configured when both are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    assert.equal(isBackendConfigured(), true);
  });

  it('accepts the Expo names', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    assert.equal(isBackendConfigured(), true);
  });

  it('accepts the unprefixed names, for Node scripts and tests', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    assert.equal(isBackendConfigured(), true);
  });

  it('falls through a name the build left empty', () => {
    // An unset GitHub Actions secret interpolates to '', not to nothing, so the
    // web build can hand us an empty NEXT_PUBLIC_* while EXPO_PUBLIC_* is real.
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   ';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    assert.equal(isBackendConfigured(), true);
  });

  it('treats empty credentials as absent rather than as a backend', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
    assert.equal(isBackendConfigured(), false);
  });

  it('prefers explicit credentials over the environment', () => {
    assert.equal(isBackendConfigured(), false);
    configureBackend({ url: 'https://explicit.supabase.co', anonKey: 'anon-key' });
    assert.equal(isBackendConfigured(), true);
    configureBackend(null);
    assert.equal(isBackendConfigured(), false);
  });
});
