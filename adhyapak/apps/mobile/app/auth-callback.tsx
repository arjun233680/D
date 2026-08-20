import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { completeOAuthSignIn, theme, type AuthError } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { CANVAS, INK, MUTED, VIOLET } from '@/components/prep';

/**
 * Where a provider sign-in comes back to.
 *
 * WHY THIS FILE HAS TO EXIST
 *
 * `signInWithGoogle` asks Supabase to return the browser to
 * `Linking.createURL('auth-callback')`. On a device that resolves to the app's
 * own scheme and `openAuthSessionAsync` intercepts it before any screen
 * renders, so for a long time nothing here was missing in a way anybody
 * noticed. On web it resolves to `http://localhost:8081/auth-callback` — a real
 * page, in a real window — and expo-router had no route for it, so the window
 * that Google handed back landed on "Unmatched Route" and the sign-in died
 * there without an error anybody could see.
 *
 * So this is the landing pad, and it finishes the job rather than just
 * occupying the address: it exchanges the code for a session itself. That
 * matters on the web path, where the popup — not the opener — is the window
 * holding the code.
 *
 * ONE THING THIS FILE CANNOT FIX
 *
 * Supabase only honours a `redirectTo` that appears in the project's
 * Authentication → URL Configuration → Redirect URLs allowlist. An address that
 * is not on it is discarded silently and the browser goes to the Site URL
 * instead — so the popup never reaches this screen, `openAuthSessionAsync`
 * never sees its redirect, and the caller gets "cancelled" for something the
 * person at the keyboard did not cancel. If sign-in fails with no message, that
 * allowlist is the first thing to check; the exact URL is printed below.
 */
export default function AuthCallbackScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      // On web the code arrives as a query parameter on this very page; on a
      // device this screen is usually never reached, because the auth session
      // intercepts the redirect first.
      const href = typeof window === 'undefined' ? '' : window.location.href;
      if (!href) return;

      const result = await completeOAuthSignIn(href);
      if (!live) return;

      if (!result.ok) {
        setError(result.error);
        return;
      }
      /*
       * The chooser, not the dashboard. It reads the learner's saved exams and
       * forwards them on if they have any, which keeps "have they answered
       * onboarding yet" in one place instead of duplicating the test here.
       */
      router.replace('/onboarding/exams');
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CANVAS,
        padding: 32,
      }}
    >
      {error ? (
        <>
          <Text style={{ fontSize: 34 }}>⚠️</Text>
          <Text
            style={{
              marginTop: 12,
              textAlign: 'center',
              fontSize: 16,
              fontFamily: theme.family.displayBold,
              color: INK,
            }}
          >
            {hi ? 'साइन इन पूरा नहीं हो सका' : 'Could not finish signing in'}
          </Text>
          <Text
            style={{
              marginTop: 8,
              textAlign: 'center',
              fontSize: 13,
              lineHeight: 19,
              fontFamily: theme.family.body,
              color: MUTED,
            }}
          >
            {hi ? error.hi : error.en}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(auth)/login')}
            style={{
              marginTop: 20,
              minHeight: 48,
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: VIOLET,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: theme.family.displayBold, color: '#fff' }}>
              {hi ? 'फिर से कोशिश करें' : 'Try again'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={VIOLET} size="large" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 14,
              fontFamily: theme.family.body,
              color: MUTED,
            }}
          >
            {hi ? 'साइन इन किया जा रहा है…' : 'Signing you in…'}
          </Text>
        </>
      )}
    </View>
  );
}
