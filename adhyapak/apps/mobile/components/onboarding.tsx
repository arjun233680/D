import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { theme } from '@adhyapak/core';
import { useResponsive } from '@/lib/responsive';

/**
 * The furniture every onboarding step shares — the native half of
 * apps/web/app/onboarding/ui.tsx.
 *
 * Three screens ask three questions with the same frame: a back arrow, a
 * progress rail, a heading over an illustration, a list, and a violet button
 * pinned to the bottom. Kept here rather than copied so the second and third
 * steps cannot drift from the first.
 *
 * This lives in `components/` and not in `app/onboarding/`, because expo-router
 * turns every file under `app/` into a route: a `ui.tsx` next to the steps
 * would quietly publish itself at `/onboarding/ui`.
 *
 * Three things change from the web original, and only these three:
 *   - `position: fixed` becomes an absolutely positioned bar plus the real safe
 *     area inset, so the button clears the home indicator rather than sitting
 *     under it.
 *   - CSS gradients become an `<Svg>` fill; the phone build has no
 *     expo-linear-gradient and this needs no new dependency.
 *   - Every tappable thing is at least 44pt, which the web's 18px checkbox is
 *     not — it is a pointer target there and a thumb target here.
 */

export const VIOLET = '#6d4aed';
export const VIOLET_LIGHT = '#8b5cf6';
export const INK = '#1e1b4b';
export const MUTED = '#6b7280';
export const FAINT = '#8b869e';
export const LINE = '#eceaf6';
export const CANVAS = '#faf9ff';
/** The tinted fill a selected card takes. */
export const PICKED_BG = '#f8f6ff';

/** Hex at ~10% alpha, the tint every icon tile uses behind an exam colour. */
export const tint = (hex: string) => `${hex}1a`;

/* --------------------------------------------------------------- gradient */

/**
 * The violet sweep the web app gets from `linear-gradient(90deg, …)`.
 *
 * Absolutely filled behind its parent rather than drawn as a background, since
 * React Native has no gradient colour. Callers give the parent the radius and
 * `overflow: 'hidden'`, and this paints inside it.
 */
export function GradientFill({ from = VIOLET, to = VIOLET_LIGHT }: { from?: string; to?: string }) {
  return (
    /*
     * `zIndex: -1` is what makes the icons on top of this visible.
     *
     * react-native-web gives View and Text `position: relative`, so a label
     * beside this fill paints above it and looks right. `react-native-svg`
     * renders a bare <svg>, which stays unpositioned — and CSS paints
     * positioned elements above unpositioned siblings whatever the DOM order,
     * so an absolutely positioned gradient covered every icon drawn next to it.
     * The login logo was an empty violet tile, the phone glyph on its card was
     * missing, and the arrow on every gradient button had quietly gone.
     *
     * Sending the fill behind the in-flow content fixes all of them at once,
     * and it stays visible because the parent it fills has no background of its
     * own — a negative z-index sits above the parent's background, not below it.
     */
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ icons */

export function Tick({ small = false, color = '#fff' }: { small?: boolean; color?: string }) {
  const size = small ? 10 : 13;
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path
        d="M2.5 7.4 5.4 10.3 11.5 4.2"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Arrow({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ color = FAINT }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Circle cx={9} cy={9} r={6} stroke={color} strokeWidth={1.9} />
      <Path d="m13.6 13.6 3.4 3.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

/** The cap-and-books mark that sits in every step's top corner. Decoration. */
export function BooksArt({ width = 86 }: { width?: number }) {
  const height = (width / 180) * 130;
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Circle cx={140} cy={30} r={34} fill="#efecfd" />
      <Circle cx={96} cy={72} r={16} fill="#f3f0fd" />
      <Path d="M60 74c-9-3-14-11-12-19 9-1 17 4 19 12" fill="#34c77b" opacity={0.8} />
      <Rect x={66} y={86} width={96} height={14} rx={4} fill="#7c5cf7" />
      <Rect x={66} y={86} width={96} height={5} rx={2.5} fill="#9b83fa" />
      <Rect x={72} y={100} width={88} height={14} rx={4} fill="#fbc02d" />
      <Rect x={72} y={100} width={88} height={5} rx={2.5} fill="#fdd460" />
      <Rect x={62} y={114} width={102} height={13} rx={4} fill="#eef1fb" />
      <Path d="M113 40 158 56l-45 16-45-16 45-16Z" fill="#5b46d6" />
      <Path d="M113 58v22" stroke="#4a37bd" strokeWidth={3} strokeLinecap="round" />
      <Path d="M88 64v13c0 5 11 9 25 9s25-4 25-9V64l-25 9-25-9Z" fill="#6d4aed" />
    </Svg>
  );
}

/* ------------------------------------------------------------- step chrome */

/** The three dots at the top. Filled behind you, ringed ahead. */
export function StepRail({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {([1, 2, 3] as const).map((n) => {
        const done = n < step;
        const here = n === step;
        return (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {n > 1 ? (
              <View
                style={{
                  height: 2,
                  width: 28,
                  borderRadius: 999,
                  backgroundColor: n <= step ? VIOLET : '#ded9f3',
                }}
              />
            ) : null}
            <View
              style={{
                height: 28,
                width: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done || here ? VIOLET : '#efecfa',
              }}
            >
              {done ? (
                <Tick />
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: theme.family.displayBold,
                    color: here ? '#fff' : '#a8a3bd',
                  }}
                >
                  {n}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The back arrow.
 *
 * `router.back()` when there is somewhere to go back to, and `fallback` for the
 * learner who landed here directly — a deep link, or a relaunch that restored
 * this screen — where going back would leave the app entirely.
 */
export function BackButton({ fallback }: { fallback: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={{
        height: 44,
        width: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: '#fff',
      }}
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
  );
}

/** The tip strip above the button: "you can change this later". */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 16,
        backgroundColor: '#f4f1fd',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ fontSize: 15 }}>💡</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 12.5,
          lineHeight: 19,
          fontFamily: theme.family.body,
          color: '#5c5875',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** A red line that says what failed, in the learner's language. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#fdecec',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12.5,
          lineHeight: 19,
          fontFamily: theme.family.body,
          color: '#b42318',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** A tick in a circle — the checkbox on every selectable card. */
export function CheckDot({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: on ? VIOLET : '#d8d3ee',
        backgroundColor: on ? VIOLET : 'transparent',
      }}
    >
      {on ? <Tick small /> : null}
    </View>
  );
}

/**
 * The violet action pinned to the foot of every step.
 *
 * The web version is `position: fixed`; here it is absolute against the screen
 * with the safe-area inset added underneath, so the button sits above the home
 * indicator instead of behind it. Screens leave room for it with
 * `contentContainerStyle.paddingBottom` — see `BAR_CLEARANCE`.
 */
export function ContinueBar({
  onPress,
  disabled,
  busy,
  label,
  children,
}: {
  onPress: () => void;
  disabled: boolean;
  busy?: boolean;
  label: string;
  /** Anything shown above the button — an error, a selection summary. */
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const off = disabled || busy;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 1,
        borderTopColor: '#eeebf8',
        backgroundColor: CANVAS,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: r.gutter,
          paddingVertical: 16,
        }}
      >
        {children}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!off }}
          onPress={onPress}
          disabled={off}
          style={{
            marginTop: 12,
            borderRadius: 16,
            overflow: 'hidden',
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: off ? 0.45 : 1,
          }}
        >
          <GradientFill />
          <Text
            style={{
              fontSize: 16,
              fontFamily: theme.family.displayBold,
              color: '#fff',
            }}
          >
            {label}
          </Text>
          <Arrow />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * How much room a screen must leave at the foot of its scroll for
 * `ContinueBar`. Measured, now that the bar is a button and nothing else:
 * 16pt of padding, a 56pt button, 12pt above it and 16pt below, then room for
 * a home indicator. 190 was sized for the selection summary the exam chooser
 * used to stack on top, and left a hand's width of blank canvas under the last
 * row on every step.
 *
 * Still generous by 40pt, because the bar grows when it carries an error line
 * and content hidden behind it is content nobody can reach.
 */
export const BAR_CLEARANCE = 148;

/**
 * The strip of already-chosen exams that steps 2 and 3 carry at the top.
 *
 * Not decoration: the question underneath it is "which level", and the honest
 * answer depends on which exams are in play. Showing them keeps the learner
 * from having to remember what they tapped on the previous screen.
 */
export function ChosenExams({
  items,
  title,
}: {
  items: { id: string; shortName: string; subtitle: string; emoji: string; color: string }[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <View
      style={{
        marginTop: 20,
        borderRadius: 16,
        backgroundColor: '#f4f1fd',
        paddingVertical: 12,
      }}
    >
      {title ? (
        <Text
          style={{
            marginBottom: 8,
            paddingHorizontal: 16,
            fontSize: 12.5,
            fontFamily: theme.family.displayBold,
            color: VIOLET,
          }}
        >
          {title}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 12 }}
      >
        {items.map((e) => (
          <View
            key={e.id}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: 170 }}
          >
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tint(e.color),
              }}
            >
              <Text style={{ fontSize: 18 }}>{e.emoji}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ fontSize: 14, fontFamily: theme.family.displayBold, color: e.color }}
                >
                  {e.shortName}
                </Text>
                <View
                  style={{
                    height: 15,
                    width: 15,
                    borderRadius: 7.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: VIOLET,
                  }}
                >
                  <Tick small />
                </View>
              </View>
              <Text
                numberOfLines={2}
                style={{
                  marginTop: 2,
                  fontSize: 11.5,
                  lineHeight: 15,
                  fontFamily: theme.family.body,
                  color: MUTED,
                }}
              >
                {e.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** The heading block each step opens with, art tucked into the top corner. */
export function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const r = useResponsive();
  const artWidth = r.isPhone ? 86 : 160;
  return (
    <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        {eyebrow ? (
          <Text style={{ fontSize: 15, fontFamily: theme.family.displayBold, color: VIOLET }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            marginTop: 4,
            fontSize: r.isPhone ? 26 : 32,
            lineHeight: r.isPhone ? 32 : 38,
            fontFamily: theme.family.displayBold,
            color: INK,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              marginTop: 6,
              fontSize: 14,
              lineHeight: 20,
              fontFamily: theme.family.body,
              color: MUTED,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <BooksArt width={artWidth} />
    </View>
  );
}

/** The full-screen "fetching…" state all three steps share. */
export function StepLoading({ label }: { label: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CANVAS,
      }}
    >
      <Text style={{ fontSize: 13, fontFamily: theme.family.body, color: FAINT }}>{label}</Text>
    </View>
  );
}
