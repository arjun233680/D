'use client';

import { useState } from 'react';
import { getExam, listTests, t, UI, type Test } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { TestCard } from '@/components/cards';
import { AsyncSection } from '@/components/ui';

const TYPES: { id: Test['type'] | 'all'; label: { en: string; hi: string } }[] = [
  { id: 'all', label: { en: 'All', hi: 'सभी' } },
  { id: 'mock', label: { en: 'Full Mock', hi: 'पूर्ण मॉक' } },
  { id: 'pyq', label: { en: 'Previous Year', hi: 'विगत वर्ष' } },
  { id: 'sectional', label: { en: 'Sectional', hi: 'सेक्शनल' } },
  { id: 'daily-quiz', label: { en: 'Daily Quiz', hi: 'दैनिक क्विज़' } },
];

export default function TestsPage() {
  const { lang, user, results } = useStore();
  const [type, setType] = useState<Test['type'] | 'all'>('all');
  const exam = getExam(user.goalExamId);

  // Always the learner's own exam. There used to be a row of exam chips here,
  // which meant a Haryana candidate was offered CTET and REET mocks on the page
  // they came to for their own. Changing exam is the goal switcher's job, and
  // it is one control in the corner rather than a row on every screen.
  const state = useAsync(() => listTests(user.goalExamId), [user.goalExamId]);
  const filtered = (state.data ?? []).filter((x) => type === 'all' || x.type === type);
  const attemptedCount = Object.keys(results).length;

  return (
    <div className="space-y-6 px-4 pt-4 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t(UI.tests, lang)}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? `${exam ? t(exam.name, lang) + ' · ' : ''}अब तक ${attemptedCount} टेस्ट दिए`
            : `${exam ? `${t(exam.name, lang)} · ` : ''}${attemptedCount} attempted so far`}
        </p>
      </div>

      <div className="rail flex gap-2">
        {TYPES.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setType(x.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              type === x.id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {t(x.label, lang)}
          </button>
        ))}
      </div>

      <AsyncSection
        state={{ ...state, data: filtered }}
        lang={lang}
        empty={{
          icon: '🎯',
          title: lang === 'hi' ? 'इस फ़िल्टर में कोई टेस्ट नहीं' : 'No tests in this filter',
          body:
            lang === 'hi'
              ? 'दूसरा टेस्ट प्रकार चुनें, या ऊपर दाईं ओर से परीक्षा बदलें।'
              : 'Pick another test type, or change exam from the top right.',
        }}
      >
        {(list) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((x) => (
              <TestCard key={x.id} test={x} width="w-full" />
            ))}
          </div>
        )}
      </AsyncSection>
    </div>
  );
}
