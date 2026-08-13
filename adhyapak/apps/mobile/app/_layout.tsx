import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@adhyapak/core';
import { StoreProvider } from '@/lib/store';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.color.surface },
            headerTitleStyle: { fontWeight: '700', fontSize: theme.font.md },
            headerTintColor: theme.color.text,
            contentStyle: { backgroundColor: theme.color.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* The test player owns the whole screen, exactly like the web app. */}
          <Stack.Screen name="test/[id]/attempt" options={{ headerShown: false }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
