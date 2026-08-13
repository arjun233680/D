import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { t, theme, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const { lang } = useStore();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: theme.color.surface },
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: theme.color.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t(UI.home, lang), tabBarIcon: icon('🏠'), headerShown: false }}
      />
      <Tabs.Screen
        name="batches"
        options={{ title: t(UI.batches, lang), tabBarIcon: icon('🎥') }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: t(UI.practice, lang), tabBarIcon: icon('✍️') }}
      />
      <Tabs.Screen name="tests" options={{ title: t(UI.tests, lang), tabBarIcon: icon('🎯') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: t(UI.profile, lang), tabBarIcon: icon('👤') }}
      />
    </Tabs>
  );
}
