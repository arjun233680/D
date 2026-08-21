import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * The line icons, drawn rather than typed.
 *
 * WHY THIS REPLACES THE EMOJI
 *
 * Every icon in this app used to be an emoji character — 📖 for notes, 🎯 for
 * mock tests, 📄 for a paper. They are quick to write and they are the wrong
 * tool three times over:
 *
 *   - They are somebody else's artwork. 📖 is a different drawing on iOS, on
 *     Android, on a Samsung, and on a browser, so the one screen renders four
 *     ways and none of them was designed.
 *   - They cannot take a colour. A design that tints an icon to its subject —
 *     violet for CDP, green for Biology — cannot do it with a glyph that
 *     carries its own palette.
 *   - They sit on the text baseline and carry their own padding, which is why
 *     an emoji in a 40pt tile never quite centres.
 *
 * These are the same 2.35-weight stroke set the prototype uses, at 24×24 with
 * `currentColor`, so one icon serves every tint the design asks for and looks
 * identical on every device.
 *
 * Add one by adding a path here. Screens name them by key, never by drawing.
 */

export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'bell'
  | 'arrow'
  | 'back'
  | 'home'
  | 'book'
  | 'test'
  | 'chart'
  | 'user'
  | 'bookmark'
  | 'bolt'
  | 'flask'
  | 'users'
  | 'hindi'
  | 'letter'
  | 'calculator'
  | 'brain'
  | 'globe'
  | 'atom'
  | 'leaf'
  | 'clock'
  | 'calendar'
  | 'target'
  | 'plan'
  | 'help'
  | 'news'
  | 'play';

/**
 * Each icon as the elements it is made of.
 *
 * Kept as data rather than as twenty components so the set can be iterated —
 * a subject rail maps a subject to a key and renders it without a switch.
 */
const PATHS: Record<IconName, { d?: string; c?: [number, number, number]; r?: number[] }[]> = {
  menu: [{ d: 'M4 6h16' }, { d: 'M4 12h16' }, { d: 'M4 18h16' }],
  close: [{ d: 'M18 6 6 18' }, { d: 'm6 6 12 12' }],
  search: [{ c: [11, 11, 7] }, { d: 'm20 20-3.5-3.5' }],
  bell: [{ d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9' }, { d: 'M10 21h4' }],
  arrow: [{ d: 'm9 18 6-6-6-6' }],
  back: [{ d: 'm15 18-6-6 6-6' }],
  home: [{ d: 'm3 11 9-8 9 8' }, { d: 'M5 10v10h14V10' }, { d: 'M9 20v-6h6v6' }],
  book: [
    { d: 'M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-1.5Z' },
    { d: 'M8 7h7' },
    { d: 'M8 11h7' },
  ],
  test: [
    { d: 'M9 11 12 14 22 4' },
    { d: 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  ],
  chart: [{ d: 'M4 19h16' }, { d: 'M7 16V9' }, { d: 'M12 16V5' }, { d: 'M17 16v-3' }],
  user: [{ d: 'M20 21a8 8 0 0 0-16 0' }, { c: [12, 7, 4] }],
  bookmark: [{ d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z' }],
  bolt: [{ d: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z' }],
  flask: [
    { d: 'M9 3h6' },
    { d: 'M10 3v6l-5.5 9A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3' },
    { d: 'M7 16h10' },
  ],
  users: [
    { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
    { c: [9, 7, 4] },
    { d: 'M22 21v-2a4 4 0 0 0-3-3.9' },
    { d: 'M16 3.1a4 4 0 0 1 0 7.8' },
  ],
  hindi: [{ d: 'M4 5h16' }, { d: 'M8 5v14' }, { d: 'M8 12h7' }, { d: 'M15 5v14' }],
  letter: [{ d: 'M4 20 11 4h2l7 16' }, { d: 'M7 14h10' }],
  calculator: [
    { r: [4, 3, 16, 18, 2] },
    { d: 'M8 7h8' },
    { d: 'M8 11h.01' },
    { d: 'M12 11h.01' },
    { d: 'M16 11h.01' },
    { d: 'M8 15h.01' },
    { d: 'M12 15h.01' },
    { d: 'M16 15h.01' },
  ],
  brain: [
    { d: 'M8 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3' },
    { d: 'M16 5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3' },
    { d: 'M12 4v16' },
    { d: 'M8 9h4' },
    { d: 'M12 15h4' },
  ],
  globe: [
    { c: [12, 12, 10] },
    { d: 'M2 12h20' },
    { d: 'M12 2a15.3 15.3 0 0 1 0 20' },
    { d: 'M12 2a15.3 15.3 0 0 0 0 20' },
  ],
  atom: [
    { c: [12, 12, 1] },
    { d: 'M20.2 20.2c2.5-2.5.6-8.5-4.2-13.2S5.3.3 2.8 2.8s-.6 8.5 4.2 13.2 10.7 6.7 13.2 4.2Z' },
    { d: 'M20.2 3.8c2.5 2.5.6 8.5-4.2 13.2S5.3 23.7 2.8 21.2.3 12.7 5 8s12.7-6.7 15.2-4.2Z' },
  ],
  leaf: [
    { d: 'M11 20A7 7 0 0 1 4 13c0-6 9-9 16-9 0 7-3 16-9 16Z' },
    { d: 'M4 20c4-5 8-8 16-16' },
  ],
  clock: [{ c: [12, 12, 10] }, { d: 'M12 6v6l4 2' }],
  calendar: [{ r: [3, 4, 18, 18, 2] }, { d: 'M16 2v4' }, { d: 'M8 2v4' }, { d: 'M3 10h18' }],
  target: [{ c: [12, 12, 9] }, { c: [12, 12, 5] }, { c: [12, 12, 1] }, { d: 'm15 9 5-5' }],
  plan: [
    { d: 'M8 2v4' },
    { d: 'M16 2v4' },
    { r: [3, 4, 18, 18, 2] },
    { d: 'M8 12h8' },
    { d: 'M8 16h5' },
  ],
  help: [
    { c: [12, 12, 10] },
    { d: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4' },
    { d: 'M12 17h.01' },
  ],
  news: [
    { d: 'M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z' },
    { d: 'M8 8h6' },
    { d: 'M8 12h8' },
    { d: 'M8 16h5' },
  ],
  play: [{ d: 'M8 5v14l11-7Z' }],
};

/** `play` is the one solid glyph; everything else is a stroke. */
const FILLED: IconName[] = ['play'];

export function Icon({
  name,
  size = 21,
  color = 'currentColor',
  strokeWidth = 2.35,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const parts = PATHS[name] ?? PATHS.book;
  const solid = FILLED.includes(name);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {parts.map((part, index) => {
        if (part.c) {
          const [cx, cy, r] = part.c;
          return (
            <Circle
              key={index}
              cx={cx}
              cy={cy}
              r={r}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          );
        }
        if (part.r) {
          const [x, y, w, h, rx] = part.r;
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={rx}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          );
        }
        return (
          <Path
            key={index}
            d={part.d}
            stroke={solid ? 'none' : color}
            fill={solid ? color : 'none'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

/**
 * Which icon stands for which subject.
 *
 * The prototype pairs each one with a colour too, but colour already comes from
 * the database — `subjects.color` — so only the drawing is decided here. A
 * subject with no entry falls back to a book rather than to nothing.
 */
const SUBJECT_ICONS: Record<string, IconName> = {
  cdp: 'users',
  hindi: 'hindi',
  english: 'letter',
  math: 'calculator',
  'numerical-aptitude': 'calculator',
  reasoning: 'brain',
  'haryana-gk': 'globe',
  gk: 'globe',
  evs: 'leaf',
  science: 'atom',
  physics: 'atom',
  chemistry: 'flask',
  biology: 'leaf',
  'social-science': 'globe',
  sanskrit: 'letter',
  'computer-science': 'calculator',
};

export const subjectIcon = (subjectId: string | undefined): IconName =>
  (subjectId && SUBJECT_ICONS[subjectId]) || 'book';
