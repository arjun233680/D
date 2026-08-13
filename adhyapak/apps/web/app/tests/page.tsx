'use client';

import { useState } from 'react';
import { EXAMS, TESTS, t, UI, type Test } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestCard } from '@/components/cards';
import { EmptyState } from '@/components/ui';

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
  const [examId, setExamId] = useState<string>(user.goalExamId);

  const filtered = TESTS.filter(
    (x) => (type === 'all' || x.type === type) && (examId === 'all' || x.examId === examId),
  );
  const attemptedCount = Object.keys(results).length;

  return (
    <div className="space-y-6 px-4 pt-4 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t(UI.tests, lang)}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? `वास्तविक परीक्षा जैसा इंटरफ़ेस · अब तक ${attemptedCount} टेस्ट दिए`
            : `Real exam interface · ${attemptedCount} attempted so far`}
        </p>
      </div>

      <div className="space-y-2">
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
        <div className="rail flex gap-2">
          <button
            type="button"
            onClick={() => setExamId('all')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
              examId === 'all'
                ? 'border-transparent bg-[var(--color-brand)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {lang === 'hi' ? 'सभी परीक्षाएँ' : 'All exams'}
          </button>
          {EXAMS.filter((e) => TESTS.some((x) => x.examId === e.id)).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setExamId(e.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                examId === e.id
                  ? 'border-transparent bg-[var(--color-brand)] text-white'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
              }`}
            >
              {e.emoji} {e.shortName}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((x) => (
            <TestCard key={x.id} test={x} width="w-full" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎯"
          title={lang === 'hi' ? 'इस फ़िल्टर में कोई टेस्ट नहीं' : 'No tests in this filter'}
          body={
            lang === 'hi'
              ? 'दूसरी परीक्षा या दूसरा टेस्ट प्रकार चुनें।'
              : 'Pick another exam or another test type.'
          }
        />
      )}
    </div>
  );
}
