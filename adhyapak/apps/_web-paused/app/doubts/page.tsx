'use client';

import { useState } from 'react';
import { DOUBTS, SUBJECTS, formatDate, getSubject, t, timeAgo } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useMounted } from '@/lib/useMounted';
import { Badge, EmptyState } from '@/components/ui';

export default function DoubtsPage() {
  const { lang, user } = useStore();
  // "3 दिन पहले" is computed from the clock, and this page is a static export
  // served long after it was built. Rendered on both sides it is a hydration
  // mismatch; rendered after mount it is an update. Until then the exact date
  // stands in, which is a true statement rather than a placeholder.
  const mounted = useMounted();
  const [subjectId, setSubjectId] = useState('all');
  const [draft, setDraft] = useState('');
  const [asked, setAsked] = useState<string[]>([]);

  const filtered = subjectId === 'all' ? DOUBTS : DOUBTS.filter((d) => d.subjectId === subjectId);

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          {lang === 'hi' ? 'शंका समाधान' : 'Doubts'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'शिक्षकों से पूछें — उत्तर 24 घंटे के भीतर।'
            : 'Ask an educator — answered within 24 hours.'}
        </p>
      </div>

      <div className="card p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            lang === 'hi'
              ? 'अपना प्रश्न लिखें… जैसे: संरक्षण और केंद्रीकरण में क्या अंतर है?'
              : 'Type your question… e.g. what is the difference between conservation and centration?'
          }
          className="min-h-[90px] w-full rounded-xl border border-[var(--color-line)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-brand)]"
        />
        <button
          type="button"
          disabled={draft.trim().length < 8}
          onClick={() => {
            setAsked((prev) => [draft.trim(), ...prev]);
            setDraft('');
          }}
          className="mt-2 w-full rounded-xl bg-[var(--color-brand)] py-3 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {lang === 'hi' ? 'प्रश्न पूछें' : 'Post question'}
        </button>
      </div>

      {asked.length ? (
        <div className="space-y-2">
          {asked.map((q, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{user.avatar}</span>
                <span className="text-[13px] font-bold">{user.name}</span>
                <Badge tone="warning">
                  {lang === 'hi' ? 'उत्तर प्रतीक्षित' : 'Awaiting answer'}
                </Badge>
              </div>
              <p className="mt-2 text-[14px]">{q}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rail flex gap-2">
        <button
          type="button"
          onClick={() => setSubjectId('all')}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            subjectId === 'all'
              ? 'border-transparent bg-[var(--color-ink)] text-white'
              : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
          }`}
        >
          {lang === 'hi' ? 'सभी' : 'All'}
        </button>
        {SUBJECTS.filter((s) => DOUBTS.some((d) => d.subjectId === s.id)).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubjectId(s.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
              subjectId === s.id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {s.icon} {t(s.name, lang)}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="space-y-3">
          {filtered.map((d) => {
            const subject = getSubject(d.subjectId);
            return (
              <article key={d.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.avatar}</span>
                  <span className="text-[13px] font-bold">{d.askedBy}</span>
                  <span className="text-[11px] text-[var(--color-faint)]">
                    {mounted ? timeAgo(d.askedAt, lang) : formatDate(d.askedAt, lang)}
                  </span>
                  <div className="flex-1" />
                  {subject ? (
                    <Badge tone="neutral">
                      {subject.icon} {t(subject.name, lang)}
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-2 text-[14px] leading-relaxed font-semibold">
                  {t(d.question, lang)}
                </p>

                <div className="mt-3 space-y-2">
                  {d.answers.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border-l-4 border-[var(--color-brand)] bg-[var(--color-surface-alt)] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold">{a.by}</span>
                        {a.isEducator ? (
                          <Badge tone="brand">{lang === 'hi' ? 'शिक्षक' : 'Educator'}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed">{t(a.body, lang)}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="💬"
          title={lang === 'hi' ? 'इस विषय में शंकाएँ नहीं' : 'No doubts in this subject'}
          body={lang === 'hi' ? 'पहला प्रश्न आप पूछिए।' : 'Be the first to ask one.'}
        />
      )}
    </div>
  );
}
