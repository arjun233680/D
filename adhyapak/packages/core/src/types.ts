/**
 * Adhyapak domain model.
 *
 * Everything the web app and the mobile app render comes from these shapes.
 * Seed data implements them today; a real API implements them tomorrow without
 * a single screen changing.
 */

/** Every user-facing string carries both languages. TET aspirants switch constantly. */
export interface Bilingual {
  en: string;
  hi: string;
}

export type Lang = 'en' | 'hi';

export const pick = (text: Bilingual, lang: Lang): string => text[lang] || text.en;

/* ------------------------------------------------------------------ exams */

/** Level of the teaching post an exam recruits for. */
export type TeachingLevel =
  | 'primary' // PRT / Paper 1 — classes 1-5
  | 'upper-primary' // TGT / Paper 2 — classes 6-8
  | 'secondary' // TGT — classes 9-10
  | 'senior-secondary' // PGT — classes 11-12
  | 'eligibility'; // pure eligibility tests

export type ExamScope = 'national' | 'state';

export interface ExamPaper {
  id: string;
  name: Bilingual;
  level: TeachingLevel;
  /**
   * The teaching post this paper qualifies you for — PRT, TGT, PGT.
   *
   * How the question bank is categorised and how every candidate refers to the
   * paper: nobody sits "Level 2", they sit TGT. Kept separate from `level`
   * because the level is the shared vocabulary across exams (CTET Paper 1 is
   * also `primary`) while the post code is what this exam calls it. Absent for
   * exams that number their papers instead.
   */
  post?: string;
  /** Marks per correct answer. */
  marksPerQuestion: number;
  /** 0 for every TET-style paper; some state exams do deduct. */
  negativeMarking: number;
  durationMinutes: number;
  totalQuestions: number;
  sections: ExamSection[];
  /** Choices offered by this paper. Present only when a section is elective. */
  electives?: ElectiveGroup[];
  /** Qualifying percentage for General category. */
  cutoffGeneral: number;
  cutoffReserved: number;
}

/**
 * A set of subjects a candidate picks one of.
 *
 * HTET Levels 2 and 3 are a single 60-mark paper whose subject is whichever one
 * the candidate applied in — there is no "TGT paper", there are twelve of them.
 */
export interface ElectiveGroup {
  id: string;
  name: Bilingual;
  /** Subject ids, every one of which must exist in SUBJECTS. */
  choices: string[];
}

interface ExamSectionSize {
  questions: number;
  marks: number;
}

/**
 * One block of a paper.
 *
 * Either the subject is fixed by the blueprint, or the section is an elective
 * and the subject is whichever one the candidate chose. The `?: never` arms
 * make that a real either/or: a section with both, or with neither, does not
 * typecheck. Before this, `subjectId` was mandatory, so an elective could only
 * be modelled by inventing a subject for it — which is exactly how HTET Level 2
 * came to claim it tested Science and Mathematics.
 */
export type ExamSection =
  | (ExamSectionSize & { subjectId: string; electiveGroupId?: never })
  | (ExamSectionSize & { electiveGroupId: string; subjectId?: never });

/** Why a paper's subjects could not be determined. Never guessed around. */
export type ElectiveError =
  /** The paper has an elective and the learner has not chosen one yet. */
  | { kind: 'not-chosen'; groupId: string; group?: ElectiveGroup }
  /** The learner's choice is not offered by this group — usually a stale profile. */
  | { kind: 'not-in-group'; groupId: string; chosen: string; group?: ElectiveGroup }
  /** The blueprint references a group the paper does not define. A data bug. */
  | { kind: 'unknown-group'; groupId: string };

export interface ResolvedSection {
  section: ExamSection;
  /** The subject this section tests, once any elective is applied. */
  subjectId: string;
  /** Set when this section came from an elective group. */
  electiveGroupId?: string;
}

/**
 * The outcome of resolving a paper against a learner's elective choice.
 *
 * A discriminated result rather than a `string[]`, because the failure is a
 * normal state — every TGT and PGT candidate is in it until they pick a subject
 * — and a screen that silently defaulted would show one candidate another
 * candidate's syllabus.
 */
export type PaperSubjects =
  | { ok: true; sections: ResolvedSection[]; subjectIds: string[] }
  | { ok: false; error: ElectiveError };

/** A citation. Every factual claim about an exam carries one. */
export interface Source {
  label: string;
  url: string;
  /** ISO date the fact was last checked against the source. */
  checkedOn: string;
}

/** A dated, cited fact — notification released, exam held, result out. */
export interface ExamUpdate {
  /** ISO date the event happens or happened. */
  date: string;
  title: Bilingual;
  detail: Bilingual;
  kind: 'notification' | 'application' | 'exam' | 'result' | 'vacancy';
}

export interface Exam {
  id: string;
  slug: string;
  name: Bilingual;
  shortName: string;
  authority: Bilingual;
  scope: ExamScope;
  state?: Bilingual;
  about: Bilingual;
  /** Free-form, e.g. "Twice a year (Jul & Dec)". */
  frequency: Bilingual;
  papers: ExamPaper[];
  /** Brand accent used across cards and headers. */
  color: string;
  emoji: string;
  /** ISO date of the next notification/exam, when announced. */
  nextExamDate?: string;
  eligibility: Bilingual[];
  /** Ordered highlights shown on the goal page. */
  highlights: Bilingual[];
  /** Official conducting-body website. */
  officialSite: string;
  /** Posts advertised in the current cycle, where the body has published a figure. */
  vacancies?: number;
  /** Cycle timeline, newest last. Rendered on the goal page. */
  updates: ExamUpdate[];
  /** Where each of the above was verified. Shown to the learner. */
  sources: Source[];
  /**
   * Headlined in the exam chooser's "Important" filter.
   *
   * Optional because the bundled content predates the column and carries no
   * answer for it. Absent reads as "not headlined", which is the right default
   * for an offline build: the chooser still lists every exam, it just has no
   * editorial shortlist to offer.
   */
  featured?: boolean;
  /**
   * Position in the exam chooser grid — lower first, ties broken by short name.
   *
   * Optional for the same reason as `featured`. Absent sorts with the unranked
   * tail rather than jumping the queue.
   */
  sortOrder?: number;
}

/* --------------------------------------------------------------- subjects */

export interface Subject {
  id: string;
  name: Bilingual;
  icon: string;
  color: string;
  description: Bilingual;
  topics: Topic[];
}

export interface Topic {
  id: string;
  subjectId: string;
  name: Bilingual;
  /**
   * Historical share of questions, as a percentage — drives "high yield"
   * badges and the recommended-practice ordering.
   *
   * Optional because it is a claim about real papers: subjects added without a
   * paper analysis behind them leave it out rather than carry a number nobody
   * measured. Screens hide the badge and the bar when it is absent.
   */
  weightage?: number;
}

/* -------------------------------------------------------------- educators */

export interface Educator {
  id: string;
  name: string;
  avatar: string;
  headline: Bilingual;
  subjects: string[];
  experienceYears: number;
  languages: Lang[];
  bio: Bilingual;
}

/* ---------------------------------------------------------------- content */

export type ContentAccess = 'free' | 'plus' | 'iconic';

export interface Video {
  id: string;
  title: Bilingual;
  description: Bilingual;
  educatorId: string;
  subjectId: string;
  topicId?: string;
  examIds: string[];
  /** HLS or MP4 source. Uploads produce a blob/object URL with the same shape. */
  src: string;
  thumbnail: string;
  durationSeconds: number;
  /**
   * View count is deliberately absent. It was a number in the bundle — 41200,
   * 28700 — shown to a learner as "41.2K views" on lessons nobody had watched,
   * because the file behind every one of them is a Big Buck Bunny sample clip.
   * `videos.views` exists in Postgres and defaults to 0; when something counts
   * it, this can come back counted.
   */
  publishedAt: string;
  access: ContentAccess;
  language: Lang;
  /** Timestamped chapters, in seconds. */
  chapters: VideoChapter[];
  resources: NoteRef[];
  isLive?: boolean;
  liveStartsAt?: string;
}

export interface VideoChapter {
  at: number;
  title: Bilingual;
}

export interface NoteRef {
  id: string;
  title: Bilingual;
}

export interface Note {
  id: string;
  title: Bilingual;
  subjectId: string;
  topicId?: string;
  examIds: string[];
  educatorId: string;
  /** PDF URL for download; `sections` renders the in-app reader. */
  fileUrl?: string;
  pages: number;
  downloads: number;
  updatedAt: string;
  access: ContentAccess;
  language: Lang | 'both';
  sections: NoteSection[];
  tags: Bilingual[];
}

export interface NoteSection {
  heading: Bilingual;
  body: Bilingual;
  /** Rendered as a highlighted callout — definitions, tricks, mnemonics. */
  callout?: Bilingual;
  bullets?: Bilingual[];
}

/* --------------------------------------------------------------- batches */

export interface Batch {
  id: string;
  title: Bilingual;
  examId: string;
  paperId?: string;
  educatorIds: string[];
  startsAt: string;
  endsAt: string;
  /** Weekly live-class schedule, human readable. */
  schedule: Bilingual;
  language: Lang;
  /**
   * Enrolment count is deliberately absent, for the same reason: "15.7K
   * enrolled" described a batch nobody had joined. `batches.enrolled` exists in
   * Postgres and defaults to 0.
   */
  access: ContentAccess;
  thumbnail: string;
  color: string;
  syllabus: BatchModule[];
  includes: Bilingual[];
}

export interface BatchModule {
  id: string;
  title: Bilingual;
  subjectId: string;
  videoIds: string[];
  noteIds: string[];
  /** Practice set attached to the module. */
  questionIds: string[];
}

/* ------------------------------------------------------------- questions */

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

/**
 * An option label, as printed on the paper.
 *
 * The whole system speaks letters — the answer key, the candidate, the coaching
 * sheet and now `attempt_answers.selected_option`. An index is a fact about our
 * storage order; a letter is a fact about the question, and the two used to be
 * translated at every call site, which is where an off-by-one eventually marks
 * a right answer wrong.
 */
export type OptionLabel = 'A' | 'B' | 'C' | 'D';

export const OPTION_LABELS: readonly OptionLabel[] = ['A', 'B', 'C', 'D'];

/** The label for a position in `Question.options`. */
export const optionLabel = (index: number): OptionLabel | undefined => OPTION_LABELS[index];

/**
 * Whether the answer key is settled, and if not, why.
 *
 * `dropped` is a question the commission withdrew after a challenge;
 * `key_pending` is one whose answer nobody has established yet. Neither can be
 * marked, and conflating them with a wrong answer is what the old single-index
 * model did to every learner who attempted one.
 */
export type AnswerStatus = 'ok' | 'dropped' | 'key_pending';

/**
 * A string that may exist in only one language.
 *
 * The bank genuinely holds both: Haryana GK written only in Hindi is not a
 * defective English question. Rendering goes through `inLang`, which falls back
 * rather than showing a blank.
 */
export interface MaybeBilingual {
  en?: string;
  hi?: string;
}

/**
 * The text to show, falling back to the other language when one is missing.
 *
 * A Hindi-only question shown to somebody reading in English is still worth
 * more than an empty card, and the alternative — hiding it — would remove
 * content the audience actually needs.
 */
export const inLang = (text: MaybeBilingual | undefined, lang: Lang): string =>
  text?.[lang] ?? text?.[lang === 'en' ? 'hi' : 'en'] ?? '';

export interface Question {
  id: string;
  /** Absent on a draft that has not been classified yet. */
  topicId?: string;
  /** The paper this was asked in. Absent for syllabus content shared across exams. */
  paperId?: string;
  /** Which exams this is worth practising for. */
  examIds: string[];
  text: MaybeBilingual;
  /** Ordered A, B, C, D. A missing entry is an option the paper did not carry. */
  options: MaybeBilingual[];
  /** Every option the key accepts. More than one when the key says "2 & 4". */
  correctAnswers: OptionLabel[];
  answerStatus: AnswerStatus;
  /** Withdrawn question whose marks go to everybody. */
  graceMarksAwarded: boolean;
  /** Withdrawn question struck from the paper's total. */
  excludedFromTotal: boolean;
  explanation: MaybeBilingual;
  difficulty: QuestionDifficulty;
  /** Year the paper was sat, where known. */
  year?: number;
  /** Seconds the average learner takes; used in the analysis screen. */
  avgTimeSeconds: number;
  /** Share of learners who answered correctly, 0-1. */
  accuracy: number;
}

/**
 * Whether a chosen option counts as correct.
 *
 * The single marking rule on the client, mirroring `answer_is_correct` in the
 * database. Both exist because the server grades the score and the client
 * renders instant feedback, and they must not disagree.
 */
export const isCorrectAnswer = (
  selected: OptionLabel | null | undefined,
  question: Pick<Question, 'correctAnswers' | 'answerStatus'>,
): boolean =>
  selected != null &&
  question.answerStatus === 'ok' &&
  question.correctAnswers.includes(selected);

/* ----------------------------------------------------------------- tests */

export type TestType = 'mock' | 'pyq' | 'sectional' | 'daily-quiz';

export interface Test {
  id: string;
  title: Bilingual;
  examId: string;
  paperId?: string;
  type: TestType;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarking: number;
  access: ContentAccess;
  /**
   * How many people have sat this paper is deliberately absent.
   *
   * It used to be a number in the bundle — 184620, 96340, 241800 — rendered to
   * a learner as "184.6K attempts". Nobody had sat any of them. This is the
   * same claim 0009 removed from `exams.learners`, which was showing "6.4L
   * learners" for a platform with none, and it is the same rule: ship no number
   * the database can be asked for. When `attempts` is read from the `attempts`
   * table it can come back, counted rather than declared.
   */
  /** Ordered sections; question ids resolve against the bank. */
  sections: TestSection[];
  /** Set for PYQ papers. */
  year?: number;
  instructions: Bilingual[];
}

export interface TestSection {
  id: string;
  name: Bilingual;
  subjectId: string;
  questionIds: string[];
}

/* ----------------------------------------------------------- attempt state */

export type QuestionStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'answered-marked';

export interface AttemptAnswer {
  questionId: string;
  /** null means visited but left blank. Same letters as `Question.correctAnswers`. */
  selectedOption: OptionLabel | null;
  markedForReview: boolean;
  /** Milliseconds spent on this question across all visits. */
  timeSpentMs: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, AttemptAnswer>;
  /** Remaining time at last tick, so a reload resumes honestly. */
  remainingMs: number;
  currentQuestionId?: string;
  language: Lang;
}

export interface SubjectScore {
  subjectId: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeSpentMs: number;
}

export interface TestResult {
  attemptId: string;
  testId: string;
  score: number;
  maxScore: number;
  percentage: number;
  correct: number;
  incorrect: number;
  skipped: number;
  attempted: number;
  accuracy: number;
  totalTimeMs: number;
  /**
   * Where this sitting placed against everyone else who has sat the paper.
   *
   * Absent when the paper was graded on the device, which is the offline and
   * signed-out case: there is no cohort there to be ranked against. These used
   * to be required, and `gradeAttempt` filled them by running the percentage
   * through a logistic curve and multiplying by a made-up field size — a
   * learner who answered one question was told they were "rank #1,80,000 of
   * 1,80,000, 0.5 percentile", which reads as a real standing among real
   * candidates and is not one. Only `submit_attempt` can answer this, because
   * only the database has the other attempts.
   */
  rank?: number;
  totalCandidates?: number;
  percentile?: number;
  qualified: boolean;
  cutoff: number;
  subjectScores: SubjectScore[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
}

export interface TopicPerformance {
  topicId: string;
  subjectId: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

/* ------------------------------------------------------------------ user */

export type UserRole = 'learner' | 'educator';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  phone?: string;
  email?: string;
  goalExamId: string;
  targetPaperId?: string;
  /**
   * The elective subject chosen for the target paper, where it has one.
   * Undefined is a real state, not a missing value — see `PaperSubjects`.
   */
  electiveSubjectId?: string;
  language: Lang;
  state?: string;
  joinedAt: string;
  streakDays: number;
  /** ISO dates the learner practised — drives the streak calendar. */
  activeDates: string[];
  subscription: ContentAccess;
  /** Set once the learner signs in or continues without an account. */
  signedIn?: boolean;
  /** Set once a goal exam has been chosen. Gates the app behind onboarding. */
  onboarded?: boolean;
  bookmarkedQuestionIds: string[];
  savedNoteIds: string[];
  enrolledBatchIds: string[];
}

export interface PracticeSessionResult {
  questionId: string;
  selectedIndex: number | null;
  correct: boolean;
  timeSpentMs: number;
}

/* ------------------------------------------------------------ misc feeds */

export interface CurrentAffair {
  id: string;
  title: Bilingual;
  summary: Bilingual;
  date: string;
  tags: Bilingual[];
  examIds: string[];
}

export interface Doubt {
  id: string;
  askedBy: string;
  avatar: string;
  subjectId: string;
  question: Bilingual;
  askedAt: string;
  answers: DoubtAnswer[];
}

export interface DoubtAnswer {
  id: string;
  by: string;
  isEducator: boolean;
  body: Bilingual;
  answeredAt: string;
}
