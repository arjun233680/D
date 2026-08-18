import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureSessionStorage } from '@adhyapak/core';

/**
 * Gives the backend client a session store that survives the app closing.
 *
 * Without this, supabase-js falls back to an in-memory adapter on React Native —
 * it looks for `localStorage`, does not find one, and quietly keeps the session
 * in a variable. Signing in worked and then every cold start opened on the login
 * screen again, which reads as the app forgetting people rather than as the
 * missing configuration it is. The website was never affected: a browser has the
 * store the library expects.
 *
 * This matters more now that Google sign-in exists. A learner who has just
 * handed over an account through a provider has been given every reason to
 * believe they are signed in for good.
 *
 * Imported for its effect, once, from the root layout — before any screen can
 * ask for a session. `@adhyapak/core` cannot do it itself: it ships no
 * dependencies and knows nothing about React Native.
 */
configureSessionStorage(AsyncStorage);

/** Exported so the import cannot be mistaken for an unused one and removed. */
export const backendReady = true;
