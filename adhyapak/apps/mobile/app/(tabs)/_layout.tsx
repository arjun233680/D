import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * The four destinations, and the same four the web app pins to the bottom of
 * every screen — see the `NAV` array in apps/web/app/page.tsx.
 *
 * It used to be five: Home, Batches, Practice, Tests, Profile. Those screens
 * still exist and are still reachable, they are simply not tabs any more,
 * because the website does not make them tabs and a learner who moves between
 * the two should not have to relearn where anything is. Study and Performance
 * take their place, which is what the design puts there.
 *
 * The bar is drawn to match the web original rather than to platform default:
 * white, a hairline of #eeebf8 above it, violet for the destination you are on
 * and a muted grey for the rest.
 */

const NAV = {
  home: { en: 'Home', hi: 'होम' },
  study: { en: 'Study', hi: 'अध्ययन' },
  performance: { en: 'Performance', hi: 'प्रदर्शन' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
} as const;

/** Emoji glyphs, dimmed rather than recoloured — exactly what the web bar does. */
const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const { lang } = useStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6d4aed',
        tabBarInactiveTintColor: '#9b96b0',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: theme.family.bodySemi,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eeebf8',
        },
        sceneStyle: { backgroundColor: '#faf9ff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t(NAV.home, lang), tabBarIcon: icon('🏠') }}
      />
      <Tabs.Screen
        name="study"
        options={{ title: t(NAV.study, lang), tabBarIcon: icon('📖') }}
      />
      <Tabs.Screen
        name="performance"
        options={{ title: t(NAV.performance, lang), tabBarIcon: icon('📊') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t(NAV.profile, lang), tabBarIcon: icon('👤') }}
      />
    </Tabs>
  );
}
