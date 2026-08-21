'use client';

import { formatDate, listCurrentAffairs, t } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui';

export default function CurrentAffairsPage() {
  const affairs = useAsync(() => listCurrentAffairs(), []);
  const { lang, user } = useStore();

  // Only what is tagged for the learner's own exam. The per-item exam badges
  // that used to sit under each story are gone with it: once the whole list is
  // one exam, naming it on every card is noise, and naming the others was the
  // thing to remove.
  const relevant = (affairs.data ?? []).filter((ca) => ca.examIds.includes(user.goalExamId));

  return (
    <div className="space-y-5 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          {lang === 'hi' ? 'शिक्षा समसामयिकी' : 'Education current affairs'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'केवल वही खबरें जो शिक्षक भर्ती परीक्षाओं में पूछी जाती हैं।'
            : 'Only the news that actually gets asked in teaching exams.'}
        </p>
      </div>

      <div className="space-y-3">
        {relevant.map((ca) => (
          <article key={ca.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {ca.tags.map((tag) => (
                <Badge key={tag.en} tone="info">
                  {t(tag, lang)}
                </Badge>
              ))}
              <span className="text-[11px] text-[var(--color-faint)]">
                {formatDate(ca.date, lang)}
              </span>
            </div>
            <h2 className="mt-2 text-[15px] leading-snug font-bold">{t(ca.title, lang)}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
              {t(ca.summary, lang)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
