'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NOTES, SUBJECTS, t, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { NoteCard } from '@/components/cards';
import { EmptyState } from '@/components/ui';

export default function NotesPage() {
  const { lang, user, uploadedNotes } = useStore();
  const [subjectId, setSubjectId] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);

  const all = [...uploadedNotes, ...NOTES];
  const filtered = all
    .filter((n) => (subjectId === 'all' ? true : n.subjectId === subjectId))
    .filter((n) => (savedOnly ? user.savedNoteIds.includes(n.id) : true));

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t(UI.notes, lang)}</h1>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            {lang === 'hi'
              ? 'ऐप में पढ़ें, सहेजें या PDF डाउनलोड करें'
              : 'Read in-app, save, or download the PDF'}
          </p>
        </div>
        <Link
          href="/studio"
          className="shrink-0 rounded-full bg-[var(--color-ink)] px-3.5 py-2 text-[12px] font-bold text-white"
        >
          ⬆ {t(UI.upload, lang)}
        </Link>
      </div>

      <div className="space-y-2">
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
          {SUBJECTS.filter((s) => all.some((n) => n.subjectId === s.id)).map((s) => (
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
        <label className="flex items-center gap-2 text-[12px] font-semibold">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          {lang === 'hi' ? 'केवल सहेजे गए नोट्स' : 'Only saved notes'}
        </label>
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <NoteCard key={n.id} note={n} width="w-full" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📚"
          title={lang === 'hi' ? 'कोई नोट्स नहीं मिले' : 'No notes found'}
          body={
            lang === 'hi'
              ? 'फ़िल्टर बदलें या स्टूडियो से अपने नोट्स अपलोड करें।'
              : 'Change the filter, or upload your own notes from the Studio.'
          }
        />
      )}
    </div>
  );
}
