'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  EXAMS,
  type DuplicateMatch,
  type Issue,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import {
  MAPPABLE_FIELDS,
  parseErrorText,
  parseFile,
  runImport,
  templateBlob,
  validateImport,
  type ColumnMapping,
  type ParsedFile,
  type Step,
  type ValidatedImport,
} from '@/lib/importPipeline';
import { Badge } from '@/components/ui';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { StudioGate } from '@/components/StudioGate';

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

  // Three reasons the import can be unavailable, each with its own words: no
  // database in this build, nobody signed in, or signed in without the role the
  // database requires. See components/StudioGate — collapsing them to one
  // boolean is what made a blocked import look like a missing database.
  const { access, loading } = useStudioAccess();
  const hasBackend = access ? access.kind !== 'no-backend' : false;
  const canWrite = access?.kind === 'staff';

  // Why the final write is unavailable, in the words that match the actual
  // state. A generic "needs a database" sent operators to check the deploy when
  // the real answer was "sign in".
  const blocked = {
    'no-backend': ['This build has no database.', 'इस बिल्ड में कोई डेटाबेस नहीं है।'],
    'signed-out': ['Sign in to save this import.', 'इस आयात को सहेजने के लिए साइन इन करें।'],
    'not-staff': [
      'This account is not an educator or admin.',
      'यह खाता शिक्षक या एडमिन नहीं है।',
    ],
  } as const;
  const [blockedReason, blockedReasonHi] =
    access && access.kind !== 'staff' ? blocked[access.kind] : ['', ''];

  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [label, setLabel] = useState('');
  const [examId, setExamId] = useState<string>('');
  const [validated, setValidated] = useState<ValidatedImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'accepted' | 'rejected' | 'duplicates'>('accepted');
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Kept so a different worksheet can be read without asking for the file again.
  const uploadRef = useRef<File | null>(null);

  const load = async (file: File, sheetName?: string) => {
    setBusy(true);
    setParseError(null);
    try {
      const next = await parseFile(file, sheetName);
      uploadRef.current = file;
      setParsed(next);
      setMapping(next.autoMapping);
      setLabel(file.name.replace(/\.[^.]+$/, ''));
      setStep('map');
    } catch (error) {
      // A file that cannot be read is the educator's problem to fix, so the
      // reason says what to do about it rather than collapsing to "upload failed".
      setParseError(parseErrorText(error, hi));
      setParsed(null);
      setStep('upload');
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | null) => {
    if (file) void load(file);
  };

  const onSheetChange = (sheetName: string) => {
    if (uploadRef.current) void load(uploadRef.current, sheetName);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(templateBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adhyapak-question-template.xlsx';
    // Firefox ignores a click on an anchor that is not in the document, and
    // revoking the URL in the same tick can cancel the download before it
    // starts — hence the append and the deferred revoke.
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
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

  // The wizard parses, maps, validates and de-duplicates entirely in the
  // browser, which is why it used to render for anybody: a spreadsheet could be
  // checked before there was a database to put it in. That is a real feature,
  // and it is now behind the gate anyway — importing is the admin module's, and
  // a screen the rest of the Studio refuses to show is not one this page should
  // show either. Reverting is one wrapper.
  return (
    <StudioGate access={access} loading={loading} lang={lang}>
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
            ? 'Excel (.xlsx) या CSV अपलोड करें। हर पंक्ति जाँची जाएगी और ड्राफ़्ट के रूप में सहेजी जाएगी — कुछ भी सीधे प्रकाशित नहीं होता।'
            : 'Upload an Excel workbook (.xlsx) or a CSV. Every row is checked and saved as a draft — nothing is published directly.'}
        </p>
      </header>

      <StepBar current={step} hi={hi} />

      {/* Checking a file needs no database at all — parsing, mapping,
          validation and in-file duplicate detection run here — so the wizard
          stays usable and says exactly which step will not be available. */}
      {!loading && access && access.kind !== 'staff' ? (
        <div className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {access.kind === 'no-backend'
            ? hi
              ? 'इस बिल्ड में कोई डेटाबेस नहीं है। आप फ़ाइल जाँच सकते हैं, पर सहेजा कुछ नहीं जाएगा।'
              : 'This build has no database. You can check a file here, but nothing can be saved.'
            : access.kind === 'signed-out'
              ? hi
                ? 'आप साइन इन नहीं हैं। फ़ाइल जाँच सकते हैं; सहेजने के लिए साइन इन करें।'
                : 'You are not signed in. You can check a file here; signing in is what lets you save it.'
              : hi
                ? `${access.email ?? 'यह खाता'} स्टाफ़ नहीं है। डेटाबेस स्वयं आयात अस्वीकार करेगा।`
                : `${access.email ?? 'This account'} is not staff. The database itself will refuse the import.`}
          {access.kind !== 'no-backend' ? (
            <>
              {' '}
              <Link href="/studio/sign-in" className="font-bold underline">
                {hi ? 'साइन इन' : 'Sign in'}
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {step === 'upload' ? (
        <section className="card p-6">
          <label className="block text-[13px] font-bold">
            {hi ? 'Excel या CSV फ़ाइल चुनें' : 'Choose an Excel or CSV file'}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-ink)] file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white"
          />

          {busy ? (
            <p className="mt-3 text-[13px] font-semibold">{hi ? 'फ़ाइल पढ़ रहे हैं…' : 'Reading the file…'}</p>
          ) : null}

          {parseError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-[var(--color-danger)] px-4 py-3 text-[13px]"
            >
              ✕ {parseError}
            </p>
          ) : null}

          <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-muted)]">
            {hi
              ? '.xlsx वर्कबुक और CSV दोनों चलते हैं। कॉलम के नाम कुछ भी हों — "Question", "question_text", "Question Text" सब पहचाने जाते हैं। अगले चरण में आप इन्हें बदल भी सकते हैं।'
              : '.xlsx workbooks and CSVs both work. Column names can be anything — "Question", "question_text" and "Question Text" are all recognised, and you can change the mapping in the next step.'}
          </p>

          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-4 rounded-full border border-[var(--color-line)] px-4 py-2 text-[12px] font-bold"
          >
            ⬇ {hi ? 'Excel टेम्पलेट डाउनलोड करें' : 'Download the Excel template'}
          </button>
          <p className="mt-2 text-[12px] text-[var(--color-muted)]">
            {hi
              ? 'हर कॉलम सही नाम के साथ, और एक भरा हुआ उदाहरण — उसे मिटाकर अपने प्रश्न भरें।'
              : 'Every column, correctly named, with one filled-in example — delete it and add your own questions.'}
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
                  placeholder={hi ? 'HTET TGT विज्ञान 2024' : 'HTET TGT Science 2024'}
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
            {/* Only worth showing for a workbook that actually has a choice —
                a single-sheet file has nothing to decide. */}
            {parsed.sheets.length > 1 ? (
              <div className="mt-3">
                <label className="text-[12px] font-bold" htmlFor="sheet">
                  {hi ? 'वर्कशीट' : 'Worksheet'}
                </label>
                <select
                  id="sheet"
                  value={parsed.sheetName ?? ''}
                  onChange={(e) => onSheetChange(e.target.value)}
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[13px] sm:max-w-xs"
                >
                  {parsed.sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rowCount.toLocaleString('en-IN')} {hi ? 'पंक्तियाँ' : 'rows'})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <p className="mt-3 text-[12px] text-[var(--color-muted)]">
              {parsed.rows.length.toLocaleString('en-IN')} {hi ? 'पंक्तियाँ' : 'rows'} ·{' '}
              {parsed.headers.length} {hi ? 'कॉलम' : 'columns'} · {parsed.filename}
              {parsed.sheetName ? ` · ${parsed.sheetName}` : ''}
              {parsed.headerRow > 1
                ? hi
                  ? ` · हेडर पंक्ति ${parsed.headerRow} पर मिला`
                  : ` · header found on row ${parsed.headerRow}`
                : ''}
            </p>
          </div>

          {parsed.unmappable.length > 0 ? (
            <div className="rounded-xl border border-[var(--color-info)] bg-[var(--color-info-light)] px-4 py-3 text-[13px]">
              ℹ️{' '}
              {parsed.unmappable
                .map((u) => `“${u.header}” → ${u.label}`)
                .join(', ')}{' '}
              {hi
                ? 'स्वतः मैप नहीं किया गया: इस टैक्सोनॉमी में ऐसी कोई आईडी नहीं है, इसलिए हर पंक्ति अस्वीकृत हो जाती। मान रखना हो तो इसे Tags पर मैप करें।'
                : 'was not mapped automatically: this taxonomy defines no such ids, so every row would have been rejected. Map it to Tags if you want to keep the value.'}
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-surface-alt)] text-left text-[11px] font-bold uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-2">{hi ? 'फ़ील्ड' : 'Field'}</th>
                  <th className="px-4 py-2">{hi ? 'फ़ाइल का कॉलम' : 'Column in your file'}</th>
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
                            // null, not undefined: "— not mapped —" is a decision,
                            // and undefined would let the defaults re-apply it.
                            setMapping({ ...mapping, [f.field]: e.target.value || null })
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
          blockedReason={blockedReason}
          blockedReasonHi={blockedReasonHi}
          rowOffset={parsed ? parsed.headerRow - 1 : 0}
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
    </StudioGate>
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
  blockedReason,
  blockedReasonHi,
  rowOffset,
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
  /** Why the write is unavailable, already matched to the real state. */
  blockedReason: string;
  blockedReasonHi: string;
  /** Rows above the header, so a line number points at the right spreadsheet row. */
  rowOffset: number;
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
                    <th className="px-3 py-2">{hi ? 'पंक्ति' : 'Row'}</th>
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
                            {i === 0 ? r.row + rowOffset : ''}
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
          title={canWrite ? undefined : (hi ? blockedReasonHi : blockedReason)}
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
