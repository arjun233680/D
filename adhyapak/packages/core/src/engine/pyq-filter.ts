import type { ElectiveError, Exam, ExamPaper, PaperSubjects } from '../types';
import { getExam, getPaper, resolvePaperSubjects } from '../data/exams';
import { getSubject } from '../data/subjects';
import type { PracticeFilter } from './practice';

/**
 * The previous-year browser's funnel: exam → level → subject → year → shift.
 *
 * Shared by both apps so the two cannot drift into offering different subjects
 * for the same paper. Everything here is pure: it decides what the pickers may
 * offer and what filter that selection means, and never fetches anything.
 *
 * The subject list comes from the paper's blueprint rather than a hardcoded
 * list — the fixed sections, plus the learner's own elective for Levels 2 and
 * 3. That is why an HTET PRT candidate is offered CDP, Hindi, English,
 * Quantitative Aptitude, Reasoning, Haryana GK, Maths and EVS, and a TGT
 * candidate is offered their six common blocks plus whichever subject they sit.
 */

/** What the learner has chosen, and what the URL carries. */
export interface PyqSelection {
  examId?: string;
  /** A paper id — the level, in the form the blueprint names it. */
  paperId?: string;
  subjectId?: string;
  year?: number;
  shift?: string;
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
  /**
   * Subjects the chosen paper tests, or the reason they cannot be listed.
   * Unresolved is a real state — a TGT candidate who has not picked a subject —
   * and the screen has to say so rather than guess.
   */
  subjects: PaperSubjects;
  subjectOptions: PyqOption<string>[];
  /** The elective problem, when there is one, so a screen can prompt for it. */
  electiveError?: ElectiveError;
  /** The selection reduced to a repository filter. */
  filter: PracticeFilter;
}

/**
 * Resolves a selection into everything a picker needs.
 *
 * `electiveSubjectId` is the learner's saved choice; the funnel's own
 * `subjectId` is what they are browsing right now, which may be any subject the
 * paper tests, not only their elective.
 */
export const pyqFilterModel = (
  selection: PyqSelection,
  electiveSubjectId?: string,
): PyqFilterModel => {
  const exam = selection.examId ? getExam(selection.examId) : undefined;
  const papers = exam?.papers ?? [];
  const paper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;

  const subjects: PaperSubjects = paper
    ? resolvePaperSubjects(paper.id, electiveSubjectId)
    : { ok: true, sections: [], subjectIds: [] };

  const subjectOptions = subjects.ok
    ? subjects.subjectIds
        .map((id) => {
          const subject = getSubject(id);
          return subject
            ? { value: id, labelEn: subject.name.en, labelHi: subject.name.hi }
            : undefined;
        })
        .filter((o): o is PyqOption<string> => Boolean(o))
    : [];

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
    subjects,
    subjectOptions,
    electiveError: subjects.ok ? undefined : subjects.error,
    filter: {
      pyqOnly: true,
      examId: selection.examId,
      level: paper?.level,
      subjectId,
      year: selection.year,
      shift: selection.shift,
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
    shift: fromUrl.shift,
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
  if (selection.shift) params.shift = selection.shift;
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
    shift: get('shift') || undefined,
  };
};

/* ---------------------------------------------------------- truncation */

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

  if (selection.shift) {
    return {
      field: 'shift',
      en: `No questions from shift ${selection.shift} of that paper.`,
      hi: `उस पेपर की पाली ${selection.shift} से कोई प्रश्न नहीं।`,
    };
  }
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
