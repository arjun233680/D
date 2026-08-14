'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  isBackendConfigured,
  isStaff,
  listDraftQuestions,
  setQuestionStatusBulk,
  type ContentStatus,
  type DraftQuestion,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { AsyncSection, Badge, ErrorState } from '@/components/ui';

/**
 * Draft review.
 *
 * The step between an import and a learner: imported questions land here, get
 * looked at, and are published or archived in bulk.
 *
 * Publishing goes through `setQuestionStatusBulk`, which calls the database's
 * `set_question_status` once per question — so the publish-time checks (English
 * text, Hindi text, at least two options, an answer inside them) apply to every
 * row and the audit trigger fires for each. Rows the database refuses come back
 * with the reason and are shown, never silently dropped.
 */
export default function DraftsPage() {
  const { lang } = useStore();
  const hi = lang === 'hi';

  // Drafts live in the database, so without one there is nothing to review —
  // and that is a different message from "you lack permission".
  const hasBackend = isBackendConfigured();
  const staff = useAsync(async () => (hasBackend ? await isStaff() : false), [hasBackend]);
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; failures: string[] } | null>(
    null,
  );
  const [round, setRound] = useState(0);

  const drafts = useAsync(() => listDraftQuestions({ status, limit: 200 }), [status, round]);

  const rows = useMemo(() => drafts.data ?? [], [drafts.data]);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const apply = async (to: ContentStatus) => {
    if (selected.size === 0) return;
    setBusy(true);
    setResult(null);
    const outcome = await setQuestionStatusBulk([...selected], to);
    setBusy(false);

    if (!outcome.ok) {
      setResult({ ok: false, text: outcome.error, failures: [] });
      return;
    }
    const failed = outcome.value.filter((o) => !o.ok);
    const done = outcome.value.length - failed.length;
    setResult({
      ok: failed.length === 0,
      text: hi
        ? `${done} प्रश्न ${to === 'published' ? 'प्रकाशित' : 'संग्रहीत'} हुए।`
        : `${done} questions ${to === 'published' ? 'published' : 'archived'}.`,
      failures: failed.map((f) => `${f.id}: ${f.message ?? 'refused'}`),
    });
    setSelected(new Set());
    setRound((n) => n + 1);
  };

  if (!hasBackend || staff.data === false) {
    return (
      <div className="px-4 pt-6 sm:px-0">
        <ErrorState
          title={
            hasBackend
              ? hi
                ? 'केवल शिक्षकों के लिए'
                : 'Educators only'
              : hi
                ? 'कोई डेटाबेस नहीं'
                : 'No database configured'
          }
          body={
            hasBackend
              ? hi
                ? 'ड्राफ़्ट देखने के लिए शिक्षक खाते से साइन इन करें।'
                : 'Sign in with an educator account to review drafts.'
              : hi
                ? 'ड्राफ़्ट डेटाबेस में रहते हैं। ऑफ़लाइन मोड में समीक्षा के लिए कुछ नहीं है।'
                : 'Drafts live in the database. In offline mode there is nothing to review.'
          }
          retryLabel={hi ? 'दोबारा जाँचें' : 'Check again'}
          onRetry={staff.retry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-4 pb-10 sm:px-0 sm:pt-6">
      <header>
        <Link href="/studio" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← Studio
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">
          {hi ? 'समीक्षा एवं प्रकाशन' : 'Review and publish'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'प्रकाशित करने से पहले डेटाबेस हर प्रश्न की दोबारा जाँच करता है।'
            : 'The database re-checks every question at the moment you publish it.'}
        </p>
      </header>

      <div className="rail flex gap-2">
        {(['draft', 'review', 'published', 'archived'] as ContentStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setSelected(new Set());
            }}
            aria-pressed={status === s}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
              status === s
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {result ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-[13px] ${
            result.ok
              ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
              : 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
          }`}
        >
          <p className="font-bold">
            {result.ok ? '✅ ' : '⚠️ '}
            {result.text}
          </p>
          {result.failures.length ? (
            <ul className="mt-2 space-y-1">
              {result.failures.map((f) => (
                <li key={f}>✕ {f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <AsyncSection
        state={drafts}
        lang={lang}
        empty={{
          icon: '📝',
          title: hi ? `कोई ${status} प्रश्न नहीं` : `No ${status} questions`,
          body: hi
            ? 'CSV आयात करने पर प्रश्न यहाँ ड्राफ़्ट के रूप में दिखेंगे।'
            : 'Import a CSV and the questions will appear here as drafts.',
        }}
      >
        {(list) => (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(list.map((r: DraftQuestion) => r.id)))
                }
                className="rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-[12px] font-semibold"
              >
                {allSelected ? (hi ? 'चयन हटाएँ' : 'Clear selection') : hi ? 'सभी चुनें' : 'Select all'}
              </button>
              <span className="text-[12px] text-[var(--color-muted)]">
                {selected.size} {hi ? 'चयनित' : 'selected'}
              </span>
              <div className="flex-1" />
              {status !== 'published' ? (
                <button
                  type="button"
                  disabled={busy || selected.size === 0}
                  onClick={() => apply('published')}
                  className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {hi ? 'चयनित प्रकाशित करें' : 'Publish selected'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => apply('archived')}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[12px] font-bold disabled:opacity-50"
              >
                {hi ? 'संग्रहित करें' : 'Archive selected'}
              </button>
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead className="bg-[var(--color-surface-alt)] text-left text-[11px] font-bold uppercase text-[var(--color-muted)]">
                  <tr>
                    <th className="px-3 py-2 w-8" />
                    <th className="px-3 py-2">{hi ? 'प्रश्न' : 'Question'}</th>
                    <th className="px-3 py-2">{hi ? 'विषय' : 'Subject'}</th>
                    <th className="px-3 py-2">{hi ? 'टॉपिक' : 'Topic'}</th>
                    <th className="px-3 py-2">{hi ? 'वर्ष' : 'Year'}</th>
                    <th className="px-3 py-2">{hi ? 'हिंदी' : 'Hindi'}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((q: DraftQuestion) => (
                    <tr key={q.id} className="border-t border-[var(--color-line)] align-top">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(q.id)}
                          onChange={() => toggle(q.id)}
                          aria-label={q.text.en || q.id}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                        />
                      </td>
                      <td className="max-w-[360px] px-3 py-2">
                        <span className="line-clamp-2">{q.text.en || q.text.hi}</span>
                      </td>
                      <td className="px-3 py-2">{q.subjectId}</td>
                      <td className="px-3 py-2">{q.topicId}</td>
                      <td className="px-3 py-2 tabular-nums">{q.pyq?.year ?? '—'}</td>
                      <td className="px-3 py-2">
                        {/* Publishing needs Hindi, so flag its absence before the
                            database refuses the row. */}
                        {q.text.hi?.trim() ? (
                          <Badge tone="success">✓</Badge>
                        ) : (
                          <Badge tone="warning">⚠ {hi ? 'नहीं' : 'missing'}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncSection>
    </div>
  );
}
