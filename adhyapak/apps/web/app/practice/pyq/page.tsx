'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  countQuestions,
  isBackendConfigured,
  listPyqYears,
  pyqEmptyReason,
  pyqFilterModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  resolvePyqSelection,
  t,
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

  // The URL is the source of truth; the profile fills whatever it leaves blank.
  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );

  const model = useMemo(() => pyqFilterModel(selection), [selection]);
  const query = new URLSearchParams(pyqSelectionToParams(selection)).toString();

  const setSelection = useCallback(
    (next: PyqSelection) => {
      const q = new URLSearchParams(pyqSelectionToParams(next)).toString();
      router.replace(q ? `/practice/pyq?${q}` : '/practice/pyq', { scroll: false });
    },
    [router],
  );

  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  const total = useAsync(
    () => countQuestions(model.filter),
    [JSON.stringify(model.filter)],
  );

  const reason = pyqEmptyReason(selection, model);

  // Offline, the bundled sample has no teaching level on it, so the paper filter
  // is dropped rather than applied. Naming the paper next to a count that was
  // not filtered by it would be a claim the bundle cannot support, so the label
  // goes and the reason is stated instead.
  const byPaper = isBackendConfigured();

  const update = (patch: Partial<PyqSelection>) => setSelection({ ...selection, ...patch });

  const ready = total.data !== undefined && total.data > 0;

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <header>
        <h1 className="text-2xl font-extrabold">
          {hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'असली पेपरों से — पद, विषय और वर्ष चुनिए, फिर टेस्ट शुरू कीजिए।'
            : 'Straight from the real papers — choose a post, subject and year, then start.'}
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

      {/* What is about to start: the filter's real size, from the database. */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div aria-live="polite">
          {total.loading ? (
            <p className="text-[15px] font-bold text-[var(--color-muted)]">
              {hi ? 'गिन रहे हैं…' : 'Counting…'}
            </p>
          ) : (
            <>
              <p className="text-[22px] leading-none font-extrabold tabular-nums">
                {total.data ?? 0}{' '}
                <span className="text-[14px] font-bold text-[var(--color-muted)]">
                  {hi ? 'प्रश्न' : total.data === 1 ? 'question' : 'questions'}
                </span>
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
                {ready
                  ? [
                      byPaper && model.paper ? t(model.paper.name, lang) : null,
                      model.filter.subjectId
                        ? model.subjectOptions.find((o) => o.value === model.filter.subjectId)?.[
                            hi ? 'labelHi' : 'labelEn'
                          ]
                        : hi
                          ? 'सभी विषय'
                          : 'All subjects',
                      selection.year ?? (hi ? 'सभी वर्ष' : 'All years'),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : hi
                    ? reason.hi
                    : reason.en}
              </p>
            </>
          )}
        </div>

        {/* Deliberately a link, not a button: the run page is reachable by URL
            like every other page, so a chosen set can be shared or bookmarked. */}
        {ready ? (
          <Link
            href={query ? `/practice/pyq/attempt?${query}` : '/practice/pyq/attempt'}
            className="rounded-xl bg-[var(--color-brand)] px-8 py-3.5 text-[14px] font-bold text-white transition-shadow hover:shadow-md"
          >
            {hi ? 'टेस्ट शुरू करें' : 'Start test'} →
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl bg-[var(--color-line)] px-8 py-3.5 text-[14px] font-bold text-[var(--color-muted)]">
            {hi ? 'टेस्ट शुरू करें' : 'Start test'} →
          </span>
        )}
      </section>

      {!byPaper ? (
        <p className="text-[12px] text-[var(--color-muted)]">
          {hi
            ? 'ऑफ़लाइन — बंडल किए गए नमूने में पेपर की जानकारी नहीं है, इसलिए पद के अनुसार छँटाई नहीं हो सकती।'
            : 'Offline — the bundled sample carries no paper information, so it cannot be filtered by post.'}
        </p>
      ) : null}
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
