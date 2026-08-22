import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, subjectIcon, type IconName } from '@/components/icons';

/**
 * The picture on a subject or level card.
 *
 * Drawn strokes read well but look like what they are — a line icon. These are
 * pictures: one PNG per subject, bundled rather than typed, so 🔬 is the same
 * drawing on every phone instead of a different one per manufacturer.
 *
 * Microsoft's Fluent 3D renders, which are modelled and lit rather than drawn
 * flat — the flat set that came before them read as the phone keyboard's own
 * stickers pasted onto cards. `scripts/emoji-art.py` fetches them and says
 * where they come from, including why they are not photographs.
 *
 * Both maps fall back to the stroke set. A subject the database has and this
 * file does not still gets a mark, which matters because the subject list is a
 * table, not a constant.
 *
 * Metro resolves `require` at build time, so neither map can be built from a
 * template string.
 */
const SUBJECT_ART: Record<string, number> = {
  art: require('../assets/subject-art/art.png'),
  biology: require('../assets/subject-art/biology.png'),
  cdp: require('../assets/subject-art/cdp.png'),
  chemistry: require('../assets/subject-art/chemistry.png'),
  commerce: require('../assets/subject-art/commerce.png'),
  computer: require('../assets/subject-art/computer.png'),
  'computer-science': require('../assets/subject-art/computer-science.png'),
  economics: require('../assets/subject-art/economics.png'),
  english: require('../assets/subject-art/english.png'),
  evs: require('../assets/subject-art/evs.png'),
  'fine-arts': require('../assets/subject-art/fine-arts.png'),
  geography: require('../assets/subject-art/geography.png'),
  gk: require('../assets/subject-art/gk.png'),
  gujarati: require('../assets/subject-art/gujarati.png'),
  'haryana-gk': require('../assets/subject-art/haryana-gk.png'),
  hindi: require('../assets/subject-art/hindi.png'),
  history: require('../assets/subject-art/history.png'),
  'home-science': require('../assets/subject-art/home-science.png'),
  kannada: require('../assets/subject-art/kannada.png'),
  malayalam: require('../assets/subject-art/malayalam.png'),
  marathi: require('../assets/subject-art/marathi.png'),
  math: require('../assets/subject-art/math.png'),
  'maths-science': require('../assets/subject-art/maths-science.png'),
  music: require('../assets/subject-art/music.png'),
  nepali: require('../assets/subject-art/nepali.png'),
  odia: require('../assets/subject-art/odia.png'),
  'physical-education': require('../assets/subject-art/physical-education.png'),
  physics: require('../assets/subject-art/physics.png'),
  'political-science': require('../assets/subject-art/political-science.png'),
  psychology: require('../assets/subject-art/psychology.png'),
  punjabi: require('../assets/subject-art/punjabi.png'),
  'quantitative-aptitude': require('../assets/subject-art/quantitative-aptitude.png'),
  reasoning: require('../assets/subject-art/reasoning.png'),
  sanskrit: require('../assets/subject-art/sanskrit.png'),
  science: require('../assets/subject-art/science.png'),
  sociology: require('../assets/subject-art/sociology.png'),
  sst: require('../assets/subject-art/sst.png'),
  tamil: require('../assets/subject-art/tamil.png'),
  telugu: require('../assets/subject-art/telugu.png'),
  urdu: require('../assets/subject-art/urdu.png'),
};

/** `other` is a typographic ellipsis, which has no artwork; it draws instead. */
/**
 * The colour each level's art is actually painted in.
 *
 * Sampled off the PNGs rather than guessed, and deliberately not the `color`
 * on the level row — that one has PRT green while the art is a blue "abc"
 * tile, so type tinted from it sat next to a picture it did not match. Each is
 * the art's dominant hue taken a couple of steps darker, because the tones
 * that read well as a 60pt illustration are too light to read as type.
 */
export const LEVEL_ART_COLOR: Record<string, string> = {
  prt: '#2E7FE0',
  tgt: '#1596C4',
  pgt: '#C24E22',
};

const LEVEL_ART: Record<string, number> = {
  prt: require('../assets/level-art/prt.png'),
  pgt: require('../assets/level-art/pgt.png'),
  tgt: require('../assets/level-art/tgt.png'),
};

function Mark({
  art,
  icon,
  color,
  size,
}: {
  art: number | undefined;
  icon: IconName;
  color: string;
  size: number;
}) {
  return (
    <View style={{ height: size, width: size, alignItems: 'center', justifyContent: 'center' }}>
      {art ? (
        <Image
          source={art}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ height: size, width: size }}
        />
      ) : (
        <Icon name={icon} size={Math.round(size * 0.72)} color={color} />
      )}
    </View>
  );
}

export function SubjectMark({
  subjectId,
  color,
  size = 44,
}: {
  subjectId: string;
  color: string;
  size?: number;
}) {
  return (
    <Mark art={SUBJECT_ART[subjectId]} icon={subjectIcon(subjectId)} color={color} size={size} />
  );
}

export function LevelMark({
  levelId,
  color,
  size = 46,
}: {
  levelId: string;
  color: string;
  size?: number;
}) {
  /*
   * PGT is drawn; the rest are painted.
   *
   * Its art file is a book, and a book is what TGT's file is too — so the two
   * senior levels arrived as the same object in two colours and the design's
   * figure never appeared. A post-graduate teacher is a person in a cap, which
   * is what this draws, in the orange the rest of that card already uses.
   */
  if (levelId === 'pgt') return <GraduateMark color={PGT_COLOR} size={size} />;
  return <Mark art={LEVEL_ART[levelId]} icon="plan" color={color} size={size} />;
}

/**
 * Orange, and a cleaner one than the level row carries.
 *
 * PRT and TGT both arrive blue, so this is the one mark with room to be warm,
 * and warm is what tells the senior level apart at a glance. The row's own
 * `color` is a muddier brick (#D86030) that was mixed for a painted book, not
 * for a flat figure; this is the same hue with the grey taken out, and taken
 * light — the figure is a solid silhouette, so a saturated orange at that size
 * shouted over the two blue marks it sits between.
 */
const PGT_COLOR = '#FBA24A';

/** A figure in a mortarboard: the mark for the post-graduate level. */
function GraduateMark({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Shoulders. */}
      <Path
        d="M9 41c0-7.7 6.7-13 15-13s15 5.3 15 13v1H9v-1Z"
        fill={color}
      />
      <Path d="M20 30h8v6a4 4 0 0 1-8 0v-6Z" fill={color} opacity={0.55} />
      {/* Head. */}
      <Circle cx={24} cy={21} r={8} fill={color} opacity={0.85} />
      {/* The cap, and its tassel. */}
      <Path d="M24 5 42 13 24 21 6 13l18-8Z" fill={color} />
      <Path d="M24 5 42 13 24 21 24 5Z" fill="#000" opacity={0.14} />
      <Path d="M38 15v8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={38} cy={25} r={2.6} fill={color} />
    </Svg>
  );
}
