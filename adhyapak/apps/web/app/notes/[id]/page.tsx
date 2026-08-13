'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  NOTES,
  QUESTIONS,
  formatCount,
  formatDate,
  getEducator,
  getSubject,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge } from '@/components/ui';

export default function NoteReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, user, toggleSavedNote, uploadedNotes } = useStore();

  const note = [...uploadedNotes, ...NOTES].find((n) => n.id === id);
  if (!note) notFound();

  const subject = getSubject(note.subjectId);
  const educator = getEducator(note.educatorId);
  const saved = user.savedNoteIds.includes(note.id);
  const practiceCount = QUESTIONS.filter(
    (q) => q.topicId === note.topicId || q.subjectId === note.subjectId,
  ).length;

  return (
    <article className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div className="no-print">
        <Link href="/notes" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← {t(UI.notes, lang)}
        </Link>
      </div>

      <header className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <AccessBadge access={note.access} lang={lang} />
          {subject ? (
            <Badge tone="neutral">
              {subject.icon} {t(subject.name, lang)}
            </Badge>
          ) : null}
          {note.tags.map((tag) => (
            <Badge key={tag.en} tone="info">
              {t(tag, lang)}
            </Badge>
          ))}
        </div>
        <h1 className="mt-2.5 text-2xl leading-tight font-extrabold">{t(note.title, lang)}</h1>
        <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
          {educator ? `${educator.avatar} ${educator.name} · ` : ''}
          {note.pages} {lang === 'hi' ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}{' '}
          {lang === 'hi' ? 'डाउनलोड' : 'downloads'} · {lang === 'hi' ? 'अपडेट' : 'updated'}{' '}
          {formatDate(note.updatedAt, lang)}
        </p>

        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleSavedNote(note.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold ${
              saved
                ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                : 'bg-[var(--color-ink)] text-white'
            }`}
          >
            {saved ? `✓ ${lang === 'hi' ? 'सहेजा गया' : 'Saved'}` : lang === 'hi' ? 'सहेजें' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] font-bold"
          >
            🖨 {lang === 'hi' ? 'प्रिंट / PDF' : 'Print / PDF'}
          </button>
          {note.fileUrl ? (
            <a
              href={note.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] font-bold"
            >
              ⬇ {t(UI.download, lang)}
            </a>
          ) : null}
        </div>
      </header>

      <div className="space-y-5">
        {note.sections.map((section, i) => (
          <section key={section.heading.en} className="card p-5">
            <h2 className="text-[17px] font-extrabold">
              <span className="mr-2 text-[var(--color-faint)]">{i + 1}.</span>
              {t(section.heading, lang)}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed">{t(section.body, lang)}</p>

            {section.bullets?.length ? (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((b) => (
                  <li key={b.en} className="flex gap-2 text-[13.5px] leading-relaxed">
                    <span className="text-[var(--color-brand)]">▸</span>
                    <span>{t(b, lang)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {section.callout ? (
              <div className="mt-3 rounded-xl border-l-4 border-[var(--color-saffron)] bg-[var(--color-saffron-light)] px-3.5 py-3">
                <p className="text-[11px] font-bold tracking-wide text-[var(--color-saffron)] uppercase">
                  {lang === 'hi' ? 'याद रखें' : 'Remember'}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed font-medium">
                  {t(section.callout, lang)}
                </p>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      {practiceCount ? (
        <Link
          href={note.topicId ? `/practice/topic/${note.topicId}` : `/practice/subject/${note.subjectId}`}
          className="no-print block rounded-xl bg-[var(--color-brand)] px-4 py-3.5 text-center text-[14px] font-bold text-white"
        >
          {lang === 'hi'
            ? 'अब इस टॉपिक के प्रश्न हल करें →'
            : 'Now practise questions on this topic →'}
        </Link>
      ) : null}
    </article>
  );
}
