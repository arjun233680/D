'use client';

import { listBatches, t, UI } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { BatchCard } from '@/components/cards';
import { EmptyState } from '@/components/ui';

export default function BatchesPage() {
  const { lang, user } = useStore();
  // Fetched unscoped and split here, because the two lists answer different
  // questions. Browsing is the learner's own exam only — a row of exam chips
  // used to sit below, offering the batches of exams they are not sitting, and
  // changing exam is the goal switcher's job in the corner. Enrolments are not
  // scoped: a batch you already joined is yours, and it should not disappear
  // because you switched goal.
  const batches = useAsync(() => listBatches(), []);
  const all = batches.data ?? [];

  const filtered = all.filter((b) => b.examId === user.goalExamId);
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


      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </div>
      ) : (
        /* This used to say "pick another exam — new batches are added
           continuously". No exam has one, and none are being added, so it said
           two false things to somebody who had just found an empty page. */
        <EmptyState
          icon="🎓"
          title={lang === 'hi' ? 'अभी कोई बैच नहीं' : 'No batches yet'}
          body={
            lang === 'hi'
              ? 'लाइव कक्षाएँ अभी शुरू नहीं हुई हैं। तब तक प्रश्न बैंक, नोट्स और मॉक टेस्ट पूरी तरह खुले हैं।'
              : 'Live classes have not started yet. The question bank, notes and mock tests are fully open in the meantime.'
          }
        />
      )}
    </div>
  );
}
