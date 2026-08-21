'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Note } from '@adhyapak/core';
import {
  buildNoteDocument,
  countQuestions,
  fetchNote,
  formatCount,
  noteToPdfHtml,
  t,
  UI,
  type NoteBlock,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { AsyncSection } from '@/components/ui';

/**
 * The note reader — a PDF viewer, not an article.
 *
 * Notes are study material and study material is read as a document: a cover,
 * a contents list, numbered A4 sheets with running headers. `buildNoteDocument`
 * decides the page breaks so this viewer, the phone's viewer and the downloaded
 * file all agree on what page 4 is.
 */
export default function NoteReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, uploadedNotes } = useStore();

  // A note uploaded in this session has not reached the backend yet, so it is
  // checked first; everything else comes through the repository, which serves
  // published notes only.
  const local = uploadedNotes.find((n) => n.id === id);
  const state = useAsync(async () => local ?? (await fetchNote(id)) ?? undefined, [id, local]);

  return (
    <AsyncSection
      state={state}
      lang={lang}
      empty={{
        icon: '📚',
        title: lang === 'hi' ? 'नोट्स नहीं मिले' : 'Note not found',
        body:
          lang === 'hi'
            ? 'ये नोट्स अब उपलब्ध नहीं हैं या अभी प्रकाशित नहीं हुए हैं।'
            : 'These notes are no longer available, or have not been published yet.',
      }}
    >
      {(note) => <Reader note={note} />}
    </AsyncSection>
  );
}

function Reader({ note }: { note: Note }) {
  const { lang, user, toggleSavedNote } = useStore();
  const [busy, setBusy] = useState(false);

  const doc = useMemo(() => buildNoteDocument(note, lang), [note, lang]);
  const hi = lang === 'hi';
  const saved = user.savedNoteIds.includes(note.id);

  // Counted, not fetched: the reader only needs to know whether a practice link
  // is worth showing.
  const practice = useAsync(
    () => countQuestions(note.topicId ? { topicId: note.topicId } : { subjectId: note.subjectId }),
    [note.topicId, note.subjectId],
  );
  const practiceCount = practice.data ?? 0;

  /** Opens the document as its own file, where "Save as PDF" writes it to disk. */
  const download = () => {
    setBusy(true);
    try {
      const blob = new Blob([noteToPdfHtml(note, lang)], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, '_blank');
      if (!tab) {
        URL.revokeObjectURL(url);
        window.print();
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface-alt)] px-3 pt-3 pb-8 sm:px-0 sm:pt-5">
      {/* Viewer toolbar: what this is, how long it is, and the file itself. */}
      <div className="no-print sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]/95 px-3 py-2 backdrop-blur">
        <Link href="/notes" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ←
        </Link>
        <span className="rounded bg-[var(--color-danger)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          PDF
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-muted)]">
          {doc.title} · {doc.totalPages} {hi ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}{' '}
          {hi ? 'डाउनलोड' : 'downloads'}
        </span>
        <button
          type="button"
          onClick={() => toggleSavedNote(note.id)}
          className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[12px] font-bold"
        >
          {saved ? `★ ${hi ? 'सहेजा गया' : 'Saved'}` : `☆ ${hi ? 'सहेजें' : 'Save'}`}
        </button>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="rounded-full bg-[var(--color-brand)] px-3.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
        >
          ⬇ {busy ? (hi ? 'तैयार…' : 'Preparing…') : hi ? 'PDF डाउनलोड' : 'Download PDF'}
        </button>
      </div>

      <div className="space-y-5">
        {/* A4 proportions once a sheet has room; a phone reflows rather than shrinking the type. */}
        {doc.pages.map((page) => (
          <article
            key={page.number}
            className="mx-auto flex w-full max-w-[820px] flex-col rounded-sm border border-[var(--color-line)] bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,0.10)] sm:min-h-[1160px] sm:p-11"
          >
            <header className="mb-5 flex justify-between gap-4 border-b border-[var(--color-line)] pb-2 text-[11px] text-[var(--color-faint)]">
              <span className="truncate">{doc.subject}</span>
              <span className="truncate">{doc.title}</span>
            </header>

            <div className="flex-1">
              {page.kind === 'cover' ? (
                <Cover doc={doc} hi={hi} />
              ) : (
                page.blocks.map((block) => (
                  <Block key={block.section.heading.en} block={block} lang={lang} hi={hi} />
                ))
              )}
            </div>

            <footer className="mt-5 flex justify-between gap-4 border-t border-[var(--color-line)] pt-2 text-[11px] text-[var(--color-faint)]">
              <span className="truncate">adhyapak · {doc.author}</span>
              <span className="tabular-nums">
                {hi ? 'पृष्ठ' : 'Page'} {page.number} / {doc.totalPages}
              </span>
            </footer>
          </article>
        ))}
      </div>

      {practiceCount ? (
        <Link
          href={note.topicId ? `/practice/topic/${note.topicId}` : `/practice/subject/${note.subjectId}`}
          className="no-print mx-auto mt-5 block w-full max-w-[820px] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 text-center text-[14px] font-bold text-[var(--color-brand)]"
        >
          {hi ? 'अब इस टॉपिक के प्रश्न हल करें →' : 'Now practise questions on this topic →'}
        </Link>
      ) : null}
    </div>
  );
}

function Cover({ doc, hi }: { doc: ReturnType<typeof buildNoteDocument>; hi: boolean }) {
  const contents = doc.pages
    .filter((p) => p.kind === 'content')
    .flatMap((p) => p.blocks.map((b) => ({ b, page: p.number })));

  return (
    <div className="pt-4 text-[#14161c]">
      <p className="text-[34px] leading-none">{doc.subjectIcon}</p>
      <p className="mt-5 text-[11px] font-bold tracking-[0.16em] text-[var(--color-brand)] uppercase">
        {doc.subject}
      </p>
      <h1 className="mt-1.5 text-3xl leading-tight font-extrabold">{doc.title}</h1>
      <p className="mt-2 text-[13px] text-[var(--color-muted)]">
        {doc.author} · {doc.updated} · {doc.totalPages} {hi ? 'पृष्ठ' : 'pages'}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {doc.exams.map((exam) => (
          <span
            key={exam}
            className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] text-[var(--color-muted)]"
          >
            {exam}
          </span>
        ))}
      </div>

      <p className="mt-10 text-[11px] font-bold tracking-[0.14em] text-[var(--color-faint)] uppercase">
        {hi ? 'विषय-सूची' : 'Contents'}
      </p>
      <ol className="mt-2">
        {contents.map(({ b, page }) => (
          <li
            key={b.section.heading.en}
            className="flex items-baseline gap-3 border-b border-[var(--color-line)] py-2.5 text-[13.5px]"
          >
            <span className="flex-1">
              {b.index}. {hi ? b.section.heading.hi : b.section.heading.en}
            </span>
            <span className="tabular-nums text-[var(--color-faint)]">{page}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Block({ block, lang, hi }: { block: NoteBlock; lang: 'en' | 'hi'; hi: boolean }) {
  const { index, section } = block;
  return (
    <section className="mb-7 text-[#14161c]">
      <h2 className="text-[17px] font-extrabold">
        <span className="mr-2 text-[var(--color-faint)]">{index}.</span>
        {t(section.heading, lang)}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed">{t(section.body, lang)}</p>

      {section.bullets?.length ? (
        <ul className="mt-3 space-y-2">
          {section.bullets.map((b) => (
            <li key={b.en} className="flex gap-2 text-[13.5px] leading-relaxed">
              <span className="text-[var(--color-faint)]">▸</span>
              <span>{t(b, lang)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {section.callout ? (
        <aside className="mt-3 rounded-r-xl border-l-4 border-[var(--color-saffron)] bg-[var(--color-saffron-light)] px-3.5 py-3">
          <p className="text-[11px] font-bold tracking-wide text-[var(--color-saffron)] uppercase">
            {hi ? 'याद रखें' : 'Remember'}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed font-medium">{t(section.callout, lang)}</p>
        </aside>
      ) : null}
    </section>
  );
}
