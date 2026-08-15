'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  countQuestions,
  isBackendConfigured,
  listPyqYears,
  listQuestions,
  pyqEmptyReason,
  pyqFilterModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  pyqTruncation,
  resolvePyqSelection,
  t,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeRunner } from '@/components/PracticeRunner';
import { AsyncSection, Skeleton } from '@/components/ui';

/**
 * Previous-year practice.
 *
 * The funnel the product needs: exam → post → subject → year. The repository
 * always translated every one of those into a real query; this screen used to
 * send only the year, so a learner could not reach the CDP half of the 2023 PRT
 * paper at all.
 *
 * Every choice lives in the URL, so a filtered view can be shared and survives
 * a refresh. The post picker reads PRT / TGT / PGT, the way the bank is
 * categorised, and the subject picker lists every subject that paper can test —
 * all twenty-one PGT electives included — because this is a menu to choose
 * from, not a syllabus being asserted about the learner.
 */

/**
 * How many questions one screen will hold.
 *
 * The whole HTET bank is ~861 previous-year questions, and the repository's
 * default page is 200 — so the runner used to say "1 / 200" of 861 with nothing
 * admitting the other 661 existed. Rather than page a practice runner, which
 * would mean a learner losing their place, this asks for a paper's worth and
 * says plainly when the filter is wider than that. A fully funnelled selection
 * is 30 questions; this ceiling only bites on "all subjects, all years", where
 * narrowing is the right advice anyway.
 */
const SCREEN_LIMIT = 300;

export default function PyqPracticePage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender in a static export.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <PyqBrowser />
    </Suspense>
  );
}

function PyqBrowser() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();
  const params = useSearchParams();

  // The URL is the source of truth; the profile fills whatever it leaves blank.
  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );

  const model = useMemo(() => pyqFilterModel(selection), [selection]);

  const setSelection = useCallback(
    (next: PyqSelection) => {
      const query = new URLSearchParams(pyqSelectionToParams(next)).toString();
      router.replace(query ? `/practice/pyq?${query}` : '/practice/pyq', { scroll: false });
    },
    [router],
  );

  const filterKey = JSON.stringify(model.filter);

  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  // The real size of this filter, which is also how truncation is detected.
  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, SCREEN_LIMIT);
  const reason = pyqEmptyReason(selection, model);

  // Offline, the bundled sample has no teaching level on it, so the paper filter
  // is dropped rather than applied. Naming the paper next to a count that was
  // not filtered by it would be a claim the bundle cannot support, so the label
  // goes and the reason is stated instead.
  const byPaper = isBackendConfigured();

  const update = (patch: Partial<PyqSelection>) => setSelection({ ...selection, ...patch });

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <header>
        <h1 className="text-2xl font-extrabold">
          {hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'असली पेपरों से — पद, विषय और वर्ष के अनुसार छाँटें।'
            : 'Straight from the real papers — filter by post, subject and year.'}
        </p>
      </header>

      <section className="card grid gap-3 p-4 sm:grid-cols-3">
        <Picker
          id="paper"
          label={hi ? 'पद' : 'Post'}
          value={selection.paperId ?? ''}
          onChange={(v) => update({ paperId: v || undefined, subjectId: undefined })}
          options={model.paperOptions.map((o) => ({
            value: o.value,
            label: hi ? o.labelHi : o.labelEn,
          }))}
          placeholder={hi ? 'सभी पद' : 'All posts'}
        />

        <Picker
          id="subject"
          label={hi ? 'विषय' : 'Subject'}
          value={model.filter.subjectId ?? ''}
          onChange={(v) => update({ subjectId: v || undefined })}
          options={model.subjectOptions.map((o) => ({
            value: o.value,
            label: hi ? o.labelHi : o.labelEn,
          }))}
          placeholder={hi ? 'सभी विषय' : 'All subjects'}
          disabled={model.subjectOptions.length === 0}
        />

        <Picker
          id="year"
          label={hi ? 'वर्ष' : 'Year'}
          value={selection.year ? String(selection.year) : ''}
          onChange={(v) => update({ year: v ? Number(v) : undefined })}
          options={(years.data ?? []).map((y) => ({ value: String(y), label: String(y) }))}
          placeholder={hi ? 'सभी वर्ष' : 'All years'}
        />

      </section>

      {/* The count is the filter's real size, from the database, not the length
          of whatever this screen managed to fetch. */}
      <p className="text-[13px] font-semibold" aria-live="polite">
        {total.loading ? (
          <span className="text-[var(--color-muted)]">{hi ? 'गिन रहे हैं…' : 'Counting…'}</span>
        ) : total.data === undefined ? null : (
          <>
            {total.data} {hi ? 'प्रश्न' : total.data === 1 ? 'question' : 'questions'}
            {byPaper && model.paper ? ` · ${t(model.paper.name, lang)}` : ''}
            {selection.year ? ` · ${selection.year}` : ''}
          </>
        )}
      </p>

      {!byPaper ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          {hi
            ? 'ऑफ़लाइन — बंडल किए गए नमूने में पेपर की जानकारी नहीं है, इसलिए पद के अनुसार छँटाई नहीं हो सकती।'
            : 'Offline — the bundled sample carries no paper information, so it cannot be filtered by post.'}
        </p>
      ) : null}

      {truncated ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? `${truncated.total} में से पहले ${truncated.shown} प्रश्न दिखाए जा रहे हैं। पूरा सेट देखने हेतु विषय या वर्ष चुनें।`
            : `Showing the first ${truncated.shown} of ${truncated.total}. Choose a subject or a year to see a complete set.`}
        </p>
      ) : null}

      <AsyncSection
        state={questions}
        lang={lang}
        empty={{ icon: '📜', title: hi ? 'कोई प्रश्न नहीं' : 'No questions', body: hi ? reason.hi : reason.en }}
      >
        {(list) => (
          <PracticeRunner
            embedded
            questions={list}
            title={hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
            subtitle={
              byPaper && model.paper
                ? `${t(model.paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
                : hi
                  ? 'वास्तविक पेपरों से'
                  : 'Straight from real papers'
            }
          />
        )}
      </AsyncSection>
    </div>
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
