'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  EXAMS,
  isBackendConfigured,
  isStaff,
  type DuplicateMatch,
  type Issue,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import {
  MAPPABLE_FIELDS,
  parseFile,
  runImport,
  validateImport,
  type ParsedFile,
  type Step,
  type ValidatedImport,
} from '@/lib/importPipeline';
import { Badge, ErrorState } from '@/components/ui';

/**
 * Bulk question import.
 *
 * Six steps, one screen: upload, map columns, review, import, publish. Every
 * decision that could damage the library is deliberately not automatic —
 * duplicates are shown and skipped by choice, rejected rows are listed with the
 * line number and a suggested fix, and everything lands as a draft no matter
 * what the file says.
 *
 * Nothing here validates anything itself. `@adhyapak/core` does the parsing,
 * mapping, validation and duplicate detection; this file only decides what to
 * put on screen.
 */

const STEPS: { id: Step; label: string; hi: string }[] = [
  { id: 'upload', label: 'Upload', hi: 'अपलोड' },
  { id: 'map', label: 'Map columns', hi: 'कॉलम मैप' },
  { id: 'review', label: 'Review', hi: 'समीक्षा' },
  { id: 'importing', label: 'Import', hi: 'आयात' },
  { id: 'done', label: 'Publish', hi: 'प्रकाशित' },
];

/** How many preview rows are in the DOM at once. A 20,000-row file is paged. */
const PAGE = 50;

export default function ImportPage() {
  const { lang } = useStore();
  const hi = lang === 'hi';

  // Two different reasons the import step can be unavailable, and they need
  // different words. Without credentials there is no database to write to;
  // with credentials but the wrong role, the database will refuse. Saying
  // "educators only" when the truth is "no database configured" sends someone
  // to ask for a permission that would not help.
  const hasBackend = isBackendConfigured();
  const staff = useAsync(async () => (hasBackend ? await isStaff() : false), [hasBackend]);
  const canWrite = hasBackend && staff.data === true;

  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | undefined>>({});
  const [label, setLabel] = useState('');
  const [examId, setExamId] = useState<string>('');
  const [validated, setValidated] = useState<ValidatedImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'accepted' | 'rejected' | 'duplicates'>('accepted');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const next = parseFile(file.name, text);
    setParsed(next);
    setMapping(next.autoMapping);
    setLabel(file.name.replace(/\.[^.]+$/, ''));
    setStep('map');
  };

  const onValidate = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      setValidated(await validateImport(parsed, mapping, { examId: examId || undefined }));
      setPage(0);
      setTab('accepted');
      setStep('review');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (!parsed || !validated) return;
    setBusy(true);
    setStep('importing');
    setProgress({ done: 0, total: validated.report.accepted.length - validated.skipped.size });
    const result = await runImport(parsed, validated, label, examId || undefined, (done, total) =>
      setProgress({ done, total }),
    );
    setBusy(false);
    setStep('done');
    setOutcome({
      ok: result.ok,
      text: result.ok
        ? hi
          ? `${result.written} प्रश्न ड्राफ़्ट के रूप में आयात हुए।`
          : `${result.written} questions imported as drafts.`
        : (result.error ?? 'Import failed.'),
    });
  };

  const toggleSkip = (id: string) => {
    if (!validated) return;
    const next = new Set(validated.skipped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setValidated({ ...validated, skipped: next });
  };

  const duplicateIds = useMemo(
    () => new Set((validated?.duplicates ?? []).map((d) => d.id)),
    [validated],
  );

  // Only the final write needs a database. Parsing, mapping, validation and the
  // duplicate check all run here, so a file can be checked before anyone has
  // credentials — which is genuinely useful, and the wizard says so plainly
  // rather than pretending the import will land.
  if (hasBackend && staff.data === false) {
    return (
      <div className="px-4 pt-6 sm:px-0">
        <ErrorState
          title={hi ? 'केवल शिक्षकों के लिए' : 'Educators only'}
          body={
            hi
              ? 'प्रश्न आयात करने के लिए शिक्षक खाते से साइन इन करें। यह नियम डेटाबेस में भी लागू है।'
              : 'Sign in with an educator account to import questions. The database enforces this too.'
          }
          retryLabel={hi ? 'दोबारा जाँचें' : 'Check again'}
          onRetry={staff.retry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-4 pb-10 sm:px-0 sm:pt-6">
      <header>
        <Link href="/studio" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← Studio
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">
          {hi ? 'प्रश्न आयात करें' : 'Import questions'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'CSV अपलोड करें। हर पंक्ति जाँची जाएगी और ड्राफ़्ट के रूप में सहेजी जाएगी — कुछ भी सीधे प्रकाशित नहीं होता।'
            : 'Upload a CSV. Every row is checked and saved as a draft — nothing is published directly.'}
        </p>
      </header>

      <StepBar current={step} hi={hi} />

      {!hasBackend ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? 'कोई डेटाबेस कॉन्फ़िगर नहीं है। आप फ़ाइल जाँच सकते हैं, पर सहेजा कुछ नहीं जाएगा।'
            : 'No database is configured. You can check a file here, but nothing can be saved.'}
        </p>
      ) : null}

      {step === 'upload' ? (
        <section className="card p-6">
          <label className="block text-[13px] font-bold">
            {hi ? 'CSV फ़ाइल चुनें' : 'Choose a CSV file'}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-ink)] file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white"
          />
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-muted)]">
            {hi
              ? 'कॉलम के नाम कुछ भी हों — "Question", "question_text", "Question Text" सब पहचाने जाते हैं। अगले चरण में आप इन्हें बदल भी सकते हैं।'
              : 'Column names can be anything — "Question", "question_text" and "Question Text" are all recognised, and you can change the mapping in the next step.'}
          </p>
        </section>
      ) : null}

      {step === 'map' && parsed ? (
        <section className="space-y-4">
          <div className="card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[12px] font-bold">{hi ? 'इस आयात का नाम' : 'Name this import'}</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="HTET TGT Science 2024"
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold">
                  {hi ? 'डिफ़ॉल्ट परीक्षा (वैकल्पिक)' : 'Default exam (optional)'}
                </label>
                <select
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[13px]"
                >
                  <option value="">{hi ? 'फ़ाइल से लें' : 'Take from the file'}</option>
                  {EXAMS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-[var(--color-muted)]">
              {parsed.rows.length.toLocaleString('en-IN')} {hi ? 'पंक्तियाँ' : 'rows'} ·{' '}
              {parsed.headers.length} {hi ? 'कॉलम' : 'columns'} · {parsed.filename}
            </p>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-surface-alt)] text-left text-[11px] font-bold uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-2">{hi ? 'फ़ील्ड' : 'Field'}</th>
                  <th className="px-4 py-2">{hi ? 'CSV कॉलम' : 'CSV column'}</th>
                  <th className="px-4 py-2">{hi ? 'नमूना' : 'Sample'}</th>
                </tr>
              </thead>
              <tbody>
                {MAPPABLE_FIELDS.map((f) => {
                  const chosen = mapping[f.field];
                  const sample = chosen ? (parsed.rows[0]?.[chosen] ?? '') : '';
                  return (
                    <tr key={f.field} className="border-t border-[var(--color-line)]">
                      <td className="px-4 py-2 font-semibold">
                        {f.label}
                        {f.required ? <span className="ml-1 text-[var(--color-danger)]">*</span> : null}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={chosen ?? ''}
                          onChange={(e) =>
                            setMapping({ ...mapping, [f.field]: e.target.value || undefined })
                          }
                          className="w-full rounded-lg border border-[var(--color-line)] px-2 py-1 text-[12px]"
                        >
                          <option value="">— {hi ? 'कोई नहीं' : 'not mapped'} —</option>
                          {parsed.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2 text-[var(--color-muted)]">
                        {sample}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onValidate}
              disabled={busy}
              className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {busy ? (hi ? 'जाँच रहे हैं…' : 'Validating…') : hi ? 'जाँचें' : 'Validate'}
            </button>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-[13px] font-bold"
            >
              {hi ? 'वापस' : 'Back'}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'review' && validated ? (
        <ReviewStep
          validated={validated}
          hi={hi}
          tab={tab}
          setTab={setTab}
          page={page}
          setPage={setPage}
          duplicateIds={duplicateIds}
          toggleSkip={toggleSkip}
          onBack={() => setStep('map')}
          onImport={onImport}
          busy={busy}
          canWrite={canWrite}
        />
      ) : null}

      {step === 'importing' ? (
        <section className="card p-8 text-center">
          <p className="text-[15px] font-bold">{hi ? 'आयात हो रहा है…' : 'Importing…'}</p>
          {progress ? (
            <>
              <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                {progress.done.toLocaleString('en-IN')} / {progress.total.toLocaleString('en-IN')}
              </p>
              <div className="mx-auto mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-[var(--color-line)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
                  style={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {step === 'done' && outcome ? (
        <section className={`card p-6 ${outcome.ok ? '' : 'border-[var(--color-danger)]'}`}>
          <p className="text-[15px] font-bold">
            {outcome.ok ? '✅ ' : '⚠️ '}
            {outcome.text}
          </p>
          {outcome.ok ? (
            <p className="mt-2 text-[13px] text-[var(--color-muted)]">
              {hi
                ? 'ये प्रश्न ड्राफ़्ट हैं और अभी किसी शिक्षार्थी को नहीं दिखते। समीक्षा के बाद प्रकाशित करें।'
                : 'These are drafts and no learner can see them yet. Review, then publish.'}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link
              href="/studio/drafts"
              className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-[13px] font-bold text-white"
            >
              {hi ? 'ड्राफ़्ट खोलें' : 'Open drafts'}
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setParsed(null);
                setValidated(null);
                setOutcome(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-[13px] font-bold"
            >
              {hi ? 'एक और फ़ाइल' : 'Import another file'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepBar({ current, hi }: { current: Step; hi: boolean }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="rail flex gap-2 text-[12px]">
      {STEPS.map((s, i) => {
        const state = i < index ? 'done' : i === index ? 'current' : 'todo';
        return (
          <li
            key={s.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${
              state === 'current'
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : state === 'done'
                  ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                  : 'border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            <span aria-hidden>{state === 'done' ? '✓' : i + 1}</span>
            {hi ? s.hi : s.label}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewStep({
  validated,
  hi,
  tab,
  setTab,
  page,
  setPage,
  duplicateIds,
  toggleSkip,
  onBack,
  onImport,
  busy,
  canWrite,
}: {
  validated: ValidatedImport;
  hi: boolean;
  tab: 'accepted' | 'rejected' | 'duplicates';
  setTab: (t: 'accepted' | 'rejected' | 'duplicates') => void;
  page: number;
  setPage: (n: number) => void;
  duplicateIds: Set<string>;
  toggleSkip: (id: string) => void;
  onBack: () => void;
  onImport: () => void;
  busy: boolean;
  canWrite: boolean;
}) {
  const { report, duplicates, skipped } = validated;
  const willWrite = report.accepted.length - skipped.size;

  const rows =
    tab === 'accepted' ? report.accepted : tab === 'rejected' ? report.rejected : duplicates;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tally label={hi ? 'कुल पंक्तियाँ' : 'Total rows'} value={report.stats.total} />
        <Tally label={hi ? 'स्वीकृत' : 'Accepted'} value={report.stats.accepted} tone="success" />
        <Tally label={hi ? 'चेतावनी' : 'Warnings'} value={report.warnings.length} tone="warning" />
        <Tally label={hi ? 'अस्वीकृत' : 'Rejected'} value={report.stats.rejected} tone="danger" />
      </div>

      {duplicates.length ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? `${duplicates.length} संभावित डुप्लिकेट मिले। इन्हें अपने आप नहीं हटाया गया — आप चुनें।`
            : `${duplicates.length} possible duplicates found. Nothing was removed automatically — you decide.`}
        </p>
      ) : null}

      <div className="rail flex gap-2">
        {(['accepted', 'rejected', 'duplicates'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setPage(0);
            }}
            aria-pressed={tab === id}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
              tab === id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {id === 'accepted'
              ? `${hi ? 'स्वीकृत' : 'Accepted'} (${report.accepted.length})`
              : id === 'rejected'
                ? `${hi ? 'अस्वीकृत' : 'Rejected'} (${report.rejected.length})`
                : `${hi ? 'डुप्लिकेट' : 'Duplicates'} (${duplicates.length})`}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--color-muted)]">
            {tab === 'rejected'
              ? hi
                ? 'कोई पंक्ति अस्वीकृत नहीं हुई।'
                : 'No rows were rejected.'
              : tab === 'duplicates'
                ? hi
                  ? 'कोई डुप्लिकेट नहीं मिला।'
                  : 'No duplicates found.'
                : hi
                  ? 'कोई पंक्ति स्वीकृत नहीं हुई।'
                  : 'No rows were accepted.'}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="bg-[var(--color-surface-alt)] text-left text-[11px] font-bold uppercase text-[var(--color-muted)]">
              <tr>
                {tab === 'accepted' ? (
                  <>
                    <th className="px-3 py-2">{hi ? 'प्रश्न' : 'Question'}</th>
                    <th className="px-3 py-2">{hi ? 'विषय' : 'Subject'}</th>
                    <th className="px-3 py-2">{hi ? 'टॉपिक' : 'Topic'}</th>
                    <th className="px-3 py-2">{hi ? 'उत्तर' : 'Answer'}</th>
                    <th className="px-3 py-2">{hi ? 'वर्ष' : 'Year'}</th>
                    <th className="px-3 py-2">{hi ? 'स्थिति' : 'Status'}</th>
                  </>
                ) : tab === 'rejected' ? (
                  <>
                    <th className="px-3 py-2">{hi ? 'पंक्ति' : 'Line'}</th>
                    <th className="px-3 py-2">{hi ? 'फ़ील्ड' : 'Field'}</th>
                    <th className="px-3 py-2">{hi ? 'समस्या' : 'Problem'}</th>
                    <th className="px-3 py-2">{hi ? 'सुझाव' : 'Suggested'}</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2">{hi ? 'पंक्ति id' : 'Row id'}</th>
                    <th className="px-3 py-2">{hi ? 'किससे मेल' : 'Matches'}</th>
                    <th className="px-3 py-2">{hi ? 'कारण' : 'Reason'}</th>
                    <th className="px-3 py-2">{hi ? 'छोड़ें' : 'Skip'}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === 'accepted'
                ? (slice as typeof report.accepted).map((q) => {
                    const isDupe = duplicateIds.has(q.id);
                    const isSkipped = skipped.has(q.id);
                    return (
                      <tr key={q.id} className="border-t border-[var(--color-line)] align-top">
                        <td className="max-w-[320px] px-3 py-2">
                          <span className="line-clamp-2">{q.text.en || q.text.hi}</span>
                        </td>
                        <td className="px-3 py-2">{q.subjectId}</td>
                        <td className="px-3 py-2">{q.topicId}</td>
                        <td className="px-3 py-2 font-bold">
                          {String.fromCharCode(65 + (q.correctIndices[0] ?? 0))}
                        </td>
                        <td className="px-3 py-2">{q.pyq?.year ?? '—'}</td>
                        <td className="px-3 py-2">
                          {/* Text, not colour alone — the status has to survive a
                              greyscale screen and a colour-blind reader. */}
                          {isSkipped ? (
                            <Badge tone="neutral">⊘ {hi ? 'छोड़ा' : 'Skipped'}</Badge>
                          ) : isDupe ? (
                            <Badge tone="warning">⚠ {hi ? 'डुप्लिकेट?' : 'Duplicate?'}</Badge>
                          ) : (
                            <Badge tone="success">✓ {hi ? 'ठीक' : 'Ready'}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                : tab === 'rejected'
                  ? (slice as typeof report.rejected).map((r) =>
                      r.issues.map((issue: Issue, i: number) => (
                        <tr
                          key={`${r.row}-${i}`}
                          className="border-t border-[var(--color-line)] align-top"
                        >
                          <td className="px-3 py-2 font-bold tabular-nums">
                            {i === 0 ? r.row : ''}
                          </td>
                          <td className="px-3 py-2">{issue.field}</td>
                          <td className="px-3 py-2">✕ {issue.message}</td>
                          <td className="px-3 py-2 font-semibold text-[var(--color-brand)]">
                            {issue.suggestion ?? '—'}
                          </td>
                        </tr>
                      )),
                    )
                  : (slice as DuplicateMatch[]).map((d, i) => (
                      <tr key={`${d.id}-${i}`} className="border-t border-[var(--color-line)]">
                        <td className="px-3 py-2">{d.id}</td>
                        <td className="px-3 py-2">
                          {d.matchesId}{' '}
                          <span className="text-[var(--color-muted)]">
                            ({d.scope === 'library' ? (hi ? 'लाइब्रेरी' : 'library') : (hi ? 'इसी फ़ाइल' : 'this file')})
                          </span>
                        </td>
                        <td className="px-3 py-2">{d.reason}</td>
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={skipped.has(d.id)}
                              onChange={() => toggleSkip(d.id)}
                              className="h-4 w-4 accent-[var(--color-brand)]"
                            />
                            <span>{hi ? 'आयात न करें' : "Don't import"}</span>
                          </label>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        )}
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-[12px]">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="rounded-full border border-[var(--color-line)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            ← {hi ? 'पिछला' : 'Previous'}
          </button>
          <span className="text-[var(--color-muted)]">
            {hi ? 'पृष्ठ' : 'Page'} {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage(page + 1)}
            className="rounded-full border border-[var(--color-line)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            {hi ? 'अगला' : 'Next'} →
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onImport}
          disabled={busy || willWrite === 0 || !canWrite}
          title={
            canWrite
              ? undefined
              : hi
                ? 'सहेजने के लिए डेटाबेस चाहिए'
                : 'Saving needs a database connection'
          }
          className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {hi
            ? `${willWrite} प्रश्न ड्राफ़्ट के रूप में आयात करें`
            : `Import ${willWrite} questions as drafts`}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-[13px] font-bold"
        >
          {hi ? 'मैपिंग बदलें' : 'Change mapping'}
        </button>
      </div>
    </section>
  );
}

function Tally({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    neutral: 'text-[var(--color-body)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-[var(--color-danger)]',
  };
  return (
    <div className="card px-3 py-3 text-center">
      <div className={`text-xl font-extrabold tabular-nums ${colors[tone]}`}>
        {value.toLocaleString('en-IN')}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
