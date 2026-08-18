'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PYQ_MODES,
  countQuestions,
  getPaper,
  isBackendConfigured,
  listPyqYears,
  pyqModeEmptyReason,
  pyqModeLabel,
  pyqModeModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  resolvePyqSelection,
  t,
  type PyqMode,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { Skeleton } from '@/components/ui';

/**
 * Choosing a previous-year set.
 *
 * The funnel the product needs: exam → post → subject → year. The repository
 * always translated every one of those into a real query; this screen used to
 * send only the year, so a learner could not reach the CDP half of the 2023 PRT
 * paper at all.
 *
 * The questions themselves open on their own page. Filters above a live runner
 * meant the paper you were part-way through could be swapped out from under you
 * by a stray click on a dropdown, and it left no moment where a learner decides
 * they are starting — which is what makes it a sitting rather than a scroll.
 *
 * Every choice lives in the URL, so a chosen set can be shared and survives a
 * refresh. The post picker reads PRT / TGT / PGT, the way the bank is
 * categorised, and the subject picker lists every subject that paper can test —
 * all twenty-one PGT electives included — because this is a menu to choose
 * from, not a syllabus being asserted about the learner.
 */

export default function PyqPracticePage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender in a static export.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <PyqChooser />
    </Suspense>
  );
}

function PyqChooser() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();
  const params = useSearchParams();

  const mode = (params.get('mode') as PyqMode | null) ?? 'full-paper';

  // The URL is the source of truth; the profile fills whatever it leaves blank.
  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );

  const model = useMemo(
    () => pyqModeModel(mode, selection, user.electiveSubjectId),
    [mode, selection, user.electiveSubjectId],
  );

  const go = useCallback(
    (next: PyqSelection, nextMode: PyqMode) => {
      const q = new URLSearchParams({ ...pyqSelectionToParams(next), mode: nextMode }).toString();
      router.replace(`/practice/pyq?${q}`, { scroll: false });
    },
    [router],
  );

  const update = (patch: Partial<PyqSelection>) => go({ ...selection, ...patch }, mode);

  // Switching tab keeps the paper and year but drops what the other tab was
  // narrowing by: a topic means nothing in Full Papers, a section means nothing
  // in Topic Practice.
  const switchMode = (next: PyqMode) =>
    go({ ...selection, subjectId: undefined, topicId: undefined }, next);

  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  const total = useAsync(() => countQuestions(model.filter), [JSON.stringify(model.filter)]);

  const reason = pyqModeEmptyReason(model, selection);
  const paper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;
  const ready = !reason && total.data !== undefined && total.data > 0;
  const query = new URLSearchParams({ ...pyqSelectionToParams(selection), mode }).toString();
  const activeSubject = selection.subjectId ?? model.subjectTabs[0]?.value;

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <header>
        <h1 className="text-2xl font-extrabold">
          {hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'असली पेपरों से। पूरा पेपर दीजिए, एक खंड कीजिए, या किसी टॉपिक के सारे साल एक साथ।'
            : 'Straight from the real papers. Sit a whole one, do a single section, or take one topic across every year.'}
        </p>
      </header>

      {/* Three tabs, because a learner arrives with one of three questions. */}
      <nav className="flex border-b border-[var(--color-line)]" aria-label={hi ? 'मोड' : 'Mode'}>
        {PYQ_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-current={mode === m ? 'page' : undefined}
            className={`flex-1 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              mode === m
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {t(pyqModeLabel(m), lang)}
          </button>
        ))}
      </nav>

      {paper ? (
        <Link
          href="/"
          className="card flex items-center justify-between gap-3 p-3 transition-colors hover:border-[var(--color-brand)]"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-[var(--color-muted)]">
              {hi ? 'पेपर' : 'Paper'}
            </span>
            <span className="block truncate text-[14px] font-bold">{t(paper.name, lang)}</span>
          </span>
          <span className="text-[var(--color-muted)]">›</span>
        </Link>
      ) : null}

      {model.needsElective ? (
        <p className="card p-3 text-[13px] text-[var(--color-muted)]">
          {hi ? reason?.hi : reason?.en}
        </p>
      ) : null}

      {/* Years — the first two tabs only. Topic practice mixes them on purpose. */}
      {model.showYears && (years.data ?? []).length > 0 ? (
        <section>
          <h2 className="mb-1.5 text-[12px] font-bold text-[var(--color-muted)]">
            {hi ? 'वर्ष' : 'Year'}
          </h2>
          <div className="rail flex gap-2">
            {(years.data ?? []).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => update({ year: y })}
                aria-pressed={selection.year === y}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold tabular-nums ${
                  selection.year === y
                    ? 'border-transparent bg-[var(--color-ink)] text-white'
                    : 'border-[var(--color-line)] text-[var(--color-muted)]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Section cards, with the learner's elective already resolved — a TGT
          Science candidate sees Science, not all twelve options. */}
      {mode === 'section' && selection.year ? (
        <section className="grid gap-2 sm:grid-cols-2">
          {model.sections.map((sec) => (
            <button
              key={sec.subjectId}
              type="button"
              onClick={() => update({ subjectId: sec.subjectId })}
              aria-pressed={selection.subjectId === sec.subjectId}
              className={`card p-3 text-left transition-colors ${
                selection.subjectId === sec.subjectId
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'hover:border-[var(--color-brand)]'
              }`}
            >
              <span className="block text-[14px] font-bold">
                {hi ? sec.labelHi : sec.labelEn}
                {sec.elective ? (
                  <span className="ml-2 text-[11px] font-semibold text-[var(--color-muted)]">
                    {hi ? 'आपका विषय' : 'your subject'}
                  </span>
                ) : null}
              </span>
              <span className="block text-[12px] text-[var(--color-muted)]">
                {sec.questions} {hi ? 'प्रश्न इस पेपर में' : 'questions in this paper'}
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {/* Topic practice. The subject tabs carry no counts — a number on a tab
          invites comparing subjects, which is not what it is for — and the
          topic cards carry them, because that is the number being chosen. */}
      {mode === 'topic' ? (
        <>
          <section>
            <h2 className="mb-1.5 text-[12px] font-bold text-[var(--color-muted)]">
              {hi ? 'विषय' : 'Subject'}
            </h2>
            <div className="rail flex gap-2">
              {model.subjectTabs.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update({ subjectId: o.value, topicId: undefined })}
                  aria-pressed={activeSubject === o.value}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                    activeSubject === o.value
                      ? 'border-transparent bg-[var(--color-ink)] text-white'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]'
                  }`}
                >
                  {hi ? o.labelHi : o.labelEn}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            {model.topics.map((topic) => (
              <TopicCard
                key={topic.topicId}
                topicId={topic.topicId}
                label={hi ? topic.labelHi : topic.labelEn}
                examId={selection.examId}
                active={selection.topicId === topic.topicId}
                onClick={() => update({ topicId: topic.topicId })}
              />
            ))}
          </section>
        </>
      ) : null}

      {!isBackendConfigured() ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          {hi
            ? 'ऑफ़लाइन — इस बिल्ड में कोई प्रश्न बैंक नहीं है।'
            : 'Offline — this build has no question bank.'}
        </p>
      ) : null}

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xl font-extrabold tabular-nums">
            {total.loading ? '—' : (total.data ?? 0)}{' '}
            <span className="text-[13px] font-semibold text-[var(--color-muted)]">
              {hi ? 'प्रश्न' : total.data === 1 ? 'question' : 'questions'}
            </span>
          </p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {reason ? (hi ? reason.hi : reason.en) : t(pyqModeLabel(mode), lang)}
          </p>
        </div>
        {ready ? (
          <Link
            href={`/practice/pyq/attempt?${query}`}
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            {mode === 'full-paper'
              ? hi
                ? 'पूरा टेस्ट शुरू करें'
                : 'Start full test'
              : hi
                ? 'अभ्यास शुरू करें'
                : 'Start practice'}
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-full bg-[var(--color-line)] px-5 py-2.5 text-[13px] font-bold text-[var(--color-muted)]">
            {hi ? 'शुरू करें' : 'Start'}
          </span>
        )}
      </section>
    </div>
  );
}

/**
 * A topic card with the number of questions behind it.
 *
 * Counted per card rather than in one aggregate because it is the number the
 * learner is choosing between — "Piaget 84, Learning 31" is the whole decision
 * — and a card blank until some total landed would make the smaller topics look
 * empty rather than small.
 */
function TopicCard({
  topicId,
  label,
  examId,
  active,
  onClick,
}: {
  topicId: string;
  label: string;
  examId?: string;
  active: boolean;
  onClick: () => void;
}) {
  const count = useAsync(
    () => countQuestions({ pyqOnly: true, topicId, examId }),
    [topicId, examId],
  );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`card flex items-center justify-between gap-3 p-3 text-left transition-colors ${
        active ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]' : 'hover:border-[var(--color-brand)]'
      }`}
    >
      <span className="text-[14px] font-bold">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-[var(--color-muted)]">
        {count.data === undefined ? '—' : count.data}
      </span>
    </button>
  );
}


function Picker({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-bold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[13px] disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
