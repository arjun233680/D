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
import { ExamMark } from '@/components/exam-mark';

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

/**
 * The cap-and-books mark.
 *
 * Decoration, and no longer drawn by the step chrome — it was the third thing
 * on a row that reads better with two. Kept because it is the app's own
 * drawing and a step that wants a picture should not have to redraw it.
 */
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

/**
 * The one row above every heading: where you can go back, and how far along
 * you are.
 *
 * It used to carry three things — the arrow, a rail of numbered circles, and
 * the books — bunched together on the left with the art jammed into the right
 * edge. Five shapes on one line, above an eyebrow and a headline, read as
 * clutter. Now it holds two, at opposite ends, with the whole width between
 * them; the art is gone from the step chrome entirely.
 */
/** The violet chip that notes the answer a previous step already took. */
export function EyebrowPill({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#efeafe',
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 13, fontFamily: theme.family.displayBold, color: VIOLET }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * How far along you are: one bar across the top of the step.
 *
 * This has been four things, and the last three were all attempts to put it
 * somewhere clever. Three anonymous bars in the header gave a proportion and
 * no position. Naming the step fixed that and crowded the row. Moving it into
 * the Continue button put the mark and the label in the same place, and they
 * fought: a pale fill cannot carry white type, and dark type on a violet
 * call-to-action is worse than either.
 *
 * So it is a plain bar, first thing on the screen, spanning the content — the
 * one place nothing else wants and every reader looks first. The button goes
 * back to being a button.
 */
export function StepProgress({
  done,
  total,
  width,
}: {
  /** Steps finished, counting the one on screen. */
  done: number;
  /** How many there are in all. */
  total: number;
  width?: number;
}) {
  /*
   * Not always three.
   *
   * Onboarding asks for exams, then levels, then a subject *per level* — and a
   * learner who teaches both TGT and PGT answers the subject question twice,
   * because the two lists barely overlap. Hard-coding three told that learner
   * they were finished with a screen still to go.
   *
   * The subject step knows how many levels it has to get through, so it says
   * so. The two steps before it cannot know yet — nobody has picked a level —
   * and assume the common single-level case; being one screen optimistic at
   * the start is a far smaller lie than being wrong at the end.
   */
  const h = width ? 5 : 6;
  const pct = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${done} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={{
        height: h,
        width,
        borderRadius: 999,
        backgroundColor: '#E9E3FB',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: h,
          width: `${pct * 100}%`,
          borderRadius: 999,
          backgroundColor: VIOLET,
        }}
      />
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
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 16,
        backgroundColor: '#f4f1fd',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      {/* Drawn, not 💡. An emoji is a different typeface on every platform —
          flat and outlined on one, a glossy yellow render on another — so the
          one decorative mark on the screen was the one thing that could not be
          made to match the rest of it. This is the violet the strip is
          already tinted with. */}
      <Svg width={17} height={17} viewBox="0 0 20 20" fill="none" style={{ marginTop: 1 }}>
        {/* The glass, lit. A bulb outlined in violet was a violet shape that
            happened to be bulb-suggested; the colour is most of what makes it
            read as one at 17pt. */}
        <Path
          d="M10 2.4a5.2 5.2 0 0 0-3.1 9.4c.5.4.8 1 .8 1.6h4.6c0-.6.3-1.2.8-1.6A5.2 5.2 0 0 0 10 2.4Z"
          fill="#FFD44D"
        />
        <Path
          d="M7.6 15.2h4.8M8.4 17.6h3.2M10 2.4a5.2 5.2 0 0 0-3.1 9.4c.5.4.8 1 .8 1.6h4.6c0-.6.3-1.2.8-1.6A5.2 5.2 0 0 0 10 2.4Z"
          stroke="#E0A106"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          lineHeight: 22,
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
        /*
         * Laid out, not positioned.
         *
         * This bar has now been wrong three ways. `absolute` drifted while a
         * phone browser hid its address bar, because the box it was pinned to
         * kept changing height. `fixed` stopped the drift and lost the button
         * altogether on step 2, because expo-router animates a pushed screen
         * with a transform and a transformed ancestor captures `fixed`. Back
         * to `absolute` with the app bounded to `100dvh`, it measured
         * correctly in an emulator and was still missing on a real handset.
         *
         * So it is not positioned at all any more. The screen is a flex
         * column, the list takes the space that is left, and the bar is the
         * last child — which is the bottom by construction. There is no
         * viewport to resolve against, nothing to be captured by a transform,
         * and no unit for a browser to disagree about.
         *
         * The screens no longer pad their lists to clear it either; nothing is
         * underneath it to clear.
         */
      }}
      /* The bar spans the window so nothing shows past its edges, but its
         surface is drawn on the column inside — otherwise a desktop browser
         gets a full-width strip under a 420pt app. */
    >
      <View
        style={{
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: r.gutter,
          paddingTop: 12,
          paddingBottom: 16 + insets.bottom,
          /* No rule and no surface of its own. The border drew a line across
             the screen and the padding above it read as a card the button was
             sitting in — a container around a single control that needed no
             container. The button sits on the page background instead. */
          backgroundColor: CANVAS,
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
            /* Its own violet, not grey. A saturated control over a grey
               shadow always reads as an accident; over its own hue it reads
               as lit. Dropped while the button is inert, because a dead
               control should not look like it is floating. */
            ...(off ? null : theme.shadow.raised),
            /*
             * The button's own colour, under the gradient.
             *
             * It had none: the violet came entirely from `GradientFill`, an
             * SVG parked at `zIndex: -1`, and the label is white. Where that
             * SVG does not paint inside its parent the button becomes white
             * text on white canvas — present, laid out, tappable, invisible.
             * That is what "the continue button is missing" turned out to be,
             * and it is why every measurement of it read correct: the box was
             * always there.
             *
             * The same trick already cost this app the arrow on every gradient
             * button once. A solid colour underneath costs nothing and cannot
             * fail; the gradient is a sheen on top of it, not the button.
             */
            backgroundColor: VIOLET,
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
        </Pressable>
      </View>
    </View>
  );
}

/**
 * How much room a screen must leave at the foot of its scroll for
 * `ContinueBar`, which is no longer underneath anything — the bar is the last
 * child of a flex column now, not a layer over the list. What is left is
 * breathing room so the final card does not sit flush against the bar's rule.
 */
export const BAR_CLEARANCE = 24;

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
  /*
   * No card around it. The strip used to sit on a violet panel, which put a
   * card inside the step and a tinted tile inside that — three boxes deep
   * before the mark. It is a reminder of what was tapped a screen ago, not a
   * thing to tap, so it reads as a line of marks and names.
   *
   * Every item was pinned to 230pt whatever it held. Two exams then wanted
   * 474pt of a 343pt row, so the second ran off the right edge, and CTET's
   * short name floated in the middle of a box sized for a long one — which is
   * the field of empty strip that showed up between them. Sized by content
   * instead, and the arithmetic then decides the rest: 375pt of screen less
   * the gutters leaves 343, two items and the gap between them have to fit
   * inside that, and at the single-exam mark size they cannot. The mark gives
   * up ten points when there is more than one, which is what buys the second
   * exam its full name. A third scrolls.
   */
  const many = items.length > 1;
  return (
    // Close under the heading it belongs to. 26 was set while a chip sat
    // between the two and needed clearing; nothing is between them now.
    <View style={{ marginTop: 12 }}>
      {title ? (
        <Text
          style={{
            marginBottom: 8,
            fontSize: 12,
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
        contentContainerStyle={{ gap: many ? 12 : 14 }}
      >
        {items.map((e) => (
          <View
            key={e.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: many ? 6 : 12,
              // Sized by what it holds. A fixed width is what ran the second
              // exam off the edge and spaced the two of them a strip apart.
              maxWidth: many ? undefined : 230,
            }}
          >
            <ExamMark exam={{ id: e.id, color: e.color }} size={many ? 58 : 68} />
            <View style={{ flexShrink: 1, minWidth: 0, maxWidth: many ? 100 : undefined }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Ink, not the exam's own colour. HTET's green against a
                    violet chip, violet button and a blue-and-orange grid put
                    four unrelated hues on one screen. The exam colour still
                    identifies the exam — it is the ground its mark sits on,
                    right beside this — so the name does not have to shout it
                    a second time. */}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 18,
                    fontFamily: theme.family.displayBold,
                    color: INK,
                  }}
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
                  marginTop: 3,
                  fontSize: 14,
                  lineHeight: 19,
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

/**
 * The heading block each step opens with.
 *
 * Three lines of type stacked four and six points apart, the top one violet
 * and bold directly above a bold headline, made two headlines fighting. The
 * eyebrow is a quiet chip now — it reads as a note about what you already did,
 * which is what it is — and the gaps are large enough that the headline is
 * plainly the thing to read first.
 */
export function StepHeader({
  eyebrow,
  title,
  subtitle,
  leading,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /**
   * Something to sit on the heading's left — in practice the back arrow.
   *
   * A 44pt arrow on its own row leaves the rest of that row empty and pushes
   * the question down a full line for nothing. Beside the heading it uses
   * width that was already blank, and the screen opens on the exams instead
   * of on canvas. The heading keeps the rest of the row, so a long title
   * still wraps rather than shrinking.
   */
  leading?: ReactNode;
  /**
   * Something to sit on the heading's right — in practice the step count.
   *
   * Same argument as `leading` from the other end: the arrow and the counter
   * were holding down a 44pt row between them with nothing in the middle,
   * while the question they belong to started underneath it. On the heading's
   * own line all three fit, and the screen opens on the answer list.
   */
  trailing?: ReactNode;
}) {
  const r = useResponsive();
  const heading = (
    <Text
      style={{
        marginTop: eyebrow ? 16 : 0,
        flexShrink: leading || trailing ? 1 : undefined,
        fontSize: r.isPhone ? 26 : 32,
        lineHeight: r.isPhone ? 34 : 40,
        fontFamily: theme.family.displayBold,
        color: INK,
      }}
    >
      {title}
    </Text>
  );
  return (
    // With no chip above it the heading is the first thing on the screen, and
    // a 24pt gap under a bare back arrow is just blank canvas — it starts
    // close to the top instead, which is a row of exam cards earned back.
    // Tight under the row above. That row is the arrow, the note and the
    // progress bar — chrome the heading follows directly, not a block it has
    // to separate itself from.
    <View style={{ marginTop: eyebrow ? 24 : 0 }}>
      {eyebrow ? <EyebrowPill label={eyebrow} /> : null}
      {leading || trailing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {leading}
          {heading}
          {/* Takes the slack so the trailing mark stays pinned right however
              short the heading is. */}
          {trailing ? <View style={{ flex: 1, alignItems: 'flex-end' }}>{trailing}</View> : null}
        </View>
      ) : (
        heading
      )}
      {subtitle ? (
        <Text
          style={{
            marginTop: 6,
            // Under the heading rather than under the arrow beside it: 44pt of
            // button and the 12pt gap, so the supporting line starts where the
            // title starts and the two read as one block.
            marginLeft: leading ? 56 : 0,
            textAlign: 'justify',
            fontSize: 15,
            lineHeight: 21,
            fontFamily: theme.family.body,
            color: MUTED,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
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
