import type { SupabaseClient } from '@supabase/supabase-js';
import { getBackend, withFallback } from './client';
import type {
  Bilingual,
  Exam,
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
import { buildPracticeSet, type PracticeFilter } from '../engine/practice';
import { formatPyq } from '../content/types';
import type { ContentQuestion, ContentStatus, PyqRef } from '../content/types';
import { fingerprint } from '../content/duplicates';

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
      // Was ordered by a seeded "learners" count. Short name is arbitrary but
      // at least stable, and the goal picker groups them properly anyway.
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
    let q = db.from('questions').select('*').eq('status', 'published');
    if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
    if (filter.unitId) q = q.eq('unit_id', filter.unitId);
    if (filter.topicId) q = q.eq('topic_id', filter.topicId);
    if (filter.subtopicId) q = q.eq('subtopic_id', filter.subtopicId);
    if (filter.difficulty) q = q.eq('difficulty', filter.difficulty);
    if (filter.level) q = q.contains('levels', [filter.level]);
    // Structured provenance, never the legacy prose column: a year filter has to
    // mean the year the paper was sat, not a substring match on a sentence.
    if (filter.year) q = q.eq('pyq_year', filter.year);
    if (filter.shift) q = q.eq('pyq_shift', filter.shift);
    if (filter.pyqOnly && !filter.year) q = q.not('pyq_year', 'is', null);
    if (filter.examId) q = q.contains('exam_ids', [filter.examId]);
    if (filter.ids) q = q.in('id', filter.ids);
    // A bank of 20,000 questions must never arrive in one response.
    const limit = filter.limit ?? 200;
    const offset = filter.offset ?? 0;
    q = q.range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error || !data) throw error ?? new Error('no questions');
    return data.map(
      (r: Record<string, unknown>): Question => ({
        id: r.id as string,
        subjectId: r.subject_id as string,
        topicId: r.topic_id as string,
        examIds: (r.exam_ids as string[]) ?? [],
        text: r.text as Bilingual,
        options: r.options as Bilingual[],
        correctIndex: r.correct_index as number,
        explanation: r.explanation as Bilingual,
        difficulty: r.difficulty as Question['difficulty'],
        // Structured provenance wins; the legacy prose column is the fallback
        // for questions imported before 0005 and never re-tagged.
        previousYear: r.pyq_year
          ? formatPyq(
              {
                examId: (r.pyq_exam_id as string) ?? '',
                year: r.pyq_year as number,
                session: (r.pyq_session as string) ?? undefined,
                paperLabel: (r.pyq_paper_label as string) ?? undefined,
                shift: (r.pyq_shift as string) ?? undefined,
              },
              seedExam((r.pyq_exam_id as string) ?? '')?.shortName,
            )
          : ((r.previous_year as string) ?? undefined),
        avgTimeSeconds: r.avg_time_seconds as number,
        accuracy: Number(r.accuracy),
      }),
    );
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
      let q = db.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'published');
      if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
      if (filter.topicId) q = q.eq('topic_id', filter.topicId);
      if (filter.subtopicId) q = q.eq('subtopic_id', filter.subtopicId);
      if (filter.unitId) q = q.eq('unit_id', filter.unitId);
      if (filter.examId) q = q.contains('exam_ids', [filter.examId]);
      if (filter.year) q = q.eq('pyq_year', filter.year);
      if (filter.pyqOnly && !filter.year) q = q.not('pyq_year', 'is', null);
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
export const listPyqYears = (examId?: string): Promise<number[]> =>
  withFallback(
    async (db) => {
      let q = db.from('questions').select('pyq_year').eq('status', 'published').not('pyq_year', 'is', null);
      if (examId) q = q.contains('exam_ids', [examId]);
      const { data, error } = await q;
      if (error || !data) throw error ?? new Error('no years');
      const years = new Set<number>();
      for (const row of data as { pyq_year: number }[]) years.add(row.pyq_year);
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
  views: (r.views as number) ?? 0,
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

/** Signed-in learner, or null when running signed-out or offline. */
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

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    role: profile.role === 'admin' ? 'educator' : profile.role,
    phone: profile.phone ?? undefined,
    email: auth.user.email ?? undefined,
    goalExamId: profile.goal_exam_id ?? 'ctet',
    targetPaperId: profile.target_paper_id ?? undefined,
    language: (profile.language as Lang) ?? 'hi',
    state: profile.state ?? undefined,
    joinedAt: profile.created_at,
    streakDays: 0,
    activeDates: (days ?? []).map((d: { day: string }) => d.day),
    subscription: profile.subscription,
    bookmarkedQuestionIds: (marks ?? []).map((b: { question_id: string }) => b.question_id),
    savedNoteIds: (saved ?? []).map((s: { note_id: string }) => s.note_id),
    enrolledBatchIds: (joined ?? []).map((e: { batch_id: string }) => e.batch_id),
  };
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
  patch: { selectedIndex: number | null; markedForReview: boolean; timeSpentMs: number },
): Promise<void> => {
  const db = getBackend();
  if (!db) return;
  await db.from('attempt_answers').upsert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_index: patch.selectedIndex,
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

export const toggleBookmarkRemote = async (questionId: string, on: boolean): Promise<void> => {
  const db = getBackend();
  if (!db) return;
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return;
  if (on) {
    await db.from('bookmarks').upsert({ user_id: auth.user.id, question_id: questionId });
  } else {
    await db.from('bookmarks').delete().eq('question_id', questionId);
  }
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
    const payload = chunk.map((q) => ({
      id: q.id,
      kind: q.kind,
      subject_id: q.subjectId,
      unit_id: q.unitId ?? null,
      topic_id: q.topicId,
      subtopic_id: q.subtopicId ?? null,
      exam_ids: q.examIds,
      levels: q.levels,
      text: q.text,
      options: q.options,
      correct_index: q.correctIndices[0] ?? 0,
      correct_indices: q.correctIndices,
      explanation: q.explanation,
      difficulty: q.difficulty,
      marks: q.marks ?? null,
      negative_marks: q.negativeMarks ?? null,
      pyq_exam_id: q.pyq?.examId ?? null,
      pyq_year: q.pyq?.year ?? null,
      pyq_session: q.pyq?.session ?? null,
      pyq_paper_label: q.pyq?.paperLabel ?? null,
      pyq_shift: q.pyq?.shift ?? null,
      pyq_question_number: q.pyq?.questionNumber ?? null,
      source: q.source ?? null,
      tags: q.tags,
      concept_tags: q.conceptTags,
      syllabus_ref: q.syllabusRef ?? null,
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

  let q = db
    .from('questions')
    .select('*')
    .eq('status', filter.status ?? 'draft')
    .order('created_at', { ascending: false });
  if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
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
