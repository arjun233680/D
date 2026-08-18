'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearResponse,
  createAttempt,
  formatClock,
  getSubject,
  gradeAttempt,
  paletteCounts,
  selectOption,
  statusOf,
  t,
  testQuestionIds,
  toggleMarkForReview,
  UI,
  visitQuestion,
  type Question,
  type QuestionStatus,
  type Test,
  type TestAttempt,
  type TestResult,
} from '@adhyapak/core';
import { getTopic } from '@adhyapak/core';
import { isCorrectAnswer, OPTION_LABELS, inLang } from '@adhyapak/core';
import type { OptionLabel } from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * The exam window: clock, section tabs, question, palette, and the action bar
 * every candidate already knows — Mark for Review and Clear Response on the
 * left, Previous and Save & Next on the right.
 *
 * Lifted out of the mock player so previous-year papers run in the same window
 * rather than in a second implementation of it. Two things it deliberately does
 * not do: look a question up in the bundled bank, and decide where to go after
 * submission. A previous-year paper is assembled from the database at runtime,
 * so its questions are handed in; and where "submitted" leads differs between a
 * seeded mock and a set the learner just filtered into existence.
 */

const STATUS_COLOR: Record<QuestionStatus, string> = {
  answered: 'var(--color-success)',
  'not-answered': 'var(--color-danger)',
  'not-visited': 'var(--color-line-strong)',
  marked: '#7C3AED',
  'answered-marked': '#7C3AED',
};

export function TestPlayer({
  test,
  questions,
  onSubmit,
  resume,
  onAttemptChange,
  instantFeedback = false,
}: {
  test: Test;
  /** The paper's questions. Passed in, never looked up — see above. */
  questions: Question[];
  onSubmit: (result: TestResult, attempt: TestAttempt) => void;
  /** An unfinished attempt to carry on from, when the caller keeps them. */
  resume?: TestAttempt;
  /**
   * Called on every change, so a caller that persists attempts can do so and a
   * refresh resumes the paper honestly. Optional: a paper assembled from a URL
   * has nowhere durable to be resumed from anyway.
   */
  onAttemptChange?: (attempt: TestAttempt) => void;
  /**
   * Marks the answer as soon as it is chosen, and offers the explanation.
   *
   * On for practice, off for a mock — a mock is a measurement, and showing the
   * key mid-paper would destroy it. When on, the question locks once answered:
   * being told the answer and then allowed to change it would let the score
   * report something the learner did not do.
   */
  instantFeedback?: boolean;
}) {
  const { lang, toggleLang, user, ready, toggleBookmark } = useStore();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  // Collapsed by default: the learner asked to be told whether they were right,
  // not to be handed a paragraph they did not ask for.
  const [explanationOpen, setExplanationOpen] = useState(false);
  const lastTickRef = useRef<number>(Date.now());

  const questionIds = useMemo(() => testQuestionIds(test), [test]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const findQuestion = useCallback((id: string) => byId.get(id), [byId]);

  // Resume an interrupted paper, or start a fresh one.
  useEffect(() => {
    if (!ready || attempt) return;
    const resumable = resume && !resume.submittedAt && resume.remainingMs > 0;
    setAttempt(resumable ? resume : createAttempt(test, user.id, lang));
    lastTickRef.current = Date.now();
  }, [ready, attempt, resume, test, user.id, lang]);

  const submit = useCallback(
    (current: TestAttempt) => {
      const submitted = { ...current, submittedAt: new Date().toISOString() };
      // The submitted attempt is kept, not discarded — the solutions screen
      // replays the learner's own choices against the key.
      onSubmit(gradeAttempt(test, submitted, findQuestion), submitted);
    },
    [test, findQuestion, onSubmit],
  );

  // One second tick: drains the clock and bills the time to the open question.
  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setAttempt((prev) => {
        if (!prev) return prev;
        const remainingMs = Math.max(0, prev.remainingMs - delta);
        const qid = prev.currentQuestionId;
        const answers = qid
          ? {
              ...prev.answers,
              [qid]: {
                questionId: qid,
                selectedOption: prev.answers[qid]?.selectedOption ?? null,
                markedForReview: prev.answers[qid]?.markedForReview ?? false,
                timeSpentMs: (prev.answers[qid]?.timeSpentMs ?? 0) + delta,
              },
            }
          : prev.answers;

        const next = { ...prev, remainingMs, answers };
        if (remainingMs === 0) {
          window.setTimeout(() => submit(next), 0);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt !== null, submit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every change so a refresh resumes the paper honestly.
  useEffect(() => {
    if (attempt && !attempt.submittedAt) onAttemptChange?.(attempt);
  }, [attempt, onAttemptChange]);

  if (!attempt) {
    return (
      <div className="grid min-h-dvh place-items-center text-[13px] text-[var(--color-muted)]">
        {lang === 'hi' ? 'पेपर तैयार हो रहा है…' : 'Preparing your paper…'}
      </div>
    );
  }

  const currentId = attempt.currentQuestionId ?? questionIds[0]!;
  const index = questionIds.indexOf(currentId);
  const question = findQuestion(currentId);
  const answer = attempt.answers[currentId];
  const counts = paletteCounts(test, attempt);
  const activeSection =
    test.sections.find((s) => s.questionIds.includes(currentId)) ?? test.sections[0]!;
  const lowTime = attempt.remainingMs < 5 * 60_000;
  const bookmarked = user.bookmarkedQuestionIds.includes(currentId);

  // Answered, with feedback on: the question is settled and shows its marking.
  const revealed = instantFeedback && (answer?.selectedOption ?? null) !== null;

  const goTo = (qid: string) => {
    setAttempt((prev) => (prev ? visitQuestion(prev, qid) : prev));
    setPaletteOpen(false);
    setExplanationOpen(false);
  };
  const move = (delta: number) => {
    const next = questionIds[index + delta];
    if (next) goTo(next);
  };

  return (
    /* A full-screen layer rather than a page section, so the window looks the
       same wherever it is opened from — a mock route the shell already steps
       aside for, or a practice screen that sits inside the site chrome. The
       middle row scrolls, not the page, which is what keeps the action bar and
       the palette pinned the way an exam engine does. */
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[var(--color-surface)]">
      {/* Exam header */}
      <header className="shrink-0 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{t(test.title, lang)}</p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              {t(activeSection.name, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleLang}
            className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-bold"
          >
            {lang === 'hi' ? 'ENG' : 'हिंदी'}
          </button>
          <div
            className={`rounded-lg px-2.5 py-1.5 text-[14px] font-extrabold tabular-nums ${
              lowTime
                ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                : 'bg-[var(--color-surface-alt)] text-[var(--color-body)]'
            }`}
          >
            ⏱ {formatClock(attempt.remainingMs)}
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg bg-[var(--color-ink)] px-2.5 py-1.5 text-[12px] font-bold text-white lg:hidden"
          >
            ☰
          </button>
        </div>

        {/* Section tabs */}
        <div className="rail flex gap-1.5 border-t border-[var(--color-line)] px-3 py-2">
          {test.sections.map((s) => {
            const active = s.id === activeSection.id;
            const first = s.questionIds[0];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => first && goTo(first)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  active
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
                }`}
              >
                {t(s.name, lang)} ({s.questionIds.length})
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Question */}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4">
          {question ? (
            <>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[var(--color-surface-alt)] px-2 py-1 text-[12px] font-extrabold">
                  Q{index + 1}
                  <span className="font-medium text-[var(--color-faint)]">/{questionIds.length}</span>
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-muted)]">
                  +{test.marksPerQuestion}
                  {test.negativeMarking ? ` / −${test.negativeMarking}` : ''}
                </span>
                {question.year ? (
                  <span className="rounded-full bg-[var(--color-info-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-info)]">
                    {String(question.year)}
                  </span>
                ) : null}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => toggleBookmark(currentId)}
                  className="text-[16px]"
                  title={t(UI.bookmark, lang)}
                >
                  {bookmarked ? '🔖' : '📑'}
                </button>
              </div>

              <p className="mt-3 text-[16px] leading-relaxed font-semibold">
                {inLang(question.text, lang)}
              </p>

              <div className="mt-4 space-y-2.5">
                {question.options.map((opt, i) => {
                  const label = OPTION_LABELS[i];
                  const selected = label !== undefined && answer?.selectedOption === label;
                  const isKey = label !== undefined && question.correctAnswers.includes(label);
                  // Only the key and the learner's own pick are marked. Colouring
                  // every wrong option would give away the next attempt too.
                  const marked = revealed && (isKey || selected);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={revealed}
                      onClick={() =>
                        setAttempt((prev) => (prev ? label ? selectOption(prev, currentId, label) : prev : prev))
                      }
                      className={`option-row flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left ${
                        marked
                          ? isKey
                            ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
                            : 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
                          : selected
                            ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                            : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${
                          marked
                            ? isKey
                              ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                              : 'border-[var(--color-danger)] bg-[var(--color-danger)] text-white'
                            : selected
                              ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                              : 'border-[var(--color-line-strong)] text-[var(--color-muted)]'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-[14px] leading-relaxed">{inLang(opt, lang)}</span>
                      {marked ? <span>{isKey ? '✅' : '❌'}</span> : null}
                    </button>
                  );
                })}
              </div>

              {/* Folded away until asked for: read it if you want it, skip it if
                  you already knew. */}
              {revealed ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setExplanationOpen((open) => !open)}
                    aria-expanded={explanationOpen}
                    className="flex w-full items-center gap-2 bg-[var(--color-surface-alt)] px-3.5 py-2.5 text-left text-[12px] font-bold"
                  >
                    <span className="text-[var(--color-muted)]">{explanationOpen ? '▾' : '▸'}</span>
                    {t(UI.explanation, lang)}
                  </button>
                  {explanationOpen ? (
                    <p className="px-3.5 py-3 text-[13px] leading-relaxed">
                      {inLang(question.explanation, lang)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </main>

        {/* Desktop palette */}
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-[var(--color-line)] p-4 lg:block">
          <Palette
            counts={counts}
            questionIds={questionIds}
            attempt={attempt}
            currentId={currentId}
            onGo={goTo}
            onSubmit={() => setConfirmSubmit(true)}
            findQuestion={findQuestion}
            lang={lang}
          />
        </aside>
      </div>

      {/* Action bar */}
      <div className="shrink-0 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setAttempt((prev) => (prev ? toggleMarkForReview(prev, currentId) : prev))
            }
            className={`rounded-lg border px-3 py-2 text-[12px] font-bold ${
              answer?.markedForReview
                ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]'
                : 'border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            🔖 {t(UI.markReview, lang)}
          </button>
          {/* Only where it can do something. In practice the answer is marked
              the moment it is chosen and the question locks, so this button
              could never be pressed usefully — before an answer there is
              nothing to clear, and after one it is disabled. In a mock, where
              nothing is revealed until submission, it is a real control and the
              one every exam engine offers. */}
          {instantFeedback ? null : (
            <button
              type="button"
              onClick={() => setAttempt((prev) => (prev ? clearResponse(prev, currentId) : prev))}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-[12px] font-bold text-[var(--color-muted)]"
            >
              {t(UI.clear, lang)}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-[12px] font-bold disabled:opacity-40"
          >
            ← {t(UI.previous, lang)}
          </button>
          {index === questionIds.length - 1 ? (
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              className="rounded-lg bg-[var(--color-danger)] px-4 py-2 text-[12px] font-bold text-white"
            >
              {t(UI.submit, lang)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => move(1)}
              className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[12px] font-bold text-white"
            >
              {t(UI.next, lang)} →
            </button>
          )}
        </div>
      </div>

      {/* Mobile palette drawer */}
      {paletteOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className="absolute inset-0 bg-black/40"
            onClick={() => setPaletteOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[290px] overflow-y-auto bg-[var(--color-surface)] p-4">
            <Palette
              counts={counts}
              questionIds={questionIds}
              attempt={attempt}
              currentId={currentId}
              onGo={goTo}
              onSubmit={() => {
                setPaletteOpen(false);
                setConfirmSubmit(true);
              }}
              findQuestion={findQuestion}
              lang={lang}
            />
          </div>
        </div>
      ) : null}

      {/* Submit confirmation */}
      {confirmSubmit ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-5">
            <h2 className="text-[17px] font-extrabold">
              {lang === 'hi' ? 'टेस्ट सबमिट करें?' : 'Submit the test?'}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              {lang === 'hi'
                ? 'सबमिट करने के बाद उत्तर नहीं बदले जा सकते।'
                : 'Answers cannot be changed after submitting.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              {[
                { label: t(UI.answered, lang), value: counts.answered + counts.answeredMarked, tone: 'var(--color-success)' },
                { label: t(UI.notAnswered, lang), value: counts.notAnswered, tone: 'var(--color-danger)' },
                { label: t(UI.marked, lang), value: counts.marked + counts.answeredMarked, tone: '#7C3AED' },
                { label: t(UI.notVisited, lang), value: counts.notVisited, tone: 'var(--color-faint)' },
              ].map((c) => (
                <div key={c.label} className="rounded-xl bg-[var(--color-surface-alt)] px-3 py-2.5">
                  <div className="text-[18px] font-extrabold" style={{ color: c.tone }}>
                    {c.value}
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)]">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-[13px] font-bold"
              >
                {lang === 'hi' ? 'वापस जाएँ' : 'Go back'}
              </button>
              <button
                type="button"
                onClick={() => submit(attempt)}
                className="flex-1 rounded-xl bg-[var(--color-danger)] py-2.5 text-[13px] font-bold text-white"
              >
                {t(UI.submit, lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


function Palette({
  counts,
  questionIds,
  attempt,
  currentId,
  onGo,
  onSubmit,
  findQuestion,
  lang,
}: {
  findQuestion: (id: string) => Question | undefined;
  counts: ReturnType<typeof paletteCounts>;
  questionIds: string[];
  attempt: TestAttempt;
  currentId: string;
  onGo: (id: string) => void;
  onSubmit: () => void;
  lang: 'en' | 'hi';
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
        {[
          { color: STATUS_COLOR.answered, label: t(UI.answered, lang), value: counts.answered },
          { color: STATUS_COLOR['not-answered'], label: t(UI.notAnswered, lang), value: counts.notAnswered },
          { color: STATUS_COLOR.marked, label: t(UI.marked, lang), value: counts.marked + counts.answeredMarked },
          { color: STATUS_COLOR['not-visited'], label: t(UI.notVisited, lang), value: counts.notVisited },
        ].map((c) => (
          <span key={c.label} className="flex items-center gap-1.5">
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold text-white"
              style={{ background: c.color }}
            >
              {c.value}
            </span>
            <span className="truncate text-[var(--color-muted)]">{c.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {questionIds.map((qid, i) => {
          const status = statusOf(attempt, qid);
          const isCurrent = qid === currentId;
          const subject = getSubject(getTopic(findQuestion(qid)?.topicId ?? '')?.subjectId ?? '');
          return (
            <button
              key={qid}
              type="button"
              onClick={() => onGo(qid)}
              title={subject ? t(subject.name, lang) : undefined}
              className={`h-8 rounded text-[11px] font-bold text-white ${
                isCurrent ? 'ring-2 ring-[var(--color-ink)] ring-offset-1' : ''
              }`}
              style={{
                background: STATUS_COLOR[status],
                color: status === 'not-visited' ? 'var(--color-body)' : '#fff',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        className="mt-4 w-full rounded-xl bg-[var(--color-danger)] py-2.5 text-[13px] font-bold text-white"
      >
        {t(UI.submit, lang)}
      </button>
    </div>
  );
}
