import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Hind_400Regular, Hind_500Medium, Hind_600SemiBold } from '@expo-google-fonts/hind';
import { theme } from '@adhyapak/core';
// Hands AsyncStorage to the backend client. Must be imported before anything
// asks for a session, which is why it sits at the root rather than in a screen.
import '@/lib/backend';
import { StoreProvider, useStore } from '@/lib/store';
import { SessionProvider, useSession } from '@/lib/session';

/**
 * Nothing is reachable without an account.
 *
 * `signedIn` means a real profile row, not "past the door" — the guest path
 * that used to satisfy this gate has been removed. Everything behind it is
 * scoped to a learner: the selection reshapes every subject list, bookmarks and
 * progress have to survive a reinstall, and an attempt is only worth submitting
 * if there is somewhere to record it.
 *
 * WHAT THE GATE NO LONGER DOES
 *
 * It used to also decide whether onboarding was finished, from `user.onboarded`
 * — a flag the old single-exam goal picker set. That picker is gone, and the
 * question it answered ("which one exam?") is not the question the app asks any
 * more; onboarding is now three answers held in `learner_exams`,
 * `learner_levels` and `learner_subjects`.
 *
 * So the gate stops at "is there an account", and the dashboard decides where
 * an incomplete learner belongs, using `nextOnboardingStep` against those three
 * tables. That is exactly what apps/web does, and it is the only way the two
 * can agree: a local flag and three server rows drift the moment somebody
 * finishes onboarding on the website and opens the phone.
 */
function AuthGate() {
  const { signedIn } = useSession();
  const { ready } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const path = segments.join('/');
    const inAuth = path.startsWith('(auth)');
    /*
     * The OAuth landing pad is neither signed in nor signed out — it is the
     * moment in between, holding the code that decides which. Bouncing it to
     * the login screen throws that code away, which is how a completed Google
     * sign-in ended up back at the door.
     */
    const isCallback = path.startsWith('auth-callback');
    if (isCallback) return;

    if (!signedIn && !inAuth) {
      router.replace('/(auth)/login');
    } else if (signedIn && inAuth) {
      router.replace('/(tabs)');
    }
  }, [ready, signedIn, segments, router]);

  return null;
}

function Shell() {
  const { ready } = useStore();

  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
  });

  // Holding the first paint until both are ready avoids a flash of system type
  // and, worse, a flash of the login screen for someone already signed in.
  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.ink, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.color.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <AuthGate />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.color.surface },
          headerTitleStyle: {
            fontFamily: theme.family.display,
            fontSize: theme.font.md,
          },
          headerTintColor: theme.color.text,
          headerShadowVisible: false,
          // The canvas the website paints, so a screen pushed over the tabs
          // does not flash a different grey on its way in.
          contentStyle: { backgroundColor: '#faf9ff' },
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Onboarding draws its own back arrow and step rail, so it takes the
            whole screen exactly as it does on the website. */}
        <Stack.Screen name="onboarding/exams" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/level" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/subject" options={{ headerShown: false }} />

        {/* Preparation screens carry PrepHeader — their own menu, back arrow,
            title and actions — so a native header would be a second one. */}
        <Stack.Screen name="prep/index" options={{ headerShown: false }} />
        <Stack.Screen name="prep/pyq" options={{ headerShown: false }} />
        <Stack.Screen name="prep/tests" options={{ headerShown: false }} />

        {/* Every exam window owns the whole screen, exactly like the web app —
            a mock, a previous-year paper, and any practice set. */}
        <Stack.Screen name="test/[id]/attempt" options={{ headerShown: false }} />
        <Stack.Screen name="practice/pyq/attempt" options={{ headerShown: false }} />
        <Stack.Screen name="practice/bookmarks" options={{ headerShown: false }} />
        <Stack.Screen name="practice/subject/[subjectId]" options={{ headerShown: false }} />
        <Stack.Screen name="practice/topic/[topicId]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Shell />
        </SessionProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
