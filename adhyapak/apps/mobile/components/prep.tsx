import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { t, theme, type Lang } from '@adhyapak/core';
import { useResponsive } from '@/lib/responsive';

/**
 * The chrome the preparation screens share — the native half of
 * apps/web/app/prep/ui.tsx.
 *
 * A dashboard and a PYQ browser sit under one selection — "HTET TGT Science" —
 * and both carry the same drawer, the same title block and the same actions.
 * Kept here so the two cannot drift; the drawer in particular is the only way
 * to reach Syllabus, Bookmarks and Change Selection, and a copy of it that fell
 * behind would quietly strand one of those.
 *
 * WHAT THE PHONE DOES DIFFERENTLY
 *
 * The web version pins a five-tab bar to the foot of every preparation screen.
 * Here the four tabs live in app/(tabs)/_layout.tsx and a preparation screen is
 * pushed *over* them, so the bar steps aside and a back arrow takes its place.
 * That is the platform convention on both iOS and Android — a drill-down hides
 * the tabs — and fighting it would leave a learner with two competing ways back.
 * Everything the fifth tab reached is still one tap away in the drawer.
 */

export const VIOLET = '#6d4aed';
export const INK = '#1e1b4b';
export const MUTED = '#6b7280';
export const CANVAS = '#faf9ff';

const DRAWER = [
  {
    heading: { en: 'Analysis & Progress', hi: 'विश्लेषण एवं प्रगति' },
    items: [
      { href: '/goal', icon: '📕', label: { en: 'Syllabus', hi: 'पाठ्यक्रम' }, tint: '#6d4aed' },
      {
        href: '/(tabs)/performance',
        icon: '🥧',
        label: { en: 'PYQ Analysis', hi: 'PYQ विश्लेषण' },
        tint: '#ea580c',
      },
      {
        href: '/(tabs)/performance',
        icon: '📊',
        label: { en: 'Performance', hi: 'प्रदर्शन' },
        tint: '#16a34a',
      },
    ],
  },
  {
    heading: { en: 'Personal', hi: 'व्यक्तिगत' },
    items: [
      {
        href: '/practice/bookmarks',
        icon: '🔖',
        label: { en: 'Bookmarks', hi: 'बुकमार्क' },
        tint: '#6d4aed',
      },
      {
        href: '/onboarding/exams?change=1',
        icon: '⇄',
        label: { en: 'Change Selection', hi: 'चुनाव बदलें' },
        tint: '#0891b2',
      },
    ],
  },
  {
    heading: { en: 'Account', hi: 'खाता' },
    items: [
      { href: '/doubts', icon: '❓', label: { en: 'Help & Support', hi: 'सहायता' }, tint: '#db2777' },
      {
        href: '/(tabs)/profile',
        icon: '⚙️',
        label: { en: 'Settings', hi: 'सेटिंग्स' },
        tint: '#6b7280',
      },
    ],
  },
] as const;

/**
 * The slide-over menu.
 *
 * A real overlay rather than a permanent column: the design shows it open
 * beside the content on a wide screen, but a phone has no room for both, and
 * the same markup serving both is what keeps the links in one place.
 */
export function Drawer({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const hi = lang === 'hi';
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SafeAreaView
          edges={['top', 'bottom']}
          style={{ width: 270, backgroundColor: '#fff' }}
        >
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hi ? 'बंद करें' : 'Close menu'}
              onPress={onClose}
              style={{
                marginBottom: 16,
                height: 44,
                width: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
                <Path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke={INK}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>

            {DRAWER.map((group) => (
              <View key={group.heading.en} style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    marginBottom: 8,
                    paddingHorizontal: 8,
                    fontSize: 12,
                    letterSpacing: 0.6,
                    fontFamily: theme.family.displayBold,
                    color: VIOLET,
                  }}
                >
                  {t(group.heading, lang).toUpperCase()}
                </Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.label.en + item.href}
                    accessibilityRole="link"
                    onPress={() => {
                      onClose();
                      router.push(item.href as never);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 12,
                      minHeight: 44,
                    }}
                  >
                    <Text style={{ fontSize: 19, color: item.tint }}>{item.icon}</Text>
                    <Text
                      style={{ fontSize: 15, fontFamily: theme.family.bodyMedium, color: INK }}
                    >
                      {t(item.label, lang)}
                    </Text>
                  </Pressable>
                ))}
                <View style={{ marginTop: 16, height: 1, backgroundColor: '#eeebf8' }} />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>

        {/* Tapping the dimmed remainder closes, exactly like the web overlay. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hi ? 'बंद करें' : 'Close menu'}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}
        />
      </View>
    </Modal>
  );
}

/** The bar across the top: menu, an optional back arrow, a title, and actions. */
export function PrepHeader({
  title,
  subtitle,
  onMenu,
  back,
  lang,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
  /** Shown on screens pushed over a tab, omitted on the one that owns it. */
  back?: boolean;
  lang: Lang;
}) {
  const hi = lang === 'hi';
  const r = useResponsive();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: r.maxWidth,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: r.gutter,
        paddingTop: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hi ? 'मेन्यू खोलें' : 'Open menu'}
        onPress={onMenu}
        style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          <Path d="M3 6h14M3 10h14M3 14h14" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Pressable>

      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hi ? 'वापस' : 'Back'}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
            <Path
              d="M12 4 6.5 10 12 16"
              stroke={INK}
              strokeWidth={2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : null}

      <View style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 21, fontFamily: theme.family.displayBold, color: INK }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, fontFamily: theme.family.body, color: MUTED }}
        >
          {subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={hi ? 'खोजें' : 'Search'}
          onPress={() => router.push('/explore')}
          style={{ height: 44, width: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={19} height={19} viewBox="0 0 20 20" fill="none">
            <Circle cx={9} cy={9} r={6} stroke={INK} strokeWidth={1.8} />
            <Path d="m13.6 13.6 3.4 3.4" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={hi ? 'सूचनाएँ' : 'Updates'}
          onPress={() => router.push('/current-affairs')}
          style={{ height: 44, width: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={19} height={19} viewBox="0 0 20 20" fill="none">
            <Path
              d="M10 3a5 5 0 0 0-5 5v3l-1.4 2.2h12.8L15 11V8a5 5 0 0 0-5-5Z"
              stroke={INK}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
            <Path
              d="M8.2 16a2 2 0 0 0 3.6 0"
              stroke={INK}
              strokeWidth={1.7}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

/** Wraps a screen with the drawer state its header needs. */
export function PrepShell({
  lang,
  children,
}: {
  lang: Lang;
  children: (open: () => void) => ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <Drawer open={menu} onClose={() => setMenu(false)} lang={lang} />
      {children(() => setMenu(true))}
    </>
  );
}

/**
 * What a list says when the question bank has nothing for it yet.
 *
 * Used rather than hiding the section: a learner who taps "Previous Year" and
 * lands on a blank screen assumes the app is broken. Saying the papers are not
 * loaded yet is both true and less alarming.
 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#ded9f3',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 24,
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: 13,
          lineHeight: 20,
          fontFamily: theme.family.body,
          color: MUTED,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * The big "which of your selections?" cards.
 *
 * A learner who sits TGT Science *and* PGT Chemistry has two different sets of
 * papers, notes and tests behind them. Screens that used to pick the first one
 * silently were opening the wrong half of somebody's preparation without saying
 * so; this asks, and only when there is genuinely more than one.
 */
export function SelectionPicker({
  title,
  subtitle,
  items,
  hrefFor,
}: {
  title: string;
  subtitle: string;
  items: {
    key: string;
    examShort: string;
    levelName: string;
    subjectName?: string;
    icon: string;
    color: string;
  }[];
  hrefFor: (key: string) => string;
}) {
  const r = useResponsive();
  return (
    <View
      style={{
        width: '100%',
        maxWidth: r.maxWidth,
        alignSelf: 'center',
        paddingHorizontal: r.gutter,
        paddingTop: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 16 }}>🔖</Text>
        <Text style={{ fontSize: 16, fontFamily: theme.family.displayBold, color: INK }}>
          {title}
        </Text>
      </View>
      <Text style={{ marginTop: 2, fontSize: 13, fontFamily: theme.family.body, color: MUTED }}>
        {subtitle}
      </Text>

      <View style={{ marginTop: 16, gap: 12 }}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="link"
            onPress={() => router.push(hrefFor(item.key) as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              borderRadius: 16,
              padding: 16,
              backgroundColor: `${item.color}14`,
            }}
          >
            <View
              style={{
                height: 64,
                width: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
              }}
            >
              <Text style={{ fontSize: 30 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: 14, fontFamily: theme.family.bodySemi, color: INK }}
              >
                {item.examShort} {item.levelName}
              </Text>
              {item.subjectName ? (
                <Text
                  style={{
                    fontSize: 26,
                    lineHeight: 30,
                    fontFamily: theme.family.displayBold,
                    color: item.color,
                  }}
                >
                  {item.subjectName}
                </Text>
              ) : null}
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  fontFamily: theme.family.displayBold,
                  color: INK,
                }}
              >
                {item.levelName}
              </Text>
            </View>
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: item.color,
              }}
            >
              <Svg width={17} height={17} viewBox="0 0 20 20" fill="none">
                <Path
                  d="M4 10h11m0 0-4-4m4 4-4 4"
                  stroke="#fff"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** The full-screen "loading…" state the preparation screens share. */
export function PrepLoading({ label }: { label: string }) {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CANVAS }}
    >
      <Text style={{ fontSize: 13, fontFamily: theme.family.body, color: '#8b869e' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A whole listing screen, with the chrome the design gives every one of them.
 *
 * Notes, Videos, Tests, Batches, Practice, Doubts and Current Affairs are the
 * same screen in the mockups — a menu, a title over a subtitle, search and
 * updates on the right, then content — and they had each grown their own
 * arrangement instead: a native stack header with a bare title, a chip rail
 * against a different grey, no way to reach the drawer. This is that chrome in
 * one place, so a new listing gets it by wrapping rather than by remembering.
 *
 * `scroll` is off by default because most of these screens own a FlatList,
 * which has to do its own scrolling — nesting one inside a ScrollView is what
 * makes a long list stop recycling and stutter.
 */
export function Screen({
  title,
  subtitle,
  lang,
  back,
  scroll = false,
  children,
}: {
  title: string;
  subtitle: string;
  lang: Lang;
  /** Shown on anything pushed over a tab. */
  back?: boolean;
  scroll?: boolean;
  children: ReactNode;
}) {
  const Body = scroll ? ScrollView : View;
  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <PrepHeader
              title={title}
              subtitle={subtitle}
              onMenu={openMenu}
              back={back}
              lang={lang}
            />
            <Body
              style={{ flex: 1 }}
              {...(scroll ? { contentContainerStyle: { paddingBottom: 32 } } : {})}
            >
              {children}
            </Body>
          </SafeAreaView>
        </View>
      )}
    </PrepShell>
  );
}

/** Centres a listing's content in the same column the header uses. */
export function ScreenBody({ children, style }: { children: ReactNode; style?: object }) {
  const r = useResponsive();
  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: r.gutter,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A square tick box — the table checkbox the drafts queue selects rows with. */
export function CheckRow({ on }: { on: boolean }) {
  return (
    <View
      style={{
        height: 22,
        width: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: on ? VIOLET : '#d8d3ee',
        backgroundColor: on ? VIOLET : 'transparent',
      }}
    >
      {on ? (
        <Svg width={11} height={11} viewBox="0 0 14 14" fill="none">
          <Path
            d="M2.5 7.4 5.4 10.3 11.5 4.2"
            stroke="#fff"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
