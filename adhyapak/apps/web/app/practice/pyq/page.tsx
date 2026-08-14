'use client';

import { useState } from 'react';
import { listPyqYears, listQuestions } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeRunner } from '@/components/PracticeRunner';
import { AsyncSection } from '@/components/ui';

/**
 * Previous-year practice.
 *
 * The year picker is built from `pyq_year` in the database, not from parsing the
 * legacy prose column — which is why it is empty until real papers are imported.
 * An empty year list is the honest answer: showing invented years would promise
 * papers the platform does not have.
 */
export default function PyqPracticePage() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const [year, setYear] = useState<number | null>(null);

  const years = useAsync(() => listPyqYears(user.goalExamId), [user.goalExamId]);

  const questions = useAsync(
    () => listQuestions({ pyqOnly: true, examId: user.goalExamId, year: year ?? undefined }),
    [user.goalExamId, year],
  );

  return (
    <div className="space-y-4">
      {years.data && years.data.length > 0 ? (
        <div className="rail flex gap-2 px-4 pt-4 sm:px-0">
          <YearChip label={hi ? 'सभी वर्ष' : 'All years'} active={year === null} onClick={() => setYear(null)} />
          {years.data.map((y) => (
            <YearChip key={y} label={String(y)} active={year === y} onClick={() => setYear(y)} />
          ))}
        </div>
      ) : null}

      <AsyncSection
        state={questions}
        lang={lang}
        empty={{
          icon: '📜',
          title: hi ? 'विगत वर्ष प्रश्न नहीं' : 'No previous-year questions',
          body: year
            ? hi
              ? `${year} के पेपर से कोई प्रश्न अभी उपलब्ध नहीं है।`
              : `No questions from the ${year} paper are available yet.`
            : hi
              ? 'इस परीक्षा के लिए विगत वर्ष प्रश्न अभी जोड़े नहीं गए हैं।'
              : 'Previous-year questions for this exam have not been added yet.',
        }}
      >
        {(list) => (
          <PracticeRunner
            questions={list}
            title={hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
            subtitle={
              year
                ? hi
                  ? `${year} का पेपर · ${list.length} प्रश्न`
                  : `${year} paper · ${list.length} questions`
                : hi
                  ? 'वास्तविक पेपरों से, वर्ष एवं पेपर के टैग सहित'
                  : 'Straight from real papers, tagged by year and paper'
            }
          />
        )}
      </AsyncSection>
    </div>
  );
}

function YearChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
        active
          ? 'border-transparent bg-[var(--color-ink)] text-white'
          : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
      }`}
    >
      {label}
    </button>
  );
}
