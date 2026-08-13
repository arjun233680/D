import type { SupabaseClient } from '@supabase/supabase-js';
import { getBackend, withFallback } from './client';
import type {
  Bilingual,
  Exam,
  Lang,
  Question,
  SubjectScore,
  Test,
  TestResult,
  TopicPerformance,
  User,
} from '../types';
import { EXAMS, getExam as seedExam, getExamBySlug as seedExamBySlug } from '../data/exams';
import { TESTS, getTest as seedTest, testQuestionIds } from '../data/tests';
import { NOTES } from '../data/notes';
import { VIDEOS } from '../data/videos';
import { BATCHES } from '../data/batches';
import { CURRENT_AFFAIRS } from '../data/feeds';
import { buildPracticeSet, type PracticeFilter } from '../engine/practice';

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
  learners: number;
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
  learners: row.learners,
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
      .order('learners', { ascending: false });
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

export const listQuestions = (filter: PracticeFilter = {}): Promise<Question[]> =>
  withFallback(async (db) => {
    let q = db.from('questions').select('*');
    if (filter.subjectId) q = q.eq('subject_id', filter.subjectId);
    if (filter.topicId) q = q.eq('topic_id', filter.topicId);
    if (filter.difficulty) q = q.eq('difficulty', filter.difficulty);
    if (filter.pyqOnly) q = q.not('previous_year', 'is', null);
    if (filter.examId) q = q.contains('exam_ids', [filter.examId]);
    if (filter.ids) q = q.in('id', filter.ids);
    if (filter.limit) q = q.limit(filter.limit);
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
        previousYear: (r.previous_year as string) ?? undefined,
        avgTimeSeconds: r.avg_time_seconds as number,
        accuracy: Number(r.accuracy),
      }),
    );
  }, () => buildPracticeSet(filter));

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

export const listNotes = () => withFallback(async () => NOTES, () => NOTES);
export const listVideos = () => withFallback(async () => VIDEOS, () => VIDEOS);
export const listBatches = () => withFallback(async () => BATCHES, () => BATCHES);

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
