'use client';

import { useState } from 'react';
import { EXAMS, listBatches, t, UI } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { BatchCard } from '@/components/cards';
import { EmptyState } from '@/components/ui';

export default function BatchesPage() {
  const batches = useAsync(() => listBatches(), []);
  const { lang, user } = useStore();
  const [examId, setExamId] = useState<string>('all');

  const all = batches.data ?? [];
  const filtered = examId === 'all' ? all : all.filter((b) => b.examId === examId);
  const enrolled = all.filter((b) => user.enrolledBatchIds.includes(b.id));

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t(UI.batches, lang)}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'लाइव कक्षाएँ, नोट्स, टेस्ट एवं डाउट सत्र — एक ही जगह'
            : 'Live classes, notes, tests and doubt sessions in one place'}
        </p>
      </div>

      {enrolled.length ? (
        <section>
          <h2 className="mb-2 text-[15px] font-bold">
            {lang === 'hi' ? 'आपके बैच' : 'Your batches'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolled.map((b) => (
              <BatchCard key={b.id} batch={b} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="rail flex gap-2">
        <button
          type="button"
          onClick={() => setExamId('all')}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            examId === 'all'
              ? 'border-transparent bg-[var(--color-ink)] text-white'
              : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
          }`}
        >
          {lang === 'hi' ? 'सभी' : 'All'}
        </button>
        {EXAMS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setExamId(e.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
              examId === e.id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {e.emoji} {e.shortName}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎥"
          title={lang === 'hi' ? 'इस परीक्षा हेतु बैच नहीं' : 'No batches for this exam yet'}
          body={
            lang === 'hi'
              ? 'दूसरी परीक्षा चुनें — नए बैच लगातार जुड़ रहे हैं।'
              : 'Pick another exam — new batches are added continuously.'
          }
        />
      )}
    </div>
  );
}
