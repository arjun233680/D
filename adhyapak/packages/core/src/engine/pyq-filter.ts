import type { Bilingual, Exam, ExamPaper, Test } from '../types';
import { getTopic } from '../data/subjects';
import { getExam, getPaper, paperBrowsableSubjects } from '../data/exams';
import { getSubject } from '../data/subjects';
import type { PracticeFilter } from './practice';

/**
 * The previous-year browser's funnel: exam → level → subject → year.
 *
 * Shared by both apps so the two cannot drift into offering different subjects
 * for the same paper. Everything here is pure: it decides what the pickers may
 * offer and what filter that selection means, and never fetches anything.
 *
 * The level picker is labelled the way the bank is categorised and the way
 * candidates speak — PRT, TGT, PGT — not "Level 2". The subject picker lists
 * every subject that paper can test, elective choices included, so a TGT
 * candidate browsing the Science questions does not first have to go and set a
 * profile field. Nothing is selected until they select it; see
 * `paperBrowsableSubjects` for why that is not the same as guessing.
 */

/** What the learner has chosen, and what the URL carries. */
export interface PyqSelection {
  examId?: string;
  /** A paper id — the level, in the form the blueprint names it. */
  paperId?: string;
  subjectId?: string;
  year?: number;
  /**
   * Which topic, for topic practice.
   *
   * Lives here rather than beside it because it is part of the same selection a
   * screen carries and a link shares — and because the modes differ mostly in
   * which of these fields they ignore, which is easier to see when they are all
   * in one shape.
   */
  topicId?: string;
}

/** One option in a picker, already resolved to something renderable. */
export interface PyqOption<T> {
  value: T;
  labelEn: string;
  labelHi: string;
}

export interface PyqFilterModel {
  exam?: Exam;
  /** Papers of the chosen exam, in blueprint order. Empty for an unknown exam. */
  papers: ExamPaper[];
  paper?: ExamPaper;
  /** Papers as picker options, labelled by post code where the exam has one. */
  paperOptions: PyqOption<string>[];
  /** Every subject the chosen paper can test, in blueprint order. */
  subjectOptions: PyqOption<string>[];
  /** The selection reduced to a repository filter. */
  filter: PracticeFilter;
}

/**
 * A paper's picker label: its post code where the exam has one, its full name
 * otherwise. "PGT" is what the bank is categorised by and what a candidate
 * calls the paper; "Level 3 — PGT (Classes 9 to 12)" is a heading, not an
 * option in a dropdown.
 */
const paperLabel = (paper: ExamPaper): { en: string; hi: string } =>
  paper.post ? { en: paper.post, hi: paper.post } : { en: paper.name.en, hi: paper.name.hi };

/**
 * Resolves a selection into everything a picker needs.
 */
export const pyqFilterModel = (selection: PyqSelection): PyqFilterModel => {
  const exam = selection.examId ? getExam(selection.examId) : undefined;
  const papers = exam?.papers ?? [];
  const paper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;

  const paperOptions = papers.map((p) => {
    const label = paperLabel(p);
    return { value: p.id, labelEn: label.en, labelHi: label.hi };
  });

  const subjectOptions = paperBrowsableSubjects(paper?.id)
    .map((id) => {
      const subject = getSubject(id);
      return subject ? { value: id, labelEn: subject.name.en, labelHi: subject.name.hi } : undefined;
    })
    .filter((o): o is PyqOption<string> => Boolean(o));

  // A subject that is no longer offered by the chosen paper must not silently
  // keep filtering — switching from PGT to PRT should not leave "Physics" in
  // force and return nothing with no explanation.
  const subjectId =
    selection.subjectId && subjectOptions.some((o) => o.value === selection.subjectId)
      ? selection.subjectId
      : undefined;

  return {
    exam,
    papers,
    paper,
    paperOptions,
    subjectOptions,
    filter: {
      pyqOnly: true,
      examId: selection.examId,
      level: paper?.level,
      subjectId,
      year: selection.year,
    },
  };
};

/**
 * The selection a learner should land on before touching anything.
 *
 * Their goal exam, the paper they are preparing for, and their elective when
 * the paper has one — so the common case is already filtered to the paper they
 * sit, and everything stays changeable.
 */
export const defaultPyqSelection = (user: {
  goalExamId?: string;
  targetPaperId?: string;
  electiveSubjectId?: string;
}): PyqSelection => {
  const exam = user.goalExamId ? getExam(user.goalExamId) : undefined;
  const paperId =
    user.targetPaperId && getPaper(user.targetPaperId) ? user.targetPaperId : exam?.papers[0]?.id;
  return { examId: exam?.id, paperId };
};

/**
 * The selection to render, from what the URL carries and who is asking.
 *
 * The URL wins wherever it says something, and the profile fills the rest — so
 * a shared link opens exactly as sent, and a bare `/practice/pyq` opens on the
 * learner's own paper.
 *
 * Not a spread. `pyqSelectionFromParams` returns every key, with `undefined`
 * where the parameter was absent, and an explicit `undefined` beats the value
 * under it in `{ ...profile, ...url }` — which shipped as a level picker with
 * no levels in it and a subject picker permanently disabled.
 */
export const resolvePyqSelection = (
  fromUrl: PyqSelection,
  user: { goalExamId?: string; targetPaperId?: string },
): PyqSelection => {
  const base = defaultPyqSelection(user);
  const examId = fromUrl.examId ?? base.examId;
  // The profile's paper is only a sensible default for the profile's exam:
  // "?exam=ctet" must not land on the HTET paper saved on the account.
  const paperId = fromUrl.paperId ?? (examId === base.examId ? base.paperId : undefined);
  return {
    examId,
    paperId,
    subjectId: fromUrl.subjectId,
    year: fromUrl.year,
  };
};

/* ------------------------------------------------------------------- urls */

/**
 * The selection as query parameters, so a filtered view can be shared and
 * survives a refresh. Absent values are omitted rather than written empty,
 * which keeps the common URL short.
 */
export const pyqSelectionToParams = (selection: PyqSelection): Record<string, string> => {
  const params: Record<string, string> = {};
  if (selection.examId) params.exam = selection.examId;
  if (selection.paperId) params.paper = selection.paperId;
  if (selection.subjectId) params.subject = selection.subjectId;
  if (selection.year !== undefined) params.year = String(selection.year);
  if (selection.topicId) params.topic = selection.topicId;
  return params;
};

/** The inverse. An unparseable year is dropped rather than becoming NaN. */
export const pyqSelectionFromParams = (
  get: (key: string) => string | null | undefined,
): PyqSelection => {
  const year = Number(get('year'));
  return {
    examId: get('exam') || undefined,
    paperId: get('paper') || undefined,
    subjectId: get('subject') || undefined,
    year: Number.isInteger(year) && year > 0 ? year : undefined,
    topicId: get('topic') || undefined,
  };
};

/* ---------------------------------------------------------- truncation */

/**
 * How many questions one run of the practice screen will hold.
 *
 * The whole HTET bank is ~861 previous-year questions and the repository's
 * default page is 200, so the runner used to say "1 / 200" of 861 with nothing
 * admitting the other 661 existed. Rather than page a runner mid-session, which
 * would cost a learner their place, both apps ask for a paper's worth and say
 * plainly when the filter is wider than that. A fully funnelled selection is 30
 * questions; this ceiling only bites on "all subjects, all years", where
 * narrowing is the right advice anyway.
 *
 * Shared so the website and the phone cannot disagree about how much of a
 * filter a learner has actually seen.
 */
export const PYQ_SCREEN_LIMIT = 300;

/**
 * Whether a screen is showing fewer questions than its filter matches.
 *
 * The repository pages at 200 rows by default and said nothing about it, so a
 * runner opened on an 861-question filter counted "1 / 200" and the learner
 * finishing it had seen 23% of the papers while believing they had seen all of
 * them. Paging the runner would lose their place mid-session, so both screens
 * ask for a paper's worth and admit it when the filter is wider than that.
 *
 * `shown >= limit` is the guard that matters: the count and the list arrive
 * from two requests, and while a new filter is in flight the old list can sit
 * under a smaller new count. Only a list that actually hit the ceiling was
 * truncated by it.
 */
export const pyqTruncation = (
  total: number | undefined,
  shown: number,
  limit: number,
): { shown: number; total: number } | null =>
  total !== undefined && total > shown && shown >= limit ? { shown, total } : null;

/* --------------------------------------------------------- empty states */

/**
 * Which filter emptied the result.
 *
 * "No questions found" tells a learner nothing about what to change. Naming the
 * narrowest applied filter turns it into an instruction, and the order below is
 * narrowest-first because that is the one worth relaxing.
 */
export const pyqEmptyReason = (
  selection: PyqSelection,
  model: PyqFilterModel,
): { field: keyof PyqSelection | 'none'; en: string; hi: string } => {
  const subjectName = model.filter.subjectId
    ? getSubject(model.filter.subjectId)?.name
    : undefined;
  const paperName = model.paper?.name;

  if (selection.year !== undefined) {
    return {
      field: 'year',
      en: `No ${subjectName?.en ?? 'questions'} from the ${selection.year} paper yet.`,
      hi: `${selection.year} के पेपर से ${subjectName?.hi ?? 'कोई प्रश्न'} अभी नहीं।`,
    };
  }
  if (model.filter.subjectId) {
    return {
      field: 'subjectId',
      en: `No previous-year questions for ${subjectName?.en ?? 'this subject'} yet.`,
      hi: `${subjectName?.hi ?? 'इस विषय'} हेतु विगत वर्ष प्रश्न अभी नहीं।`,
    };
  }
  if (model.paper) {
    return {
      field: 'paperId',
      en: `No previous-year questions for ${paperName?.en ?? 'this paper'} yet.`,
      hi: `${paperName?.hi ?? 'इस पेपर'} हेतु विगत वर्ष प्रश्न अभी नहीं।`,
    };
  }
  return {
    field: 'none',
    en: 'No previous-year questions have been added yet.',
    hi: 'विगत वर्ष प्रश्न अभी जोड़े नहीं गए हैं।',
  };
};

/* ------------------------------------------------------------- as a paper */

/**
 * A previous-year selection, assembled into a sittable paper.
 *
 * The exam player takes a `Test`; a PYQ selection is a filter that resolves to
 * a list of questions at runtime. This is the join between them, so previous-
 * year practice runs through the same player as every mock rather than through
 * a second implementation of the same window.
 *
 * Sections follow the subjects present, in the order the questions came back,
 * because that is what the section tabs across the top of the player show. The
 * duration is the real exam's minute-per-question rate applied to however many
 * questions the filter actually matched — a 30-question subject drill gets 30
 * minutes, not the full paper's 150.
 */
export const pyqTestFromQuestions = (
  questions: { id: string; topicId?: string }[],
  options: { id: string; title: Bilingual; examId: string; paperId?: string; year?: number },
): Test => {
  // Subject comes through the topic, the only place the schema records it. A
  // question with no topic yet has no section to sit in, so it is grouped under
  // '' rather than silently dropped from a paper the learner is about to sit.
  const bySubject = new Map<string, string[]>();
  for (const question of questions) {
    const subjectId = (question.topicId ? getTopic(question.topicId)?.subjectId : undefined) ?? '';
    const ids = bySubject.get(subjectId) ?? [];
    ids.push(question.id);
    bySubject.set(subjectId, ids);
  }

  return {
    id: options.id,
    title: options.title,
    examId: options.examId,
    paperId: options.paperId,
    type: 'pyq',
    // One minute per question, the rate every TET paper is set at.
    durationMinutes: Math.max(1, questions.length),
    marksPerQuestion: 1,
    // No TET-style paper deducts, and inventing a penalty would misreport a score.
    negativeMarking: 0,
    access: 'free',
    year: options.year,
    sections: [...bySubject].map(([subjectId, questionIds]) => ({
      id: `${options.id}-${subjectId}`,
      name: getSubject(subjectId)?.name ?? { en: subjectId, hi: subjectId },
      subjectId,
      questionIds,
    })),
    instructions: [],
  };
};

/**
 * A stable id for the paper a selection describes.
 *
 * The attempt and the result live on two routes, as they do for a mock, and the
 * store keys both by test id — so the id has to be recoverable from the URL on
 * the second route rather than invented on the first. Two different selections
 * are two different papers; the same selection reached twice is the same one.
 */
export const pyqTestId = (selection: PyqSelection): string =>
  ['pyq', selection.examId, selection.paperId, selection.subjectId, selection.year]
    .filter(Boolean)
    .join('-');
