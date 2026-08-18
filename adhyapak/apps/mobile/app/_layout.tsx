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
 * Sends the learner to the right place on launch:
 *   not signed in            -> login
 *   signed in, no goal yet   -> goal picker
 *   both done                -> the app
 * Runs after the persisted store has hydrated, so a returning learner never
 * sees the login screen flash before landing on home.
 */
/**
 * Nothing is reachable without an account.
 *
 * `signedIn` means a real profile row now, not "past the door" — the guest path
 * that used to satisfy this gate has been removed. Everything behind it is
 * scoped to a learner: the goal reshapes every subject list, bookmarks and
 * progress have to survive a reinstall, and an attempt is only worth submitting
 * if there is somewhere to record it.
 */
function AuthGate() {
  const { signedIn, onboarded } = useSession();
  const { ready } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const path = segments.join('/');
    const inAuth = path.startsWith('(auth)');
    const onGoal = path.includes('goal');

    if (!signedIn && !inAuth) {
      router.replace('/(auth)/login');
    } else if (signedIn && !onboarded && !onGoal) {
      router.replace('/(auth)/goal');
    } else if (signedIn && onboarded && inAuth) {
      router.replace('/(tabs)');
    }
  }, [ready, signedIn, onboarded, segments, router]);

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
          contentStyle: { backgroundColor: theme.color.bg },
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/goal" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
