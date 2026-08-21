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
  | 'play'
  | 'shield'
  | 'pillars'
  | 'school'
  | 'cap'
  | 'star'
  | 'tree'
  | 'palm'
  | 'lotus'
  | 'wheat'
  | 'mountain'
  | 'waves'
  | 'temple'
  | 'dome'
  | 'scroll'
  | 'medal'
  | 'scales'
  | 'paw';

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

  /* ------------------------------------------------------- exam motifs */
  shield: [
    { d: 'M12 3 20 6v5.4c0 4.6-3.2 7.8-8 9.6-4.8-1.8-8-5-8-9.6V6l8-3Z' },
    { d: 'm9 12 2 2 4-4' },
  ],
  pillars: [
    { d: 'm3 9 9-5 9 5' },
    { d: 'M4 20h16' },
    { d: 'M7 20v-9' },
    { d: 'M12 20v-9' },
    { d: 'M17 20v-9' },
  ],
  school: [
    { d: 'M12 3v3' },
    { d: 'm4 11 8-5 8 5' },
    { d: 'M6 11v9h12v-9' },
    { d: 'M10 20v-5h4v5' },
  ],
  cap: [
    { d: 'm2 8 10-4 10 4-10 4L2 8Z' },
    { d: 'M6 10.4V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.6' },
  ],
  star: [{ d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z' }],
  tree: [{ d: 'm12 3-5 7h10l-5-7Z' }, { d: 'm12 8-6 8h12l-6-8Z' }, { d: 'M12 16v5' }],
  palm: [
    { d: 'M12 21c.5-6 1-9.6 1.6-11.6' },
    { d: 'M13.6 9.4c-2.8-2.3-6-2.2-8.6.4' },
    { d: 'M13.6 9.4c3-2 6.2-1.4 8.4 1.2' },
    { d: 'M13.6 9.4c-.6-3 .6-5.6 3-7' },
  ],
  lotus: [
    { d: 'M12 19c-3.9 0-7-2.7-7-6 2.6 0 4.9 1.3 6 3' },
    { d: 'M12 19c3.9 0 7-2.7 7-6-2.6 0-4.9 1.3-6 3' },
    { d: 'M12 19c-2.2-1.7-3.5-4.2-3.5-7S9.8 6.7 12 5c2.2 1.7 3.5 4.2 3.5 7s-1.3 5.3-3.5 7Z' },
  ],
  wheat: [
    { d: 'M12 21V9' },
    { d: 'M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z' },
    { d: 'M12 13c3 0 5-2 5-5-3 0-5 2-5 5Z' },
    { d: 'M12 9c-2.5 0-4-1.7-4-4 2.5 0 4 1.7 4 4Z' },
    { d: 'M12 9c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4Z' },
  ],
  mountain: [{ d: 'm2 20 7-11 4 6 3-4 6 9Z' }, { d: 'm7.2 12.2 1.8 1.4 1.7-1.3' }],
  waves: [
    { d: 'M2 7c1.5-2 4.5-2 6 0s4.5 2 6 0 4.5-2 6 0' },
    { d: 'M2 12.5c1.5-2 4.5-2 6 0s4.5 2 6 0 4.5-2 6 0' },
    { d: 'M2 18c1.5-2 4.5-2 6 0s4.5 2 6 0 4.5-2 6 0' },
  ],
  temple: [
    { d: 'M12 3v1.5' },
    { d: 'm12 4.5 4.5 6.5h-9L12 4.5Z' },
    { d: 'M5 20V11h14v9' },
    { d: 'M10 20v-5h4v5' },
    { d: 'M3 20h18' },
  ],
  dome: [
    { d: 'M12 3v1.6' },
    { d: 'M7.5 11a4.5 4.5 0 0 1 9 0Z' },
    { d: 'M7 20v-9' },
    { d: 'M17 20v-9' },
    { d: 'M10.5 20v-4a1.5 1.5 0 0 1 3 0v4' },
    { d: 'M3.5 20h17' },
  ],
  scroll: [
    { d: 'M7 3h10a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z' },
    { d: 'M9 8h6' },
    { d: 'M9 12h6' },
    { d: 'M9 16h3' },
  ],
  medal: [{ c: [12, 15, 5] }, { d: 'M8.3 10.9 6 3h12l-2.3 7.9' }],
  scales: [
    { d: 'M12 4v16' },
    { d: 'M7 20h10' },
    { d: 'M3.5 7h17' },
    { d: 'm3.5 7-2 4.6h4L3.5 7Z' },
    { d: 'm20.5 7-2 4.6h4l-2-4.6Z' },
  ],
  paw: [
    { c: [6, 10.5, 2] },
    { c: [10.2, 6.8, 2] },
    { c: [14.8, 6.8, 2] },
    { c: [19, 10.5, 2] },
    { d: 'M12.5 12.6c2.8 0 5 2.1 5 4.4s-2.2 3.5-5 3.5-5-1.2-5-3.5 2.2-4.4 5-4.4Z' },
  ],
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

/**
 * Which icon stands for which exam.
 *
 * WHY NOT THE REAL LOGOS
 *
 * The obvious answer is each board's own crest, and it is not available to
 * this app. Most of these bodies — DSSSB, HSSC, HPSC and the state education
 * boards — carry the State Emblem of India on their logo, and section 3 of the
 * State Emblem of India (Prohibition of Improper Use) Act, 2005 bars a private
 * body from using the emblem, or any imitation of it, commercially or in any
 * way that suggests a government connection. The remainder — CBSE, KVS, NVS —
 * are ordinary trademarked crests belonging to somebody else. Neither can be
 * shipped, and a study app that looks government-issued is a worse problem to
 * have than a plain one.
 *
 * So each exam gets a motif instead: what the place or the body is known for,
 * drawn at the same stroke weight as every other icon and tinted with the
 * exam's own `color` from the database. Motifs repeat on purpose — four hill
 * states share a mountain — because the acronym on the card is what identifies
 * the exam. The icon is there to make the grid scannable, not to name it.
 *
 * An exam with no entry gets a graduation cap, which is true of all of them.
 */
const EXAM_ICONS: Record<string, IconName> = {
  ctet: 'shield',
  kvs: 'school',
  nvs: 'tree',
  awes: 'medal',
  emrs: 'mountain',

  dsssb: 'pillars',
  tstet: 'pillars',
  'hpsc-pgt': 'scales',
  'hssc-tgt-pgt': 'cap',

  htet: 'wheat',
  pstet: 'wheat',
  supertet: 'star',
  bihartet: 'lotus',

  uptet: 'dome',
  reet: 'dome',
  mahatet: 'dome',

  otet: 'temple',
  tntet: 'temple',
  kartet: 'temple',

  hptet: 'mountain',
  utet: 'mountain',
  sktet: 'mountain',

  jtet: 'tree',
  ktet: 'palm',
  aptet: 'waves',
  wbtet: 'waves',
  mptet: 'paw',
  gtet: 'paw',
};

export const examIcon = (examId: string | undefined): IconName =>
  (examId && EXAM_ICONS[examId]) || 'cap';
