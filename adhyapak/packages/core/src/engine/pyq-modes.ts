import type { Bilingual } from '../types';
import { getExam, getPaper, resolvePaperSubjects, electivesForPaper } from '../data/exams';
import { getSubject, getTopic, topicsForSubject } from '../data/subjects';
import type { PracticeFilter } from './practice';
import { paperLabel } from './pyq-filter';
import type { PyqOption, PyqSelection } from './pyq-filter';

/**
 * The three ways a learner asks for previous-year questions.
 *
 * They are genuinely three different questions, not one screen with filters:
 *
 *   `full-paper`  — "give me HTET TGT 2024, all of it, in order". A rehearsal.
 *                   The year is the whole selection; every question of that
 *                   paper comes back, numbered as it was printed.
 *
 *   `section`     — "give me CDP from 2024". Still one sitting, one block of
 *                   it. Year first, then which section.
 *
 *   `topic`       — "give me every Piaget question there has ever been".
 *                   Deliberately has no year filter at all: mixing years is the
 *                   point, because a topic is revised across papers, not within
 *                   one.
 *
 * Keeping them apart in the model rather than in each screen is what stops the
 * two apps offering different subjects for the same paper, which is what
 * happened when each built its own funnel.
 */
export type PyqMode = 'full-paper' | 'section' | 'topic';

export const PYQ_MODES: readonly PyqMode[] = ['full-paper', 'section', 'topic'];

export const pyqModeLabel = (mode: PyqMode): Bilingual =>
  mode === 'full-paper'
    ? { en: 'Full Papers', hi: 'पूरे पेपर' }
    : mode === 'section'
      ? { en: 'Section-wise', hi: 'खंडवार' }
      : { en: 'Topic Practice', hi: 'टॉपिक अभ्यास' };

/** One block of a paper, as the section list renders it. */
export interface PyqSection {
  subjectId: string;
  labelEn: string;
  labelHi: string;
  /** Questions the blueprint gives this block — not how many the bank holds. */
  questions: number;
  /** True when this block is the one the candidate chose rather than a fixed one. */
  elective: boolean;
}

/** One topic card. The count is filled in by the caller, from the database. */
export interface PyqTopic {
  topicId: string;
  labelEn: string;
  labelHi: string;
}

export interface PyqModeModel {
  mode: PyqMode;
  /**
   * The exam's papers, labelled the way a candidate says them — PRT, TGT, PGT,
   * Paper 1, Level 2. Shown on every tab so somebody preparing for TGT can look
   * at last year's PRT paper without leaving to change their goal and back.
   */
  paperOptions: PyqOption<string>[];
  /**
   * The subjects the chosen paper offers, when it offers a choice at all.
   *
   * Empty for PRT and for every paper with a fixed blueprint, which is what
   * makes the second step disappear for them rather than showing one option.
   */
  electiveOptions: PyqOption<string>[];
  /** The subject in force: the one being browsed, else the profile's. */
  electiveSubjectId?: string;
  /** Year chips belong to the first two modes only. */
  showYears: boolean;
  /**
   * The paper's blocks, with the elective resolved to the learner's own
   * subject. Empty when the paper needs a subject nobody has chosen yet —
   * which the caller reports rather than papering over with all twelve.
   */
  sections: PyqSection[];
  /**
   * Subjects for the topic tabs: the paper's common blocks plus the learner's
   * own elective, and none of the electives they did not choose. A TGT Science
   * candidate has no use for the Sanskrit tab, and showing it implies the bank
   * has Sanskrit questions for them.
   */
  subjectTabs: PyqOption<string>[];
  /** Topics of the currently selected subject tab. */
  topics: PyqTopic[];
  /** What to ask the repository for. */
  filter: PracticeFilter;
  /** Set when the paper has an elective and the learner has not chosen one. */
  needsElective: boolean;
}

/**
 * Everything one of the three tabs needs, from the current selection.
 *
 * `subjectId` means different things per mode and that is deliberate: in
 * `section` it is which block of the paper, in `topic` it is which tab. Both
 * are "which subject", asked about different things.
 */
export const pyqModeModel = (
  mode: PyqMode,
  selection: PyqSelection,
  electiveSubjectId?: string,
): PyqModeModel => {
  const paperId = selection.paperId;
  const found = paperId ? getPaper(paperId) : undefined;
  const paper = found?.paper;

  // Browsing beats the profile. A TGT candidate reading the PGT paper says
  // which PGT subject here, and that answer must not become what they are
  // preparing for.
  const elective = selection.electiveSubjectId ?? electiveSubjectId;

  const exam = selection.examId ? getExam(selection.examId) : undefined;
  const paperOptions: PyqOption<string>[] = (exam?.papers ?? []).map((p) => {
    const label = paperLabel(p);
    return { value: p.id, labelEn: label.en, labelHi: label.hi };
  });

  const group = electivesForPaper(paperId)[0];
  const electiveOptions: PyqOption<string>[] = (group?.choices ?? [])
    .map((id) => {
      const subject = getSubject(id);
      return subject ? { value: id, labelEn: subject.name.en, labelHi: subject.name.hi } : undefined;
    })
    .filter((o): o is PyqOption<string> => Boolean(o));

  const resolved = resolvePaperSubjects(paperId, elective);
  const needsElective = !resolved.ok && electiveOptions.length > 0;

  const sections: PyqSection[] = [];
  if (paper && resolved.ok) {
    for (const section of paper.sections) {
      const subjectId = section.subjectId ?? elective;
      if (!subjectId) continue;
      const subject = getSubject(subjectId);
      if (!subject) continue;
      sections.push({
        subjectId,
        labelEn: subject.name.en,
        labelHi: subject.name.hi,
        questions: section.questions,
        elective: section.subjectId === undefined,
      });
    }
  }

  const subjectTabs: PyqOption<string>[] = (resolved.ok ? resolved.subjectIds : [])
    .map((id) => {
      const subject = getSubject(id);
      return subject ? { value: id, labelEn: subject.name.en, labelHi: subject.name.hi } : undefined;
    })
    .filter((o): o is PyqOption<string> => Boolean(o));

  // The tab in force. Falls back to the first rather than to nothing, so the
  // topic list is never empty because a stale subject survived a paper change.
  const activeSubject =
    selection.subjectId && subjectTabs.some((o) => o.value === selection.subjectId)
      ? selection.subjectId
      : subjectTabs[0]?.value;

  const topics: PyqTopic[] =
    mode === 'topic' && activeSubject
      ? topicsForSubject(activeSubject).map((t) => ({
          topicId: t.id,
          labelEn: t.name.en,
          labelHi: t.name.hi,
        }))
      : [];

  return {
    mode,
    paperOptions,
    electiveOptions,
    electiveSubjectId: elective,
    showYears: mode !== 'topic',
    sections,
    subjectTabs,
    topics,
    needsElective,
    filter: pyqModeFilter(mode, selection, activeSubject),
  };
};

/**
 * The repository filter for a mode and selection.
 *
 * Split out because the difference between the three modes is almost entirely
 * *which filters are absent*, and that is easier to read as one function than
 * spread across three screens:
 *
 *   full-paper — paper and year. No subject: the whole paper is the point.
 *   section    — paper, year and subject.
 *   topic      — topic only. No year, and no paper either: a Piaget question
 *                from CTET is still a Piaget question for an HTET candidate.
 */
export const pyqModeFilter = (
  mode: PyqMode,
  selection: PyqSelection,
  activeSubject?: string,
): PracticeFilter => {
  if (mode === 'topic') {
    return { pyqOnly: true, topicId: selection.topicId, examId: selection.examId };
  }
  return {
    pyqOnly: true,
    examId: selection.examId,
    paperId: selection.paperId,
    year: selection.year,
    subjectId: mode === 'section' ? activeSubject : undefined,
    // A rehearsal has to arrive in the order it was printed. Section practice
    // inherits it because a section is a contiguous run of the same paper.
    orderByQuestionNo: true,
  };
};

/**
 * Why a mode has nothing to show, in words a learner can act on.
 *
 * Every branch names something they can change. "No questions found" is true of
 * all of them and useful in none.
 */
export const pyqModeEmptyReason = (
  model: PyqModeModel,
  selection: PyqSelection,
): Bilingual | undefined => {
  if (model.needsElective) {
    return {
      en: 'Choose your subject first — this paper is different for every candidate.',
      hi: 'पहले अपना विषय चुनें — यह पेपर हर अभ्यर्थी के लिए अलग होता है।',
    };
  }
  if (model.mode !== 'topic' && !selection.year) {
    return { en: 'Pick a year to begin.', hi: 'आरंभ करने हेतु वर्ष चुनें।' };
  }
  if (model.mode === 'section' && !selection.subjectId) {
    return { en: 'Pick a section.', hi: 'कोई खंड चुनें।' };
  }
  if (model.mode === 'topic' && !selection.topicId) {
    return { en: 'Pick a topic.', hi: 'कोई टॉपिक चुनें।' };
  }
  if (model.mode === 'topic' && selection.topicId && !getTopic(selection.topicId)) {
    return {
      en: 'That topic is not part of this subject any more.',
      hi: 'वह टॉपिक अब इस विषय का हिस्सा नहीं है।',
    };
  }
  return undefined;
};
