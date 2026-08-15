'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  countQuestions,
  isBackendConfigured,
  listQuestions,
  pyqEmptyReason,
  pyqFilterModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  pyqTruncation,
  PYQ_SCREEN_LIMIT,
  resolvePyqSelection,
  t,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeRunner } from '@/components/PracticeRunner';
import { AsyncSection, Skeleton } from '@/components/ui';

/**
 * A previous-year set, being sat.
 *
 * The filters live on /practice/pyq and this page only runs what they chose,
 * read back out of the URL — so the set cannot change under a learner
 * mid-paper, and a link to a specific paper is a link to that paper rather than
 * to a screen they must re-filter.
 */

export default function PyqRunPage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender in a static export.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <PyqRun />
    </Suspense>
  );
}

function PyqRun() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const params = useSearchParams();

  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );
  const model = useMemo(() => pyqFilterModel(selection), [selection]);
  const filterKey = JSON.stringify(model.filter);

  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: PYQ_SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, PYQ_SCREEN_LIMIT);
  const reason = pyqEmptyReason(selection, model);
  const byPaper = isBackendConfigured();

  // Back to the chooser with the same selection still in force, so "change the
  // year" is one click rather than starting the funnel again.
  const backQuery = new URLSearchParams(pyqSelectionToParams(selection)).toString();
  const backHref = backQuery ? `/practice/pyq?${backQuery}` : '/practice/pyq';

  const subtitle =
    byPaper && model.paper
      ? `${t(model.paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
      : hi
        ? 'वास्तविक पेपरों से'
        : 'Straight from real papers';

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href={backHref} className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {hi ? 'चयन बदलें' : 'Change selection'}
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold">
          {hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">{subtitle}</p>
      </div>

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
        empty={{
          icon: '📜',
          title: hi ? 'कोई प्रश्न नहीं' : 'No questions',
          body: hi ? reason.hi : reason.en,
        }}
      >
        {(list) => (
          <PracticeRunner
            embedded
            questions={list}
            backHref={backHref}
            title={hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
            subtitle={subtitle}
          />
        )}
      </AsyncSection>
    </div>
  );
}
