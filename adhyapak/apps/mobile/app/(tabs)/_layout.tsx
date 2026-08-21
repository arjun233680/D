import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Icon, type IconName } from '@/components/icons';

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

/**
 * Drawn glyphs that take the bar's own tint.
 *
 * These were emoji, dimmed to 45% when inactive. An emoji cannot be
 * recoloured — it carries its own palette — so the inactive state had to be
 * faked with opacity, and the active tab could never actually turn violet. A
 * stroke icon just takes `color`, so the bar tints the way the design says.
 */
const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} size={22} color={String(color)} />;

export default function TabsLayout() {
  const { lang } = useStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6d4aed',
        tabBarInactiveTintColor: '#9b96b0',
        tabBarLabelStyle: {
          fontSize: 12,
          // Devanagari carries marks above and below the line — the ि of
          // प्रोफ़ाइल and the ्ष of अध्ययन — so a label needs more room than
          // its point size. At 10.5 the default height held; at 12 the
          // descenders were cut off level with the bar's floor.
          lineHeight: 16,
          // The label's own box, not the bar's. The bar had room — it measured
          // 64pt with the label sitting 15pt clear of the floor — but the box
          // around the text was 7pt tall and cut 12pt Devanagari in half. It
          // gets flex-shrunk otherwise.
          height: 18,
          flexShrink: 0,
          fontFamily: theme.family.bodySemi,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eeebf8',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: '#faf9ff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t(NAV.home, lang), tabBarIcon: icon('home') }}
      />
      <Tabs.Screen
        name="study"
        options={{ title: t(NAV.study, lang), tabBarIcon: icon('book') }}
      />
      <Tabs.Screen
        name="performance"
        options={{ title: t(NAV.performance, lang), tabBarIcon: icon('chart') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t(NAV.profile, lang), tabBarIcon: icon('user') }}
      />
    </Tabs>
  );
}
