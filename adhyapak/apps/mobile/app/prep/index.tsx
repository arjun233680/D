import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useResponsive } from '@/lib/responsive';
import { selectionTitle, useSelection } from '@/lib/useSelection';
import {
  CANVAS,
  EmptyNote,
  INK,
  MUTED,
  PrepHeader,
  PrepLoading,
  PrepShell,
  VIOLET,
} from '@/components/prep';

/**
 * The dashboard for one selection — everything an HTET TGT Science candidate
 * does, on one screen.
 *
 * The progress bar and "Continue Learning" are deliberately empty rather than
 * filled with the design's 45% and "Chapter 1 • Chemistry, 60% completed".
 * Nothing records a chapter opened or a topic finished yet, so both would be
 * invented — and invented progress is worse than none, because a learner who
 * has done nothing would be told they are nearly halfway and plan around it.
 * Both light up on their own once the app records that activity.
 *
 * Ported from apps/web/app/prep/page.tsx. The tile grid is two columns on a
 * phone and four once there is room, which is what the web grid does at `sm`.
 */

const TILES = [
  {
    href: '/prep/pyq',
    icon: '📄',
    tint: '#e6f0fd',
    dot: '#2563eb',
    label: { en: 'PYQ', hi: 'विगत वर्ष' },
    sub: { en: 'Previous Year Questions', hi: 'विगत वर्ष प्रश्न' },
  },
  {
    href: '/(tabs)/study',
    icon: '📗',
    tint: '#e8f7ee',
    dot: '#16a34a',
    label: { en: 'Notes', hi: 'नोट्स' },
    sub: { en: 'Study Smart', hi: 'बेहतर पढ़ाई' },
  },
  {
    href: '/prep/tests',
    icon: '📋',
    tint: '#fff3e6',
    dot: '#ea580c',
    label: { en: 'Test Series', hi: 'टेस्ट सीरीज़' },
    sub: { en: 'Practice & Improve', hi: 'अभ्यास एवं सुधार' },
  },
  {
    href: '/prep/tests',
    icon: '🎯',
    tint: '#f6efff',
    dot: '#9333ea',
    label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' },
    sub: { en: 'Real Exam Experience', hi: 'वास्तविक परीक्षा अनुभव' },
  },
  {
    href: '/current-affairs',
    icon: '📰',
    tint: '#fdeaf3',
    dot: '#db2777',
    label: { en: 'Current Affairs', hi: 'समसामयिकी' },
    sub: { en: 'Stay Updated Daily', hi: 'रोज़ अपडेट रहें' },
  },
  {
    href: '/practice',
    icon: '📅',
    tint: '#e8f7ee',
    dot: '#16a34a',
    label: { en: 'DPP', hi: 'DPP' },
    sub: { en: 'Daily Practice Papers', hi: 'दैनिक अभ्यास पत्र' },
  },
  {
    href: '/practice',
    icon: '❓',
    tint: '#fff8e6',
    dot: '#eab308',
    label: { en: 'Quick Quiz', hi: 'त्वरित क्विज़' },
    sub: { en: 'Test Your Knowledge', hi: 'अपना ज्ञान परखें' },
  },
  {
    href: '/(tabs)/study',
    icon: '📘',
    tint: '#f1eefc',
    dot: '#6d4aed',
    label: { en: 'Revision Notes', hi: 'रिवीज़न नोट्स' },
    sub: { en: 'High Yield Notes', hi: 'महत्वपूर्ण नोट्स' },
  },
] as const;

export default function PrepDashboardScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  const { selection, loading } = useSelection();

  if (loading || !selection) {
    return <PrepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;
  const title = selectionTitle(selection, subjectName);
  const subtitle = selection.exam
    ? t(selection.exam.name, lang)
    : t(selection.level.fullName, lang);

  const columns = r.isPhone ? 2 : 4;

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <PrepHeader
                title={title}
                subtitle={subtitle}
                onMenu={openMenu}
                back
                lang={lang}
              />

              {/* The design shows "45% Completed" over a filled bar. Nothing
                  measures that yet, so the bar stays at zero and says why. */}
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: '#eeebf8',
                  paddingHorizontal: r.gutter,
                  paddingTop: 16,
                  paddingBottom: 16,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontFamily: theme.family.bodySemi, color: MUTED }}
                >
                  {hi ? 'अभी शुरू नहीं किया' : 'Not started yet'}
                </Text>
                <View
                  style={{
                    marginTop: 8,
                    height: 8,
                    width: '100%',
                    borderRadius: 999,
                    backgroundColor: '#efecfa',
                  }}
                />
              </View>

              <View
                style={{
                  width: '100%',
                  maxWidth: r.maxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: r.gutter,
                }}
              >
                {/* ------------------------------------- study & practice */}
                <View style={{ marginTop: 20 }}>
                  <SectionHeading icon="📖" text={hi ? 'अध्ययन एवं अभ्यास' : 'Study & Practice'} />

                  <View
                    style={{
                      marginTop: 16,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    {TILES.map((tile, i) => (
                      <View
                        key={`${tile.label.en}-${i}`}
                        style={{ width: `${(100 - (columns - 1) * 3) / columns}%` }}
                      >
                        <Pressable
                          accessibilityRole="link"
                          onPress={() => router.push(tile.href as never)}
                          style={{
                            alignItems: 'center',
                            borderRadius: 16,
                            padding: 16,
                            backgroundColor: tile.tint,
                          }}
                        >
                          <Text style={{ fontSize: 30 }}>{tile.icon}</Text>
                          <Text
                            style={{
                              marginTop: 12,
                              textAlign: 'center',
                              fontSize: 14,
                              fontFamily: theme.family.displayBold,
                              color: INK,
                            }}
                          >
                            {t(tile.label, lang)}
                          </Text>
                          <Text
                            style={{
                              marginTop: 4,
                              textAlign: 'center',
                              fontSize: 11.5,
                              lineHeight: 15,
                              fontFamily: theme.family.body,
                              color: MUTED,
                            }}
                          >
                            {t(tile.sub, lang)}
                          </Text>
                          <View
                            style={{
                              marginTop: 12,
                              height: 28,
                              width: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: tile.dot,
                            }}
                          >
                            <ArrowGlyph />
                          </View>
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push('/notes')}
                    style={{
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 16,
                      backgroundColor: '#e9f7f3',
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>Σ</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: theme.family.displayBold,
                          color: INK,
                        }}
                      >
                        {hi ? 'सूत्र संग्रह' : 'Formula Sheet'}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}
                      >
                        {hi ? 'महत्वपूर्ण सूत्र' : 'Important Formulas'}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 32,
                        width: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0d9488',
                      }}
                    >
                      <ArrowGlyph size={15} />
                    </View>
                  </Pressable>
                </View>

                {/* ---------------------------------- continue learning */}
                <View style={{ marginTop: 28 }}>
                  <SectionHeading
                    icon="🔖"
                    text={hi ? 'तैयारी जारी रखें' : 'Continue Learning'}
                  />
                  <View style={{ marginTop: 12 }}>
                    <EmptyNote>
                      {hi
                        ? 'अभी तक कोई अध्याय शुरू नहीं हुआ। ऊपर से कुछ भी खोलिए — जहाँ छोड़ेंगे, वहीं से यहाँ दिखेगा।'
                        : 'No chapter started yet. Open anything above, and where you left off will appear here.'}
                    </EmptyNote>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </PrepShell>
  );
}

/* --------------------------------------------------------------- fragments */

function SectionHeading({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 17 }}>{icon}</Text>
      <Text style={{ fontSize: 17, fontFamily: theme.family.displayBold, color: INK }}>
        {text}
      </Text>
    </View>
  );
}

function ArrowGlyph({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
