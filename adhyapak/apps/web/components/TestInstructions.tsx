'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  t,
  testBriefing,
  type Lang,
  type SolutionMode,
  type Test,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * What a candidate reads before the clock starts.
 *
 * Every real exam engine opens on this page, and it is not ceremony: it is
 * where somebody decides whether they have two and a half hours right now, and
 * where they find out that a wrong answer costs nothing on this paper. The
 * figures come from `testBriefing`, which reads the test — a duration typed
 * into a screen is the one number nobody would think to check.
 *
 * It also carries the choice this whole screen exists for. A paper can be sat
 * two ways and they are not the same act:
 *
 *   exam    — nothing is revealed until submission. The answer, the
 *             explanation, even whether the choice was right. A mock is a
 *             measurement, and a measurement the subject can see through is
 *             not one.
 *   guided  — each answer is marked as it is chosen, with the explanation
 *             there and then. That is how a topic is learned, not tested.
 *
 * The default is `exam`, because a mock is what this screen is attached to and
 * because it is the reversible choice: somebody who wanted guidance can sit it
 * again, while somebody shown the key cannot un-see it.
 */
export function TestInstructions({
  test,
  onStart,
}: {
  test: Test;
  onStart: (mode: SolutionMode) => void;
}) {
  const { lang, setLang } = useStore();
  const hi = lang === 'hi';
  const brief = testBriefing(test);
  const [mode, setMode] = useState<SolutionMode>('exam');
  const [agreed, setAgreed] = useState(false);

  const rules: string[] = [
    hi
      ? `इस पेपर में ${brief.sections.length} खंड और कुल ${brief.questionCount} प्रश्न हैं।`
      : `This paper has ${brief.sections.length} sections and ${brief.questionCount} questions in all.`,
    hi
      ? 'हर प्रश्न के चार विकल्प हैं, जिनमें से केवल एक सही है।'
      : 'Every question has four options, of which only one is correct.',
    hi
      ? `पेपर ${brief.durationMinutes} मिनट में पूरा करना है। समय समाप्त होते ही यह स्वयं जमा हो जाएगा।`
      : `You have ${brief.durationMinutes} minutes. The paper submits itself when the time runs out.`,
    brief.negativeMarking > 0
      ? hi
        ? `हर सही उत्तर पर ${brief.marksPerQuestion} अंक, हर ग़लत उत्तर पर ${brief.negativeMarking} अंक की कटौती।`
        : `${brief.marksPerQuestion} mark for a correct answer, ${brief.negativeMarking} deducted for a wrong one.`
      : hi
        ? `हर सही उत्तर पर ${brief.marksPerQuestion} अंक। कोई ऋणात्मक अंकन नहीं।`
        : `${brief.marksPerQuestion} mark for a correct answer. There is no negative marking.`,
    hi
      ? 'न किए गए प्रश्नों पर कोई दंड नहीं।'
      : 'There is no penalty for a question you leave unattempted.',
    hi
      ? 'बीच में छोड़ने पर पेपर वहीं सहेजा जाता है और आप उसी जगह से लौट सकते हैं।'
      : 'Leaving mid-paper saves it where you left off, and you can return to the same place.',
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-10 sm:px-0 sm:pt-6">
      <Link href={`/tests/${test.id}`} className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {hi ? 'टेस्ट विवरण' : 'Test details'}
      </Link>

      <header className="mt-3 text-center">
        <h1 className="text-xl leading-snug font-extrabold sm:text-2xl">{t(test.title, lang)}</h1>
        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[13px] text-[var(--color-muted)]">
          <span>
            {hi ? 'अवधि' : 'Duration'}: <b className="text-[var(--color-body)]">{brief.durationMinutes} {hi ? 'मिनट' : 'min'}</b>
          </span>
          <span>
            {hi ? 'पूर्णांक' : 'Maximum marks'}: <b className="text-[var(--color-body)]">{brief.maxMarks}</b>
          </span>
        </div>
      </header>

      <ul className="card mt-5 space-y-2.5 p-5 text-[13px] leading-relaxed">
        {rules.map((r) => (
          <li key={r} className="flex gap-2.5">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-line-strong)]" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {brief.sections.length > 1 ? (
        <section className="card mt-4 p-5">
          <h2 className="text-[12px] font-bold tracking-[0.12em] text-[var(--color-faint)] uppercase">
            {hi ? 'खंड' : 'Sections'}
          </h2>
          <ul className="mt-3 space-y-2">
            {brief.sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-[13px]">
                <span className="font-semibold">{t(s.name, lang)}</span>
                <span className="text-[var(--color-muted)]">
                  {s.questionCount} {hi ? 'प्रश्न' : 'questions'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The choice this screen exists for. */}
      <section className="card mt-4 p-5">
        <h2 className="text-[12px] font-bold tracking-[0.12em] text-[var(--color-faint)] uppercase">
          {hi ? 'पेपर कैसे देना है' : 'How to sit this paper'}
        </h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {(
            [
              {
                id: 'exam' as const,
                icon: '🎯',
                title: hi ? 'असली परीक्षा जैसा' : 'Like the real exam',
                body: hi
                  ? 'जमा करने तक न उत्तर दिखेगा, न व्याख्या। पूरा हल परिणाम के साथ मिलेगा।'
                  : 'No answer and no explanation until you submit. The full solution comes with your result.',
              },
              {
                id: 'guided' as const,
                icon: '💡',
                title: hi ? 'समाधान के साथ' : 'With solutions',
                body: hi
                  ? 'हर उत्तर चुनते ही सही/ग़लत और व्याख्या दिखेगी। अभ्यास के लिए — स्कोर मापने के लिए नहीं।'
                  : 'Each answer is marked as you choose it, with the explanation. For practice — not for measuring a score.',
              },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              aria-pressed={mode === o.id}
              className={`rounded-xl border p-4 text-left transition-colors ${
                mode === o.id
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
              }`}
            >
              <span className="text-[18px]">{o.icon}</span>
              <span className="mt-1 block text-[14px] font-bold">{o.title}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-[var(--color-muted)]">
                {o.body}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-5">
        <label htmlFor="paper-lang" className="text-[12px] font-bold tracking-[0.12em] text-[var(--color-faint)] uppercase">
          {hi ? 'पेपर की भाषा' : 'Paper language'}
        </label>
        <select
          id="paper-lang"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[14px]"
        >
          <option value="hi">हिंदी</option>
          <option value="en">English</option>
        </select>
        <p className="mt-1.5 text-[11px] text-[var(--color-faint)]">
          {hi
            ? 'पेपर के अंदर भी कभी भी बदली जा सकती है।'
            : 'Can be switched at any point inside the paper too.'}
        </p>
      </section>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          {hi
            ? 'मैंने सभी निर्देश ध्यान से पढ़ लिए हैं और समझ लिए हैं।'
            : 'I have read all the instructions carefully and understood them.'}
        </span>
      </label>

      <button
        type="button"
        disabled={!agreed}
        onClick={() => onStart(mode)}
        className="mt-4 w-full rounded-full bg-[var(--color-brand)] px-6 py-3.5 text-[14px] font-bold text-white disabled:opacity-40"
      >
        {hi ? 'सहमत हूँ, पेपर शुरू करें' : 'Agree and start the paper'}
      </button>
    </div>
  );
}
