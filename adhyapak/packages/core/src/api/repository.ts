import type { SupabaseClient } from '@supabase/supabase-js';
import { getBackend, withFallback } from './client';
import type {
  AnswerStatus,
  Bilingual,
  Exam,
  LearnerSubject,
  Level,
  LevelSubject,
  MaybeBilingual,
  OptionLabel,
  Lang,
  Batch,
  Note,
  Question,
  SubjectScore,
  Test,
  TestResult,
  TopicPerformance,
  User,
  Video,
} from '../types';
import { EXAMS, getExam as seedExam, getExamBySlug as seedExamBySlug } from '../data/exams';
import { TESTS, getTest as seedTest, testQuestionIds } from '../data/tests';
import { NOTES } from '../data/notes';
import { VIDEOS } from '../data/videos';
import { BATCHES } from '../data/batches';
import { CURRENT_AFFAIRS } from '../data/feeds';
import { buildPracticeSet, currentStreak, type PracticeFilter } from '../engine/practice';
import { formatPyq } from '../content/types';
import type { ContentQuestion, ContentStatus, PyqRef } from '../content/types';
import { fingerprint } from '../content/duplicates';
import { SUBJECTS, getTopic } from '../data/subjects';

/* ------------------------------------------------------- reading questions */

/** Blank and absent are the same thing; the old jsonb model let them differ. */
const text = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? undefined : s;
};

const bilingual = (en: unknown, hi: unknown): MaybeBilingual => ({
  en: text(en),
  hi: text(hi),
});

/**
 * One database row as the shape a screen renders.
 *
 * Options come back as an ordered array even though they are stored as eight
 * columns: every screen walks them in order to draw A, B, C, D, and rebuilding
 * that walk from named columns at each call site is how one of them ends up
 * drawing three.
 */
export const toQuestionRow = (r: Record<string, unknown>): Question => ({
  id: r.id as string,
  topicId: (r.topic_id as string) ?? undefined,
  paperId: (r.paper_id as string) ?? undefined,
  // Present only when the caller embedded the junction; an empty list means
  // "not asked for", which no screen distinguishes from "no tags".
  examIds: Array.isArray(r.question_exams)
    ? (r.question_exams as { exam_id: string }[]).map((e) => e.exam_id)
    : [],
  text: bilingual(r.question_en, r.question_hi),
  options: [
    bilingual(r.option_a_en, r.option_a_hi),
    bilingual(r.option_b_en, r.option_b_hi),
    bilingual(r.option_c_en, r.option_c_hi),
    bilingual(r.option_d_en, r.option_d_hi),
  ],
  correctAnswers: ((r.correct_answers as string[]) ?? []) as OptionLabel[],
  answerStatus: ((r.answer_status as string) ?? 'ok') as AnswerStatus,
  graceMarksAwarded: Boolean(r.grace_marks_awarded),
  excludedFromTotal: Boolean(r.excluded_from_total),
  explanation: bilingual(r.explanation_en, r.explanation_hi),
  difficulty: r.difficulty as Question['difficulty'],
  year: (r.year as number) ?? undefined,
  avgTimeSeconds: (r.avg_time_seconds as number) ?? 40,
  accuracy: Number(r.accuracy ?? 0.5),
});

/**
 * The topics under a subject, for filters that still speak in subjects.
 *
 * `questions` no longer carries a subject: it was a denormalised copy that
 * could disagree with `topics.subject_id`. The syllabus is bundled, so this
 * resolves locally rather than costing a round trip.
 */
const topicIdsForSubject = (subjectId: string): string[] =>
  SUBJECTS.find((s) => s.id === subjectId)?.topics.map((t) => t.id) ?? [];

/**
 * The one place either app talks to data.
 *
 * Every function returns the same shape whether it came from Postgres or from
 * the bundled content, so screens never branch on where they are running.
 */

/* ------------------------------------------------------------------ reads */

interface ExamRow {
  id: string;
  slug: string;
  name: Bilingual;
  short_name: string;
  authority: Bilingual;
  scope: 'national' | 'state';
  state: Bilingual | null;
  about: Bilingual;
  frequency: Bilingual;
  color: string;
  emoji: string;
  next_exam_date: string | null;
  eligibility: Bilingual[];
  highlights: Bilingual[];
  official_site: string;
  vacancies: number | null;
  sort_order?: number;
  featured?: boolean;
  exam_papers?: unknown[];
  exam_updates?: { date: string; kind: string; title: Bilingual; detail: Bilingual }[];
  exam_sources?: { label: string; url: string; checked_on: string }[];
}

/** Postgres rows are snake_case; the apps speak camelCase. */
const toExam = (row: ExamRow, seed?: Exam): Exam => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  shortName: row.short_name,
  authority: row.authority,
  scope: row.scope,
  state: row.state ?? undefined,
  about: row.about,
  frequency: row.frequency,
  color: row.color,
  emoji: row.emoji,
  nextExamDate: row.next_exam_date ?? undefined,
  eligibility: row.eligibility,
  highlights: row.highlights,
  officialSite: row.official_site,
  vacancies: row.vacancies ?? undefined,
  featured: row.featured ?? false,
  sortOrder: row.sort_order ?? undefined,
  updates: (row.exam_updates ?? []).map((u) => ({
    date: u.date,
    kind: u.kind as Exam['updates'][number]['kind'],
    title: u.title,
    detail: u.detail,
  })),
  sources: (row.exam_sources ?? []).map((s) => ({
    label: s.label,
    url: s.url,
    checkedOn: s.checked_on,
  })),
  // Papers carry nested sections; the bundled copy already has them shaped.
  papers: seed?.papers ?? [],
});

export const listExams = (): Promise<Exam[]> =>
  withFallback(async (db) => {
    const { data, error } = await db
      .from('exams')
      .select('*, exam_updates(*), exam_sources(*)')
      // Was ordered by a seeded "learners" count, then by short name — which is
      // alphabetical, and put AP TET above CTET in a chooser whose first screen
      // is the dozen exams most aspirants actually sit. `sort_order` carries
      // that judgement in the database; short name still breaks ties, so the
      // unranked tail stays in a stable, findable order.
      .order('sort_order', { ascending: true })
      .order('short_name', { ascending: true });
    if (error || !data) throw error ?? new Error('no exams');
    return (data as ExamRow[]).map((row) => toExam(row, seedExam(row.id)));
  }, () => EXAMS);

export const fetchExamBySlug = (slug: string): Promise<Exam | undefined> =>
  withFallback(async (db) => {
    const { data, error } = await db
      .from('exams')
      .select('*, exam_updates(*), exam_sources(*)')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = data as ExamRow;
    return toExam(row, seedExam(row.id));
  }, () => seedExamBySlug(slug));

export const listTests = (examId?: string): Promise<Test[]> =>
  withFallback(async (db) => {
    let q = db.from('tests').select('*, test_sections(*)');
    if (examId) q = q.eq('exam_id', examId);
    const { data, error } = await q;
    if (error || !data) throw error ?? new Error('no tests');
    // Section shape is stable, so the bundled copy supplies ordering helpers.
    return data.map((row: { id: string }) => seedTest(row.id)).filter((t): t is Test => Boolean(t));
  }, () => (examId ? TESTS.filter((t) => t.examId === examId) : TESTS));

/**
 * Questions for a practice screen.
 *
 * `status = 'published'` is applied here and not left to the caller. RLS in
 * 0006 already hides drafts from a learner, but a screen must not depend on the
 * caller's role for correctness: an educator practising their own subject would
 * otherwise be served their own unreviewed drafts, and a forgotten filter would
 * be invisible in testing precisely because the developer is staff.
 *
 * Every level of the hierarchy is optional and they compose, so the same call
 * serves subject practice, topic practice and "PYQ 2024 shift 1".
 */
export const listQuestions = (filter: PracticeFilter = {}): Promise<Question[]> =>
  withFallback(async (db) => {
    // `question_exams!inner` turns the exam filter into a join rather than a
    // second round trip. Without an exam filter the inner join would still drop
    // untagged questions, so the embed is only asked for when it is filtered on.
    const select = filter.examId ? '*, question_exams!inner(exam_id)' : '*';
    let q = db.from('questions').select(select).eq('status', 'published');
    // Subject is a property of the topic now, so filtering by it means asking
    // for that subject's topics. The alternative — a denormalised copy on the
    // question — is what 0011 removed for disagreeing with `topics.subject_id`.
    if (filter.subjectId) {
      q = q.in('topic_id', topicIdsForSubject(filter.subjectId));
    }
    if (filter.topicId) q = q.eq('topic_id', filter.topicId);
    if (filter.difficulty) q = q.eq('difficulty', filter.difficulty);
    if (filter.paperId) q = q.eq('paper_id', filter.paperId);
    if (filter.year) q = q.eq('year', filter.year);
    if (filter.pyqOnly && !filter.year) q = q.not('year', 'is', null);
    if (filter.examId) q = q.eq('question_exams.exam_id', filter.examId);
    if (filter.ids) q = q.in('id', filter.ids);
    // A full-paper rehearsal arrives in the order it was printed. Nulls last so
    // a question with no number recorded sits after the numbered ones instead
    // of opening the paper.
    if (filter.orderByQuestionNo) {
      q = q.order('question_no', { ascending: true, nullsFirst: false });
    }
    // A bank of 20,000 questions must never arrive in one response.
    const limit = filter.limit ?? 200;
    const offset = filter.offset ?? 0;
    q = q.range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error || !data) throw error ?? new Error('no questions');
    return (data as unknown as Record<string, unknown>[]).map(toQuestionRow);
  }, () => buildPracticeSet(filter));

/**
 * How many questions match a filter, without fetching them.
 *
 * Browsing screens show counts per topic; fetching the questions to call
 * `.length` would move a whole bank across the network to render a number.
 */
export const countQuestions = (filter: PracticeFilter = {}): Promise<number> =>
  withFallback(
    async (db) => {
      // Every filter `listQuestions` honours must be honoured here too: this is
      // the one number on the page whose job is to describe exactly that list,
      // and the two drifting apart is a bug that reads as a miscount.
      const select = filter.examId ? 'id, question_exams!inner(exam_id)' : 'id';
      let q = db.from('questions').select(select, { count: 'exact', head: true }).eq('status', 'published');
      if (filter.subjectId) q = q.in('topic_id', topicIdsForSubject(filter.subjectId));
      if (filter.topicId) q = q.eq('topic_id', filter.topicId);
      if (filter.paperId) q = q.eq('paper_id', filter.paperId);
      if (filter.examId) q = q.eq('question_exams.exam_id', filter.examId);
      if (filter.year) q = q.eq('year', filter.year);
      if (filter.pyqOnly && !filter.year) q = q.not('year', 'is', null);
      if (filter.difficulty) q = q.eq('difficulty', filter.difficulty);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    () => buildPracticeSet({ ...filter, limit: undefined, offset: undefined }).length,
  );

/**
 * Years with previous-year questions, newest first — the PYQ year picker.
 *
 * Empty offline: the bundled bank records provenance as prose, so there are no
 * years to list. The screen shows its empty state rather than a fabricated one.
 */
/**
 * How many published questions each subject holds, as one round trip.
 *
 * A subject index needs a number per subject, and asking `countQuestions` per
 * subject would be one request per tile. Selecting a single column for the
 * exam's published questions and tallying here is one request whose payload is
 * a few kilobytes.
 *
 * Offline it counts the bundled set, which is honest about what is actually
 * available in that mode.
 */
export const countQuestionsBySubject = (examId?: string): Promise<Record<string, number>> =>
  withFallback(
    async (db) => {
      const counts: Record<string, number> = {};
      const pageSize = 1000;
      // A bound, not an expectation: the loop's real exit is a short page. If a
      // proxy ever ignored the Range header every page would come back full and
      // this would spin forever in a learner's browser, so it cannot be allowed
      // to depend on the server behaving.
      const maxPages = 100;
      for (let page = 0, from = 0; page < maxPages; page += 1, from += pageSize) {
        // Subject arrives through the topic, which is the only place it is
        // recorded now. A question with no topic has no subject to count under.
        const select = examId
          ? 'topic_id, question_exams!inner(exam_id)'
          : 'topic_id';
        let q = db.from('questions').select(select).eq('status', 'published');
        if (examId) q = q.eq('question_exams.exam_id', examId);
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const row of data as unknown as { topic_id: string | null }[]) {
          const subjectId = row.topic_id ? getTopic(row.topic_id)?.subjectId : undefined;
          if (subjectId) counts[subjectId] = (counts[subjectId] ?? 0) + 1;
        }
        if (data.length < pageSize) break;
      }
      return counts;
    },
    () => {
      const counts: Record<string, number> = {};
      for (const q of buildPracticeSet({ examId, limit: undefined, offset: undefined })) {
        const subjectId = q.topicId ? getTopic(q.topicId)?.subjectId : undefined;
        if (subjectId) counts[subjectId] = (counts[subjectId] ?? 0) + 1;
      }
      return counts;
    },
  );

export const listPyqYears = (examId?: string): Promise<number[]> =>
  withFallback(
    async (db) => {
      const select = examId ? 'year, question_exams!inner(exam_id)' : 'year';
      let q = db.from('questions').select(select).eq('status', 'published').not('year', 'is', null);
      if (examId) q = q.eq('question_exams.exam_id', examId);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no years');
      const years = new Set<number>();
      for (const row of data as unknown as { year: number }[]) years.add(row.year);
      return [...years].sort((a, b) => b - a);
    },
    () => [],
  );

/**
 * Topic frequency across real papers, straight from `pyq_topic_frequency`.
 *
 * The view does the aggregation so web, mobile and any admin tool report the
 * same numbers, and so a 20,000-row bank is counted in Postgres rather than in
 * a phone.
 */
export interface TopicFrequency {
  examId: string;
  topicId: string;
  subjectId: string;
  questionCount: number;
  firstSeen: number;
  lastSeen: number;
  yearsSeen: number;
}

export const listTopicFrequency = (examId?: string): Promise<TopicFrequency[]> =>
  withFallback(
    async (db) => {
      let q = db.from('pyq_topic_frequency').select('*').order('question_count', { ascending: false });
      if (examId) q = q.eq('exam_id', examId);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no frequency');
      return (data as Record<string, unknown>[]).map((r) => ({
        examId: r.exam_id as string,
        topicId: r.topic_id as string,
        subjectId: r.subject_id as string,
        questionCount: Number(r.question_count),
        firstSeen: Number(r.first_seen),
        lastSeen: Number(r.last_seen),
        yearsSeen: Number(r.years_seen),
      }));
    },
    // No structured provenance offline means no honest frequency to report.
    () => [],
  );

export const listCurrentAffairs = () =>
  withFallback(async (db) => {
    const { data, error } = await db
      .from('current_affairs')
      .select('*')
      .order('date', { ascending: false });
    if (error || !data) throw error ?? new Error('no affairs');
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as Bilingual,
      summary: r.summary as Bilingual,
      date: r.date as string,
      tags: r.tags as Bilingual[],
      examIds: (r.exam_ids as string[]) ?? [],
    }));
  }, () => CURRENT_AFFAIRS);

/** Which notes a learner is asking for. Every field optional, all combinable. */
export interface NoteFilter {
  examId?: string;
  level?: string;
  subjectId?: string;
  unitId?: string;
  topicId?: string;
  subtopicId?: string;
  ids?: string[];
  limit?: number;
}

/**
 * Notes, published only.
 *
 * This used to return the bundled array from both branches — the query was
 * never written, so an uploaded note could not appear however well the rest of
 * the pipeline worked. Sections are fetched with the note in one request rather
 * than one request per note.
 */
export const listNotes = (filter: NoteFilter = {}): Promise<Note[]> =>
  withFallback(
    async (db) => {
      let q = db
        .from('notes')
        .select('*, note_sections(*)')
        .eq('status', 'published')
        .order('sort_order', { ascending: true });
      if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
      if (filter.topicId) q = q.eq('topic_id', filter.topicId);
      if (filter.unitId) q = q.eq('unit_id', filter.unitId);
      if (filter.subtopicId) q = q.eq('subtopic_id', filter.subtopicId);
      if (filter.examId) q = q.contains('exam_ids', [filter.examId]);
      if (filter.level) q = q.contains('levels', [filter.level]);
      if (filter.ids) q = q.in('id', filter.ids);
      if (filter.limit) q = q.limit(filter.limit);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no notes');
      return (data as Record<string, unknown>[]).map(toNote);
    },
    () => filterSeedNotes(filter),
  );

const toNote = (r: Record<string, unknown>): Note => ({
  id: r.id as string,
  title: r.title as Bilingual,
  subjectId: r.subject_id as string,
  topicId: (r.topic_id as string) ?? undefined,
  examIds: (r.exam_ids as string[]) ?? [],
  educatorId: (r.educator_id as string) ?? '',
  fileUrl: (r.file_url as string) ?? undefined,
  pages: (r.pages as number) ?? 0,
  downloads: (r.downloads as number) ?? 0,
  updatedAt: (r.updated_at as string) ?? (r.created_at as string) ?? '',
  access: (r.access as Note['access']) ?? 'free',
  language: (r.language as Note['language']) ?? 'both',
  sections: ((r.note_sections as Record<string, unknown>[]) ?? [])
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((s) => ({
      heading: s.heading as Bilingual,
      body: s.body as Bilingual,
      callout: (s.callout as Bilingual) ?? undefined,
      bullets: (s.bullets as Bilingual[]) ?? undefined,
    })),
  tags: (r.tags as Bilingual[]) ?? [],
});

const filterSeedNotes = (filter: NoteFilter): Note[] => {
  let pool = NOTES;
  if (filter.ids) {
    const wanted = new Set(filter.ids);
    pool = pool.filter((n) => wanted.has(n.id));
  }
  if (filter.subjectId) pool = pool.filter((n) => n.subjectId === filter.subjectId);
  if (filter.topicId) pool = pool.filter((n) => n.topicId === filter.topicId);
  if (filter.examId) pool = pool.filter((n) => n.examIds.includes(filter.examId!));
  return filter.limit ? pool.slice(0, filter.limit) : pool;
};

/**
 * One note by id, or null.
 *
 * Named `fetchNote` because `getNote` is the synchronous seed lookup, the same
 * split the exams already use — the async one goes through the repository, the
 * sync one reads bundled content.
 */
export const fetchNote = async (id: string): Promise<Note | null> => {
  const found = await listNotes({ ids: [id], limit: 1 });
  return found[0] ?? null;
};

export interface VideoFilter {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  liveOnly?: boolean;
  limit?: number;
}

/** Videos, published only, with their chapters in the same request. */
export const listVideos = (filter: VideoFilter = {}): Promise<Video[]> =>
  withFallback(
    async (db) => {
      let q = db
        .from('videos')
        .select('*, video_chapters(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
      if (filter.topicId) q = q.eq('topic_id', filter.topicId);
      if (filter.examId) q = q.contains('exam_ids', [filter.examId]);
      if (filter.liveOnly) q = q.eq('is_live', true);
      if (filter.limit) q = q.limit(filter.limit);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no videos');
      return (data as Record<string, unknown>[]).map(toVideo);
    },
    () => filterSeedVideos(filter),
  );

const toVideo = (r: Record<string, unknown>): Video => ({
  id: r.id as string,
  title: r.title as Bilingual,
  description: (r.description as Bilingual) ?? { en: '', hi: '' },
  educatorId: (r.educator_id as string) ?? '',
  subjectId: r.subject_id as string,
  topicId: (r.topic_id as string) ?? undefined,
  examIds: (r.exam_ids as string[]) ?? [],
  src: (r.src as string) ?? '',
  thumbnail: (r.thumbnail as string) ?? '#4F46E5',
  durationSeconds: (r.duration_seconds as number) ?? 0,
  publishedAt: (r.published_at as string) ?? '',
  access: (r.access as Video['access']) ?? 'free',
  language: (r.language as Video['language']) ?? 'hi',
  chapters: ((r.video_chapters as Record<string, unknown>[]) ?? [])
    .sort((a, b) => Number(a.at_seconds ?? 0) - Number(b.at_seconds ?? 0))
    .map((c) => ({ at: Number(c.at_seconds ?? 0), title: c.title as Bilingual })),
  resources: [],
  isLive: (r.is_live as boolean) ?? undefined,
  liveStartsAt: (r.live_starts_at as string) ?? undefined,
});

const filterSeedVideos = (filter: VideoFilter): Video[] => {
  let pool = VIDEOS;
  if (filter.subjectId) pool = pool.filter((v) => v.subjectId === filter.subjectId);
  if (filter.topicId) pool = pool.filter((v) => v.topicId === filter.topicId);
  if (filter.examId) pool = pool.filter((v) => v.examIds.includes(filter.examId!));
  if (filter.liveOnly) pool = pool.filter((v) => Boolean(v.isLive));
  return filter.limit ? pool.slice(0, filter.limit) : pool;
};

/**
 * Batches.
 *
 * Still served from bundled content on both branches: a batch is a schedule of
 * live classes, and there is no scheduling backend to read from yet. Screens go
 * through here anyway, so the day that backend exists nothing in the UI changes
 * — which is the whole point of the boundary.
 */
export const listBatches = (examId?: string): Promise<Batch[]> =>
  withFallback(
    async () => (examId ? BATCHES.filter((b) => b.examId === examId) : BATCHES),
    () => (examId ? BATCHES.filter((b) => b.examId === examId) : BATCHES),
  );

/* ----------------------------------------------------------------- writes */

/**
 * The signed-in learner, assembled from the database, or null when signed out
 * or offline.
 *
 * Every field here is read from Postgres rather than defaulted. Three used not
 * to be, and each one lied in its own way:
 *
 *   `goal_exam_id` fell back to `'ctet'`, so an account that had never chosen a
 *   goal was shown a CTET home screen — and `onboarded` was never set at all,
 *   so nothing sent them to the goal picker to correct it.
 *
 *   `elective_subject_id` was not selected, so a Level 2 candidate signing in on
 *   a second device lost the elective that decides which subjects they are
 *   tested on.
 *
 *   `streak_days` was the literal `0`, which every screen then ignored in favour
 *   of `currentStreak(activeDates)`. Deriving it from the same dates keeps the
 *   field honest for anything that does read it.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const db = getBackend();
  if (!db) return null;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!profile) return null;

  const [{ data: days }, { data: marks }, { data: saved }, { data: joined }] = await Promise.all([
    db.from('activity_days').select('day'),
    db.from('bookmarks').select('question_id'),
    db.from('saved_notes').select('note_id'),
    db.from('enrolments').select('batch_id'),
  ]);

  const activeDates = (days ?? []).map((d: { day: string }) => d.day);

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    role: profile.role === 'admin' ? 'educator' : profile.role,
    phone: profile.phone ?? undefined,
    email: auth.user.email ?? undefined,
    // No goal is a real state — it is what sends a new account to the picker.
    goalExamId: profile.goal_exam_id ?? '',
    targetPaperId: profile.target_paper_id ?? undefined,
    electiveSubjectId: profile.elective_subject_id ?? undefined,
    language: (profile.language as Lang) ?? 'hi',
    state: profile.state ?? undefined,
    joinedAt: profile.created_at,
    streakDays: currentStreak(activeDates),
    activeDates,
    subscription: profile.subscription,
    signedIn: true,
    onboarded: Boolean(profile.onboarded_at),
    bookmarkedQuestionIds: (marks ?? []).map((b: { question_id: string }) => b.question_id),
    savedNoteIds: (saved ?? []).map((s: { note_id: string }) => s.note_id),
    enrolledBatchIds: (joined ?? []).map((e: { batch_id: string }) => e.batch_id),
  };
};

/* ------------------------------------------------- the learner's own record
 *
 * Everything below writes something the learner owns — their goal, their
 * language, their bookmarks, the batches they joined. All of it used to live
 * only in `localStorage`, which meant a learner who signed in on a second
 * device arrived as a stranger with an empty streak.
 *
 * Each returns a boolean rather than throwing: the caller has already applied
 * the change locally and needs to know whether it also reached Postgres, not to
 * unwind a UI that has already moved on. False means "still only local", which
 * is the honest state offline and the state the store retries from.
 */

/* --------------------------------------------------- the learner's exam set */

/**
 * Which exams this learner said they are preparing for.
 *
 * Empty is a real answer and not a failure: it is what a learner who has never
 * reached the chooser looks like, and it is what sends them there. So an
 * offline build and a signed-out visitor both read as `[]` rather than throwing
 * — the caller's next move is the same in every one of those cases.
 *
 * Distinct from `user.goalExamId`, which stays the single exam the app is
 * scoped to. See the comment on `learner_exams` in migration 0019.
 */
export const fetchLearnerExamIds = async (): Promise<string[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db.from('learner_exams').select('exam_id');
  if (error || !data) return [];
  return (data as { exam_id: string }[]).map((r) => r.exam_id);
};

/**
 * Replaces the learner's exam set, and reports whether it landed.
 *
 * Goes through `set_learner_exams` rather than a delete plus an insert, so the
 * two halves cannot be separated by a dropped connection — see the function's
 * own comment in 0019. The boolean is what the chooser needs: it must not
 * navigate away from the question until the answer is saved.
 */
export const saveLearnerExamIds = async (
  examIds: readonly string[],
): Promise<WriteOutcome> => {
  const db = getBackend();
  if (!db) return { ok: false, expired: false };
  const { error } = await db.rpc('set_learner_exams', { p_exam_ids: [...examIds] });
  return error ? explainWriteFailure(error) : { ok: true };
};

/**
 * Records the chosen goal through `set_goal`, which also stamps `onboarded_at`.
 *
 * The elective is a separate write because `set_goal` predates electives and
 * takes only the exam and paper. Sending it through the RPC would mean changing
 * a function signature that is already deployed; a profile update covers it
 * under the same `profiles_self_write` policy.
 */
export const setGoalRemote = async (
  examId: string,
  paperId?: string,
  electiveSubjectId?: string,
): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  // One call, not two. The elective used to be written by a follow-up update
  // straight to `profiles`, which skipped the check that the subject is one the
  // paper actually offers, and could leave a learner with a goal saved and an
  // elective lost if the second request failed. `set_goal` takes all three
  // since 0013 and writes them together.
  //
  // `null` rather than omitted when there is no elective: switching from a
  // paper with a subject choice to one without has to clear the old choice, or
  // the profile keeps a subject the new paper does not offer.
  const { error } = await db.rpc('set_goal', {
    p_exam_id: examId,
    p_paper_id: paperId ?? null,
    p_elective_subject_id: electiveSubjectId ?? null,
  });
  return !error;
};

/** The profile fields a learner can edit about themselves. */
export interface ProfilePatch {
  name?: string;
  avatar?: string;
  language?: Lang;
  state?: string;
  phone?: string;
  electiveSubjectId?: string;
}

/**
 * Saves an edited profile.
 *
 * Only the keys present are sent. Spreading the whole learner instead would
 * write `null` over a phone number the form never showed.
 */
export const updateProfileRemote = async (patch: ProfilePatch): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.language !== undefined) row.language = patch.language;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.electiveSubjectId !== undefined) row.elective_subject_id = patch.electiveSubjectId;
  if (Object.keys(row).length === 0) return true;

  const { error } = await db.from('profiles').update(row).eq('id', auth.user.id);
  return !error;
};

/**
 * Saves or unsaves a note.
 *
 * The delete filters on `user_id` as well as `note_id` even though RLS already
 * confines it to this learner. Belt and braces: an owner policy that is ever
 * relaxed would otherwise turn this into a statement that unsaves a note for
 * everybody who saved it.
 */
export const toggleSavedNoteRemote = async (noteId: string, on: boolean): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;

  const { error } = on
    ? await db.from('saved_notes').upsert({ user_id: auth.user.id, note_id: noteId })
    : await db.from('saved_notes').delete().eq('user_id', auth.user.id).eq('note_id', noteId);
  return !error;
};

/** Joins or leaves a batch. */
export const toggleEnrolmentRemote = async (batchId: string, on: boolean): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;

  const { error } = on
    ? await db.from('enrolments').upsert({ user_id: auth.user.id, batch_id: batchId })
    : await db.from('enrolments').delete().eq('user_id', auth.user.id).eq('batch_id', batchId);
  return !error;
};

/** Opens a paper server-side. Returns null offline, so the caller stays local. */
export const startAttempt = async (test: Test, language: Lang): Promise<string | null> => {
  const db = getBackend();
  if (!db) return null;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  // Resume an unsubmitted paper rather than starting a second one.
  const { data: existing } = await db
    .from('attempts')
    .select('id')
    .eq('test_id', test.id)
    .is('submitted_at', null)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await db
    .from('attempts')
    .insert({
      user_id: auth.user.id,
      test_id: test.id,
      remaining_ms: test.durationMinutes * 60_000,
      current_question_id: testQuestionIds(test)[0],
      language,
    })
    .select('id')
    .single();
  if (error) return null;
  return data.id as string;
};

export const saveAnswer = async (
  attemptId: string,
  questionId: string,
  patch: { selectedOption: OptionLabel | null; markedForReview: boolean; timeSpentMs: number },
): Promise<void> => {
  const db = getBackend();
  if (!db) return;
  await db.from('attempt_answers').upsert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_option: patch.selectedOption,
    marked_for_review: patch.markedForReview,
    time_spent_ms: patch.timeSpentMs,
  });
};

export const syncClock = async (attemptId: string, remainingMs: number): Promise<void> => {
  const db = getBackend();
  if (!db) return;
  await db.from('attempts').update({ remaining_ms: remainingMs }).eq('id', attemptId);
};

/**
 * Grades the paper in the database and returns the result, including the rank
 * against everyone else who has submitted this test. Returns null offline, and
 * the caller falls back to the local engine.
 */
export const submitAttempt = async (
  attemptId: string,
  test: Test,
): Promise<TestResult | null> => {
  const db = getBackend();
  if (!db) return null;

  const { data, error } = await db.rpc('submit_attempt', { p_attempt_id: attemptId });
  const graded = Array.isArray(data) ? data[0] : data;
  if (error || !graded) return null;

  const { data: bySubject } = await db.rpc('attempt_subject_scores', { p_attempt_id: attemptId });
  const { data: byTopic } = await db.rpc('my_topic_accuracy');

  const subjectScores: SubjectScore[] = (bySubject ?? []).map((r: Record<string, unknown>) => ({
    subjectId: r.subject_id as string,
    attempted: Number(r.attempted),
    correct: Number(r.correct),
    incorrect: Number(r.incorrect),
    skipped: Number(r.skipped),
    score: Number(r.score),
    maxScore: Number(r.max_score),
    accuracy: Number(r.accuracy),
    timeSpentMs: Number(r.time_spent_ms),
  }));

  const topics: TopicPerformance[] = (byTopic ?? []).map((r: Record<string, unknown>) => ({
    topicId: r.topic_id as string,
    subjectId: r.subject_id as string,
    attempted: Number(r.attempted),
    correct: Number(r.correct),
    accuracy: Number(r.accuracy),
  }));

  return {
    attemptId,
    testId: test.id,
    score: Number(graded.score),
    maxScore: Number(graded.max_score),
    percentage: Number(graded.percentage),
    correct: Number(graded.correct),
    incorrect: Number(graded.incorrect),
    skipped: Number(graded.skipped),
    attempted: Number(graded.correct) + Number(graded.incorrect),
    accuracy: Number(graded.accuracy),
    totalTimeMs: Number(graded.total_time_ms),
    rank: Number(graded.rank),
    totalCandidates: Number(graded.total_candidates),
    percentile: Number(graded.percentile),
    qualified: Boolean(graded.qualified),
    cutoff: Number(graded.cutoff),
    subjectScores,
    weakTopics: topics.filter((t) => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    strongTopics: topics.filter((t) => t.accuracy >= 75).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5),
  };
};

/**
 * Bookmarks or unbookmarks a question.
 *
 * The delete is scoped by `user_id` as well: RLS confines it today, but a
 * statement whose safety depends entirely on a policy is one policy edit away
 * from clearing every learner's bookmark of this question.
 */
export const toggleBookmarkRemote = async (questionId: string, on: boolean): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;

  const { error } = on
    ? await db.from('bookmarks').upsert({ user_id: auth.user.id, question_id: questionId })
    : await db.from('bookmarks').delete().eq('user_id', auth.user.id).eq('question_id', questionId);
  return !error;
};

/** Uploads a Studio file to storage and returns its public URL. */
export const uploadMedia = async (
  bucket: 'videos' | 'notes',
  file: File | Blob,
  fileName: string,
): Promise<string | null> => {
  const db: SupabaseClient | null = getBackend();
  if (!db) return null;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;

  const path = `${auth.user.id}/${Date.now()}-${fileName}`;
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) return null;
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

export const markActiveTodayRemote = async (): Promise<void> => {
  const db = getBackend();
  if (!db) return;
  await db.rpc('mark_active_today');
};

/* ------------------------------------------------------- studio: importing */

/**
 * The educator-side half of the repository.
 *
 * Everything below writes, so everything below needs a backend: there is no
 * offline fallback for publishing a question, and pretending otherwise would
 * let the Studio report success while nothing was saved. Each function returns
 * a discriminated result rather than throwing, because the caller is a wizard
 * that has to show the educator what happened at every step.
 */

export type StudioResult<T> = { ok: true; value: T } | { ok: false; error: string };

const needBackend = (): SupabaseClient | { ok: false; error: string } => {
  const db = getBackend();
  if (!db) {
    return {
      ok: false,
      error:
        'No database is configured. Import writes to Postgres, so it needs Supabase credentials — offline mode is read-only.',
    };
  }
  return db;
};

const isFailure = (v: unknown): v is { ok: false; error: string } =>
  typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: boolean }).ok === false;

/** Am I allowed to open the Studio at all? Confirmed server-side, never assumed. */
export const isStaff = async (): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return false;
  const { data } = await db.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === 'educator' || role === 'admin';
};

export interface ImportBatch {
  id: string;
  label: string | null;
  filename: string | null;
  examId: string | null;
  status: 'pending' | 'validated' | 'committed' | 'discarded';
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  createdAt: string;
  committedAt: string | null;
}

const toBatch = (r: Record<string, unknown>): ImportBatch => ({
  id: r.id as string,
  label: (r.label as string) ?? null,
  filename: (r.filename as string) ?? null,
  examId: (r.exam_id as string) ?? null,
  status: r.status as ImportBatch['status'],
  totalRows: Number(r.total_rows ?? 0),
  acceptedRows: Number(r.accepted_rows ?? 0),
  rejectedRows: Number(r.rejected_rows ?? 0),
  duplicateRows: Number(r.duplicate_rows ?? 0),
  createdAt: r.created_at as string,
  committedAt: (r.committed_at as string) ?? null,
});

/** Records an upload before anything is written to the question bank. */
export const createImportBatch = async (input: {
  label: string;
  filename: string;
  examId?: string;
  totalRows: number;
  rejectedRows: number;
  duplicateRows: number;
  report: unknown;
}): Promise<StudioResult<ImportBatch>> => {
  const db = needBackend();
  if (isFailure(db)) return db;

  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, error: 'You are signed out. Sign in as an educator to import.' };

  const { data, error } = await db
    .from('import_batches')
    .insert({
      label: input.label,
      filename: input.filename,
      exam_id: input.examId ?? null,
      kind: 'questions',
      status: 'validated',
      total_rows: input.totalRows,
      accepted_rows: 0,
      rejected_rows: input.rejectedRows,
      duplicate_rows: input.duplicateRows,
      report: input.report as never,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'Could not record the import.' };
  return { ok: true, value: toBatch(data as Record<string, unknown>) };
};

export const listImportBatches = (): Promise<ImportBatch[]> =>
  withFallback(
    async (db) => {
      const { data, error } = await db
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error || !data) throw error ?? new Error('no batches');
      return (data as Record<string, unknown>[]).map(toBatch);
    },
    // Nothing has ever been imported offline, because import needs a database.
    () => [],
  );

/**
 * Which of these questions the library already has.
 *
 * Fingerprints go in, matches come out — the bank stays in Postgres. Chunked so
 * a 20,000-row file does not build a single enormous array parameter.
 */
export const findLibraryDuplicates = async (
  fingerprints: string[],
): Promise<{ fingerprint: string; id: string; pyq?: PyqRef }[]> => {
  const db = getBackend();
  if (!db) return [];
  const found: { fingerprint: string; id: string; pyq?: PyqRef }[] = [];

  for (const chunk of chunked(fingerprints, 500)) {
    const { data, error } = await db.rpc('find_duplicate_fingerprints', {
      p_fingerprints: chunk,
    });
    if (error || !data) continue;
    for (const r of data as Record<string, unknown>[]) {
      found.push({
        fingerprint: r.fingerprint as string,
        id: r.question_id as string,
        pyq: r.pyq_year
          ? {
              examId: (r.pyq_exam_id as string) ?? '',
              year: r.pyq_year as number,
              paperLabel: (r.pyq_paper_label as string) ?? undefined,
              shift: (r.pyq_shift as string) ?? undefined,
            }
          : undefined,
      });
    }
  }
  return found;
};

/** Splits work into batches the database can swallow in one statement. */
function* chunked<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

export interface ImportProgress {
  /** Rows written so far. */
  done: number;
  total: number;
}

/**
 * Writes accepted rows as drafts, in chunks, reporting progress as it goes.
 *
 * Status is forced to draft by the database function, not by this argument
 * list: import is not a publishing route, and that rule belongs where it cannot
 * be talked out of.
 *
 * A chunk that fails stops the run and reports how many rows had already been
 * written. Continuing past a failure would leave the educator with a partial
 * import they believe is complete.
 */
export const commitImport = async (
  batchId: string,
  questions: ContentQuestion[],
  onProgress?: (p: ImportProgress) => void,
  chunkSize = 250,
): Promise<StudioResult<number>> => {
  const db = needBackend();
  if (isFailure(db)) return db;

  let written = 0;
  for (const chunk of chunked(questions, chunkSize)) {
    // The flat shape `commit_import_batch` now takes. Options go out as eight
    // named columns rather than an array, so a row that is short of options is
    // short of them in the database too, where the CHECK constraints can see it.
    const payload = chunk.map((q) => ({
      id: q.id,
      question_en: q.text.en ?? null,
      question_hi: q.text.hi ?? null,
      option_a_en: q.options[0]?.en ?? null,
      option_b_en: q.options[1]?.en ?? null,
      option_c_en: q.options[2]?.en ?? null,
      option_d_en: q.options[3]?.en ?? null,
      option_a_hi: q.options[0]?.hi ?? null,
      option_b_hi: q.options[1]?.hi ?? null,
      option_c_hi: q.options[2]?.hi ?? null,
      option_d_hi: q.options[3]?.hi ?? null,
      correct_answers: q.correctAnswers,
      answer_status: q.answerStatus,
      grace_marks_awarded: q.graceMarksAwarded,
      excluded_from_total: q.excludedFromTotal,
      explanation_en: q.explanation.en ?? null,
      explanation_hi: q.explanation.hi ?? null,
      difficulty: q.difficulty,
      paper_id: q.paperId ?? null,
      topic_id: q.topicId ?? null,
      elective_subject_id: null,
      year: q.year ?? q.pyq?.year ?? null,
      question_no: q.questionNo ?? q.pyq?.questionNumber ?? null,
      paper_set: q.paperSet ?? null,
      source: q.source ?? null,
      exam_ids: q.examIds,
      fingerprint: fingerprint(q.text),
    }));

    const { data, error } = await db.rpc('commit_import_batch', {
      p_batch_id: batchId,
      p_questions: payload,
    });

    if (error) {
      return {
        ok: false,
        error: `Stopped after ${written} of ${questions.length} questions: ${error.message}`,
      };
    }
    written += Number(data ?? chunk.length);
    onProgress?.({ done: written, total: questions.length });
  }

  return { ok: true, value: written };
};

/* -------------------------------------------------------- studio: review */

export interface DraftFilter {
  status?: ContentStatus;
  batchId?: string;
  subjectId?: string;
  limit?: number;
  offset?: number;
}

export interface DraftQuestion {
  id: string;
  status: ContentStatus;
  text: Bilingual;
  options: Bilingual[];
  correctIndex: number;
  subjectId: string;
  topicId: string;
  examIds: string[];
  pyq?: PyqRef;
  createdAt: string;
}

/**
 * Questions awaiting review.
 *
 * Deliberately not `listQuestions`: that one pins `status = 'published'` for
 * learners, and loosening it there would be exactly the mistake the pin exists
 * to prevent. RLS still decides what comes back — a learner calling this gets
 * nothing.
 */
export const listDraftQuestions = async (filter: DraftFilter = {}): Promise<DraftQuestion[]> => {
  const db = getBackend();
  if (!db) return [];

  // With no explicit limit this returns the whole queue, paged. It used to
  // return one page and stop, so an 840-row import showed 200 drafts and the
  // other 640 were invisible — there was no next-page control, and no hint that
  // anything had been left behind. Reviewing a batch means seeing the batch.
  const windowed = filter.limit !== undefined;
  const pageSize = filter.limit ?? 1000;
  // A bound, not an expectation: the loop's real exit is a short page. It must
  // not depend on the server honouring Range to avoid spinning forever.
  const maxPages = 50;

  const rows: Record<string, unknown>[] = [];
  let from = filter.offset ?? 0;

  for (let page = 0; page < maxPages; page += 1) {
    let q = db
      .from('questions')
      .select('*')
      .eq('status', filter.status ?? 'draft')
      .order('created_at', { ascending: false });
    if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
    q = q.range(from, from + pageSize - 1);

    const { data, error } = await q;
    if (error || !data) break;
    rows.push(...(data as Record<string, unknown>[]));
    // A caller that asked for a window gets exactly that window.
    if (windowed || data.length < pageSize) break;
    from += pageSize;
  }

  return rows.map((r) => ({
    id: r.id as string,
    status: r.status as ContentStatus,
    text: r.text as Bilingual,
    options: r.options as Bilingual[],
    correctIndex: r.correct_index as number,
    subjectId: r.subject_id as string,
    topicId: r.topic_id as string,
    examIds: (r.exam_ids as string[]) ?? [],
    pyq: r.pyq_year
      ? {
          examId: (r.pyq_exam_id as string) ?? '',
          year: r.pyq_year as number,
          paperLabel: (r.pyq_paper_label as string) ?? undefined,
          shift: (r.pyq_shift as string) ?? undefined,
        }
      : undefined,
    createdAt: r.created_at as string,
  }));
};

export interface BulkStatusOutcome {
  id: string;
  ok: boolean;
  message: string | null;
}

/**
 * Publishes or archives a selection.
 *
 * Routed through `set_question_status_bulk`, which calls `set_question_status`
 * per row — so the database's publish-time checks apply to every question and
 * the audit trigger fires for each. Rows that fail come back with the reason
 * rather than being dropped.
 */
export const setQuestionStatusBulk = async (
  ids: string[],
  status: ContentStatus,
): Promise<StudioResult<BulkStatusOutcome[]>> => {
  const db = needBackend();
  if (isFailure(db)) return db;

  const outcomes: BulkStatusOutcome[] = [];
  for (const chunk of chunked(ids, 200)) {
    const { data, error } = await db.rpc('set_question_status_bulk', {
      p_ids: chunk,
      p_status: status,
    });
    if (error) return { ok: false, error: error.message };
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      outcomes.push({
        id: r.id as string,
        ok: Boolean(r.ok),
        message: (r.message as string) ?? null,
      });
    }
  }
  return { ok: true, value: outcomes };
};

/* ------------------------------------------------------ studio: analytics */

export interface YearCount {
  year: number;
  questionCount: number;
  topicId: string;
  subjectId: string;
}

/**
 * Questions per year, for the trend chart.
 *
 * Years with no questions are absent rather than zero: a gap means the paper
 * has not been collected, and drawing it as a zero would claim the topic was
 * not asked that year.
 */
export const listPyqYearCounts = (filter: {
  examId?: string;
  subjectId?: string;
  topicId?: string;
} = {}): Promise<YearCount[]> =>
  withFallback(
    async (db) => {
      let q = db.from('pyq_year_counts').select('*').order('year', { ascending: true });
      if (filter.examId) q = q.eq('exam_id', filter.examId);
      if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
      if (filter.topicId) q = q.eq('topic_id', filter.topicId);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no year counts');
      return (data as Record<string, unknown>[]).map((r) => ({
        year: Number(r.year),
        questionCount: Number(r.question_count),
        topicId: r.topic_id as string,
        subjectId: r.subject_id as string,
      }));
    },
    () => [],
  );

/* ------------------------------------------------- levels and their subjects */

/**
 * The teaching levels onboarding offers.
 *
 * There is no bundled fallback, unlike exams and notes: levels arrived with
 * migration 0020 and the offline content predates them. An offline build gets
 * an empty list, and the screen says so rather than inventing four cards that
 * the database might disagree with. That is a real gap — onboarding cannot be
 * completed offline — and it is recorded here rather than papered over.
 */
export const listLevels = async (): Promise<Level[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db
    .from('levels')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return (data as {
    id: string;
    name: string;
    full_name: Bilingual;
    classes: Bilingual | null;
    icon: string;
    color: string;
    sort_order: number;
    requires_subject?: boolean;
    teaching_levels?: string[] | null;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    classes: r.classes ?? undefined,
    icon: r.icon,
    color: r.color,
    sortOrder: r.sort_order,
    // Defaults to true, matching the column: a level that predates 0021, or a
    // row read from an older project, still gets asked rather than silently
    // skipping a question it may well need.
    requiresSubject: r.requires_subject ?? true,
    teachingLevels: r.teaching_levels ?? [],
  }));
};

/**
 * The subjects one level examines, in the order the board lists them.
 *
 * The subject's own name, icon and colour are joined from `subjects` so the
 * cards stay consistent with every other screen that renders a subject; only
 * the hint is per-level.
 */
export const listLevelSubjects = async (levelId: string): Promise<LevelSubject[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db
    .from('level_subjects')
    .select('level_id, subject_id, hint, sort_order, subjects(name, icon, color)')
    .eq('level_id', levelId)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];

  /*
   * The embed is typed as an array because PostgREST cannot tell a to-one from
   * a to-many at the type level, but `level_subjects.subject_id` is a plain
   * foreign key so exactly one row comes back. Normalising both shapes here
   * means the rest of this function does not care which the client believed.
   */
  type Joined = { name: Bilingual; icon: string; color: string };
  const rows = data as unknown as {
    level_id: string;
    subject_id: string;
    hint: Bilingual | null;
    sort_order: number;
    subjects: Joined | Joined[] | null;
  }[];

  return rows
    .map((r) => {
      const subject = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects;
      if (!subject) return undefined;
      const offer: LevelSubject = {
        levelId: r.level_id,
        subjectId: r.subject_id,
        name: subject.name,
        hint: r.hint ?? undefined,
        icon: subject.icon,
        color: subject.color,
        sortOrder: r.sort_order,
      };
      return offer;
    })
    .filter((s): s is LevelSubject => s !== undefined);
};

/** The levels this learner said they sit. Empty means they have not answered. */
export const fetchLearnerLevelIds = async (): Promise<string[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db.from('learner_levels').select('level_id');
  if (error || !data) return [];
  return (data as { level_id: string }[]).map((r) => r.level_id);
};

/**
 * Replaces the learner's set of levels.
 *
 * Removing a level takes its subject with it — see `set_learner_levels` in
 * 0020 for why that has to happen in the same statement.
 */
export const saveLearnerLevelIds = async (
  levelIds: readonly string[],
): Promise<WriteOutcome> => {
  const db = getBackend();
  if (!db) return { ok: false, expired: false };
  const { error } = await db.rpc('set_learner_levels', { p_level_ids: [...levelIds] });
  return error ? explainWriteFailure(error) : { ok: true };
};

/** The subject chosen for each level the learner sits. */
export const fetchLearnerSubjects = async (): Promise<LearnerSubject[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db.from('learner_subjects').select('level_id, subject_id');
  if (error || !data) return [];
  return (data as { level_id: string; subject_id: string }[]).map((r) => ({
    levelId: r.level_id,
    subjectId: r.subject_id,
  }));
};

/**
 * Records the subject for one level.
 *
 * The RPC re-checks that the subject is offered at that level and that the
 * level is one of the learner's own, so a stale tab cannot write a syllabus
 * nobody asked for.
 */
export const saveLearnerSubject = async (
  levelId: string,
  subjectId: string,
): Promise<WriteOutcome> => {
  const db = getBackend();
  if (!db) return { ok: false, expired: false };
  const { error } = await db.rpc('set_learner_subject', {
    p_level_id: levelId,
    p_subject_id: subjectId,
  });
  return error ? explainWriteFailure(error) : { ok: true };
};

/* --------------------------------------------------- one learner's paper */

/** A block of the paper the learner sits, as the PYQ screen lists them. */
export interface PrepSection {
  subjectId: string;
  name: Bilingual;
  /** What the chip says — "Numerical Aptitude" where `name` is the syllabus's
   *  "Quantitative Aptitude". Falls back to the English name when unset. */
  shortName: string;
  icon: string;
  color: string;
  /** Questions this block carries in the blueprint — 30 for CDP, 60 elective. */
  questions: number;
  /** True where the blueprint left the subject to the candidate's choice. */
  elective: boolean;
}

/**
 * The sections of an exam's paper for a given post, with the elective resolved.
 *
 * `paper_sections` describes the blueprint: CDP 30, Hindi 15, English 15, and a
 * 60-mark block whose subject is whichever the candidate applied in. That last
 * one is a hole in the shape, and this fills it with the learner's own subject
 * so the screen can list seven named sections rather than six and a question
 * mark.
 *
 * `post` rather than a paper id, because the learner told onboarding a level —
 * TGT — and which paper that is differs per exam. HTET calls it Level 2, CTET
 * calls it Paper 2, and neither of those is a word the learner used.
 */
export const listPrepSections = async (
  examId: string,
  level: { teachingLevels?: string[]; name: string },
  electiveSubjectId?: string,
): Promise<PrepSection[]> => {
  const db = getBackend();
  if (!db) return [];

  const { data: papers } = await db
    .from('exam_papers')
    .select('id, post, level')
    .eq('exam_id', examId);
  const rowsIn = (papers as { id: string; post: string | null; level: string | null }[] | null) ?? [];

  /*
   * `level` first, `post` only as a fallback.
   *
   * `post` is what one board prints — PRT, "Paper II", "Varg 3" — so matching
   * the learner's level name against it worked for HTET and silently returned
   * nothing for every other exam, which rendered as a PYQ screen with no
   * sections at all. `exam_papers.level` is the shared vocabulary and is set on
   * every seeded paper. The post match survives only for a row that somehow has
   * no level.
   */
  const covers = level.teachingLevels ?? [];
  const paper =
    (covers.length > 0
      ? rowsIn.find((p) => covers.includes(p.level ?? ''))
      : undefined) ??
    rowsIn.find((p) => (p.post ?? '').toUpperCase() === level.name.toUpperCase());
  if (!paper) return [];

  const { data, error } = await db
    .from('paper_sections')
    .select('subject_id, elective_group_id, questions, subjects(name, short_name, icon, color)')
    .eq('paper_id', paper.id)
    .order('questions', { ascending: false });
  if (error || !data) return [];

  type Joined = { name: Bilingual; short_name: string | null; icon: string; color: string };
  const rows = data as unknown as {
    subject_id: string | null;
    elective_group_id: string | null;
    questions: number;
    subjects: Joined | Joined[] | null;
  }[];

  // The elective row carries no subject of its own, so its name and colour come
  // from the learner's choice — looked up once rather than per row.
  let chosen: Joined | undefined;
  if (electiveSubjectId) {
    const { data: s } = await db
      .from('subjects')
      .select('name, short_name, icon, color')
      .eq('id', electiveSubjectId)
      .maybeSingle();
    chosen = (s as Joined | null) ?? undefined;
  }

  /*
   * Fixed blocks first, largest to smallest, and the elective last regardless
   * of its size. Ordering purely by question count put the 60-mark elective at
   * the head of the chips — ahead of Child Development, which every candidate
   * sits — so the first thing on the screen was the one section that differs
   * per person. The board prints it last for the same reason.
   */
  const ordered = [...rows].sort((a, b) => {
    const ae = a.elective_group_id ? 1 : 0;
    const be = b.elective_group_id ? 1 : 0;
    if (ae !== be) return ae - be;
    return b.questions - a.questions;
  });

  return ordered
    .map((r): PrepSection | undefined => {
      if (r.elective_group_id) {
        if (!chosen || !electiveSubjectId) return undefined;
        return {
          subjectId: electiveSubjectId,
          name: chosen.name,
          shortName: chosen.short_name ?? chosen.name.en,
          icon: chosen.icon,
          color: chosen.color,
          questions: r.questions,
          elective: true,
        };
      }
      const s = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects;
      if (!s || !r.subject_id) return undefined;
      return {
        subjectId: r.subject_id,
        name: s.name,
        shortName: s.short_name ?? s.name.en,
        icon: s.icon,
        color: s.color,
        questions: r.questions,
        elective: false,
      };
    })
    .filter((s): s is PrepSection => s !== undefined);
};

export const listTopicsForSubject = async (
  subjectId: string,
): Promise<{ id: string; name: Bilingual }[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db
    .from('topics')
    .select('id, name')
    .eq('subject_id', subjectId)
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data as { id: string; name: Bilingual }[];
};

/** A year the exam was held, and how much of it the bank actually holds. */
export interface PyqSession {
  year: number;
  /** Questions collected so far. Zero until a paper is imported. */
  collected: number;
  /** What the board's paper carried, where known. */
  paperQuestions?: number;
}

/**
 * The years an exam has been held, newest first, each with what we have of it.
 *
 * Two facts, kept apart on purpose. `pyq_years` says HTET ran from 2018 to
 * 2024 — true whatever is in our database — and `questions` says how many of
 * those we have typed up. Deriving the year list from the bank, as this screen
 * first did, answered the second question by deleting the first: an empty bank
 * meant an empty screen, and an aspirant was shown nothing where seven papers
 * exist.
 *
 * So every year is listed, and a year we have none of says zero rather than
 * being hidden. `subjectId` narrows the count to one section without dropping
 * years, which is what the section-wise tab lists.
 */
export const listPyqSessions = async (
  examId: string,
  subjectId?: string,
): Promise<PyqSession[]> => {
  const db = getBackend();
  if (!db) return [];

  const { data: years, error } = await db
    .from('pyq_years')
    .select('year, paper_questions')
    .eq('exam_id', examId)
    .order('year', { ascending: false });
  if (error || !years) return [];

  const counts = await listPyqYearCounts(subjectId ? { examId, subjectId } : { examId });
  const collected = new Map<number, number>();
  for (const row of counts) {
    collected.set(row.year, (collected.get(row.year) ?? 0) + row.questionCount);
  }

  return (years as { year: number; paper_questions: number | null }[]).map((y) => ({
    year: y.year,
    collected: collected.get(y.year) ?? 0,
    paperQuestions: y.paper_questions ?? undefined,
  }));
};

/** One part of a composite subject — Physics within Science. */
export interface SubjectPart {
  subjectId: string;
  shortName: string;
  name: Bilingual;
  icon: string;
  color: string;
}

/**
 * The subjects a section is made of, if it is made of any.
 *
 * "Science" on an HTET TGT paper is one 60-mark block, but a candidate revising
 * it thinks in Physics, Chemistry and Biology, and the screen offers those as
 * tabs. Empty for a section that is genuinely one subject — Child Development
 * has no parts — and the tabs disappear rather than showing a single "All".
 */
export const listSubjectParts = async (parentId: string): Promise<SubjectPart[]> => {
  const db = getBackend();
  if (!db) return [];
  const { data, error } = await db
    .from('subjects')
    .select('id, short_name, name, icon, color')
    .eq('parent_subject_id', parentId)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return (data as {
    id: string;
    short_name: string | null;
    name: Bilingual;
    icon: string;
    color: string;
  }[]).map((r) => ({
    subjectId: r.id,
    shortName: r.short_name ?? r.name.en,
    name: r.name,
    icon: r.icon,
    color: r.color,
  }));
};

/**
 * Topics across a subject and every part of it.
 *
 * The "All" tab under Science lists Physics, Chemistry and Biology together,
 * which is one query rather than three merged in the screen — and it keeps the
 * count on the header honest, because "3 subjects, 69 topics" has to be the
 * same number the list below it renders.
 */
export const listTopicsForSubjectTree = async (
  subjectId: string,
): Promise<{ id: string; name: Bilingual }[]> => {
  const db = getBackend();
  if (!db) return [];
  const parts = await listSubjectParts(subjectId);
  const ids = [subjectId, ...parts.map((p) => p.subjectId)];
  const { data, error } = await db
    .from('topics')
    .select('id, name')
    .in('subject_id', ids)
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data as { id: string; name: Bilingual }[];
};

/**
 * Which `exam_papers.level` values a set of exams actually examine.
 *
 * The level chooser offered PRT, TGT and PGT to everybody, and CTET has no PGT
 * paper at all — so a CTET candidate could pick a level their exam does not
 * run, and then reach a PYQ screen with nothing behind it. Asking the papers
 * is the only honest answer, and it costs one query.
 *
 * Empty when nothing is known, and the caller shows every level rather than
 * none: an unanswerable question is better than a screen with no options.
 */
export const listPaperLevelsForExams = async (
  examIds: readonly string[],
): Promise<string[]> => {
  const db = getBackend();
  if (!db || examIds.length === 0) return [];
  const { data, error } = await db
    .from('exam_papers')
    .select('level')
    .in('exam_id', [...examIds]);
  if (error || !data) return [];
  const levels = new Set<string>();
  for (const row of data as { level: string | null }[]) {
    if (row.level) levels.add(row.level);
  }
  return [...levels];
};

/**
 * The subjects a learner may actually choose, for the level they sit.
 *
 * Reads `elective_choices` — the per-paper list the boards publish — rather
 * than the generic per-level list in `level_subjects`. The difference is not
 * cosmetic: CTET Paper II offers exactly two choices, Mathematics & Science or
 * Social Studies, while HTET Level 2 offers twelve and DSSSB PGT twenty-one.
 * Showing one exam's list to another exam's candidate offers them a subject
 * they cannot sit.
 *
 * The union across the learner's exams, because they chose several and each
 * has its own list. Offering the intersection would hide a subject that one of
 * their exams genuinely runs; the union lets them pick anything at least one
 * of their exams examines, which is the question they were actually asked.
 *
 * Empty when none of their papers define an elective at all — several exams
 * have no such data yet — and the caller falls back to `level_subjects` rather
 * than showing an empty grid.
 */
export const listElectiveChoices = async (
  examIds: readonly string[],
  teachingLevels: readonly string[],
): Promise<string[]> => {
  const db = getBackend();
  if (!db || examIds.length === 0 || teachingLevels.length === 0) return [];

  const { data: papers } = await db
    .from('exam_papers')
    .select('id')
    .in('exam_id', [...examIds])
    .in('level', [...teachingLevels]);
  const paperIds = (papers as { id: string }[] | null)?.map((p) => p.id) ?? [];
  if (paperIds.length === 0) return [];

  const { data: groups } = await db
    .from('elective_groups')
    .select('id')
    .in('paper_id', paperIds);
  const groupIds = (groups as { id: string }[] | null)?.map((g) => g.id) ?? [];
  if (groupIds.length === 0) return [];

  const { data, error } = await db
    .from('elective_choices')
    .select('subject_id, sort_order')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];

  // Deduped, first-seen order kept: the boards list their own subjects in a
  // deliberate order and re-sorting would put Art above Science on a paper
  // whose notification does the opposite.
  const seen = new Set<string>();
  for (const row of data as { subject_id: string }[]) seen.add(row.subject_id);
  return [...seen];
};

/**
 * Why a learner-owned write failed, when it failed.
 *
 * The three onboarding saves returned a bare boolean, so every screen reported
 * the same "check your connection" whatever went wrong. The failure that
 * actually happens is not a network one: with no session the request runs as
 * `anon`, PostgREST answers 401, and Postgres logs "permission denied for
 * function set_learner_exams". A learner shown "check your connection" retries
 * forever; one told their sign-in expired signs in again.
 */
export type WriteOutcome = { ok: true } | { ok: false; expired: boolean };

/** True when the request has a session the server will accept. */
export const hasLiveSession = async (): Promise<boolean> => {
  const db = getBackend();
  if (!db) return false;
  try {
    const { data } = await db.auth.getSession();
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
};

/**
 * Classifies a failed write.
 *
 * Asks the client whether it still holds a session rather than trusting the
 * error string alone, because PostgREST's 401 body and Postgres's "permission
 * denied" say the same thing in two different vocabularies and neither is
 * guaranteed to reach here intact.
 */
export const explainWriteFailure = async (error: unknown): Promise<WriteOutcome> => {
  const text = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  const looksAuth =
    text.includes('permission denied') ||
    text.includes('jwt') ||
    text.includes('401') ||
    text.includes('unauthorized');
  if (looksAuth) return { ok: false, expired: true };
  return { ok: false, expired: !(await hasLiveSession()) };
};
