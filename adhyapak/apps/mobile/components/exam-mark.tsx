import { Image, View } from 'react-native';
import type { Exam } from '@adhyapak/core';
import { Icon, examIcon } from '@/components/icons';
import { tint } from '@/components/onboarding';

/**
 * The mark on an exam card: the conducting body's own logo.
 *
 * WHERE THEY CAME FROM
 *
 * Three rungs, taken in order, one exam at a time. `scripts/exam-logos.py`
 * holds the source for every one and can rebuild the whole set.
 *
 *   1. The board's own logo, off the board's own site — CBSE for CTET, BSEH
 *      Bhiwani for HTET, and so on. Fifteen exams.
 *   2. Where the body has no device of its own — and several genuinely do not,
 *      they sign with the plain state emblem — the state emblem. Twelve.
 *   3. Where even that could not be had, the state's outline. Two: Rajasthan
 *      and Telangana, whose emblems are on no public archive.
 *
 * EMRS is neither a board nor a state; it is a central scheme, and its mark is
 * the one the Ministry of Tribal Affairs uses for it.
 *
 * Every file was trimmed of whitespace, squared and resized to 96px. Several
 * sites publish a horizontal lockup — crest on the left, the board's name set
 * beside it — and those were cropped back to the crest, because the name is
 * already printed on the card.
 *
 * These are other people's trademarks, and many are built on the State Emblem
 * of India. They are here at the product owner's instruction and on their
 * responsibility, used to identify the exam each card links to.
 *
 * WHY THE FALLBACK STAYS
 *
 * All twenty-nine exams have a mark today, so `examIcon` never fires. It stays
 * because the exam list lives in the database: the day somebody inserts a
 * state TET, it has no logo here and would otherwise render an empty tile.
 *
 * Metro resolves `require` at build time, so this map cannot be built from a
 * template string — every path has to be written out.
 */
const EXAM_LOGOS: Record<string, number> = {
  aptet: require('../assets/exam-logos/aptet.png'),
  awes: require('../assets/exam-logos/awes.png'),
  bihartet: require('../assets/exam-logos/bihartet.png'),
  ctet: require('../assets/exam-logos/ctet.png'),
  dsssb: require('../assets/exam-logos/dsssb.png'),
  emrs: require('../assets/exam-logos/emrs.png'),
  gtet: require('../assets/exam-logos/gtet.png'),
  'hpsc-pgt': require('../assets/exam-logos/hpsc-pgt.png'),
  hptet: require('../assets/exam-logos/hptet.png'),
  'hssc-tgt-pgt': require('../assets/exam-logos/hssc-tgt-pgt.png'),
  htet: require('../assets/exam-logos/htet.png'),
  jtet: require('../assets/exam-logos/jtet.png'),
  kartet: require('../assets/exam-logos/kartet.png'),
  ktet: require('../assets/exam-logos/ktet.png'),
  kvs: require('../assets/exam-logos/kvs.png'),
  mahatet: require('../assets/exam-logos/mahatet.png'),
  mptet: require('../assets/exam-logos/mptet.png'),
  nvs: require('../assets/exam-logos/nvs.png'),
  otet: require('../assets/exam-logos/otet.png'),
  pstet: require('../assets/exam-logos/pstet.png'),
  reet: require('../assets/exam-logos/reet.png'),
  sktet: require('../assets/exam-logos/sktet.png'),
  supertet: require('../assets/exam-logos/supertet.png'),
  tntet: require('../assets/exam-logos/tntet.png'),
  tstet: require('../assets/exam-logos/tstet.png'),
  uptet: require('../assets/exam-logos/uptet.png'),
  utet: require('../assets/exam-logos/utet.png'),
  wbtet: require('../assets/exam-logos/wbtet.png'),
};

export const hasExamLogo = (examId: string): boolean => examId in EXAM_LOGOS;

export function ExamMark({ exam, size = 36 }: { exam: Exam; size?: number }) {
  const logo = EXAM_LOGOS[exam.id];

  /*
   * A logo is a picture with its own margins and its own palette, so it is
   * given nearly the whole tile and left the colour it came with. A drawn
   * motif is a stroke, so it is inset and takes the exam's colour from the
   * database. Same tile, two different jobs.
   */
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: Math.round(size * 0.32),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: logo ? '#fff' : tint(exam.color),
        borderWidth: logo ? 1 : 0,
        borderColor: '#efecf9',
        overflow: 'hidden',
      }}
    >
      {logo ? (
        <Image
          source={logo}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          style={{ height: size - 8, width: size - 8 }}
        />
      ) : (
        <Icon name={examIcon(exam.id)} size={Math.round(size * 0.55)} color={exam.color} />
      )}
    </View>
  );
}
