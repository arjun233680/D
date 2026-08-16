'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  EDUCATORS,
  EXAMS,
  SUBJECTS,
  t,
  UI,
  type ContentAccess,
  type Lang,
  type Note,
  type Video,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { Badge, SectionHeader } from '@/components/ui';

type Mode = 'video' | 'note';

/**
 * Educator Studio — the upload half of the product.
 *
 * Files become object URLs and the metadata is stored client-side, which is
 * exactly the shape a real upload would produce: swap the object URL for the
 * CDN URL returned by the storage service and nothing else changes.
 */
export default function StudioPage() {
  const { lang, addVideo, addNote, uploadedVideos, uploadedNotes } = useStore();
  const [mode, setMode] = useState<Mode>('video');
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descHi, setDescHi] = useState('');
  const [subjectId, setSubjectId] = useState(SUBJECTS[0]!.id);
  const [examIds, setExamIds] = useState<string[]>(['ctet']);
  const [educatorId, setEducatorId] = useState(EDUCATORS[0]!.id);
  const [access, setAccess] = useState<ContentAccess>('free');
  const [language, setLanguage] = useState<Lang>('hi');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  const canSave = titleEn.trim().length > 2 && (mode === 'note' || Boolean(file));

  const reset = () => {
    setTitleEn('');
    setTitleHi('');
    setDescEn('');
    setDescHi('');
    setFile(null);
    setDuration(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickFile = (picked: File | null) => {
    setFile(picked);
    if (!picked || mode !== 'video') return;
    // Read the real duration off the file so the card shows the truth.
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      setDuration(Math.round(probe.duration || 0));
      URL.revokeObjectURL(probe.src);
    };
    probe.src = URL.createObjectURL(picked);
  };

  const save = () => {
    const now = new Date().toISOString();
    const id = `${mode}-upload-${Date.now()}`;
    const title = { en: titleEn, hi: titleHi || titleEn };

    if (mode === 'video') {
      const video: Video = {
        id,
        title,
        description: { en: descEn, hi: descHi || descEn },
        educatorId,
        subjectId,
        examIds,
        src: file ? URL.createObjectURL(file) : '',
        thumbnail: subject.color,
        durationSeconds: duration,
        views: 0,
        publishedAt: now.slice(0, 10),
        access,
        language,
        chapters: [],
        resources: [],
      };
      addVideo(video);
    } else {
      const note: Note = {
        id,
        title,
        subjectId,
        examIds,
        educatorId,
        fileUrl: file ? URL.createObjectURL(file) : undefined,
        pages: 1,
        downloads: 0,
        updatedAt: now.slice(0, 10),
        access,
        language: 'both',
        tags: [{ en: 'Uploaded', hi: 'अपलोड किया' }],
        sections: [
          {
            heading: title,
            body: { en: descEn || titleEn, hi: descHi || descEn || titleHi || titleEn },
          },
        ],
      };
      addNote(note);
    }

    setSaved(id);
    reset();
    window.setTimeout(() => setSaved(null), 4000);
  };

  const field = 'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-brand)]';
  const label = 'mb-1 block text-[12px] font-bold text-[var(--color-muted)]';

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t(UI.studio, lang)}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'अपने वीडियो एवं नोट्स अपलोड करें — शिक्षार्थियों को तुरंत दिखेंगे।'
            : 'Upload your videos and notes — learners see them immediately.'}
        </p>
      </div>

      {/* The question bank is the other half of the Studio. It lives on its own
          routes because importing a spreadsheet and uploading one video are
          different jobs with different shapes. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/studio/import"
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-light)] text-xl">
            ⬆
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold">
              {lang === 'hi' ? 'प्रश्न आयात करें' : 'Import questions'}
            </span>
            <span className="block text-[12px] text-[var(--color-muted)]">
              {lang === 'hi'
                ? 'CSV से थोक अपलोड — जाँच के बाद ड्राफ़्ट'
                : 'Bulk CSV upload — validated, saved as drafts'}
            </span>
          </span>
        </Link>
        <Link
          href="/studio/drafts"
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-light)] text-xl">
            📝
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold">
              {lang === 'hi' ? 'समीक्षा एवं प्रकाशन' : 'Review and publish'}
            </span>
            <span className="block text-[12px] text-[var(--color-muted)]">
              {lang === 'hi' ? 'ड्राफ़्ट देखें और प्रकाशित करें' : 'Look over drafts, then publish'}
            </span>
          </span>
        </Link>
      </div>

      {/* Who you are, and the way in. The Studio is the one part of the site
          that needs an account; the learner side is not gated. */}
      <StudioIdentity lang={lang} />

      <div className="flex gap-2">
        {(['video', 'note'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              reset();
            }}
            className={`flex-1 rounded-xl border px-4 py-3 text-[13px] font-bold ${
              mode === m
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {m === 'video'
              ? `🎥 ${lang === 'hi' ? 'वीडियो अपलोड' : 'Upload video'}`
              : `📄 ${lang === 'hi' ? 'नोट्स अपलोड' : 'Upload notes'}`}
          </button>
        ))}
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <span className={label}>
            {mode === 'video'
              ? lang === 'hi'
                ? 'वीडियो फ़ाइल'
                : 'Video file'
              : lang === 'hi'
                ? 'PDF फ़ाइल (वैकल्पिक)'
                : 'PDF file (optional)'}
          </span>
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--color-line-strong)] px-4 py-8 text-center">
            <span className="text-3xl">{mode === 'video' ? '🎬' : '📄'}</span>
            <span className="text-[13px] font-bold">
              {file
                ? file.name
                : lang === 'hi'
                  ? 'फ़ाइल चुनने हेतु टैप करें'
                  : 'Tap to choose a file'}
            </span>
            <span className="text-[11px] text-[var(--color-muted)]">
              {mode === 'video' ? 'MP4, WebM, MOV' : 'PDF'}
              {file ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
              {duration ? ` · ${Math.round(duration / 60)} min` : ''}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={mode === 'video' ? 'video/*' : 'application/pdf'}
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>{lang === 'hi' ? 'शीर्षक (English)' : 'Title (English)'}</span>
            <input
              className={field}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={
                lang === 'hi' ? 'पियाजे की अवस्थाएँ — पूर्ण पुनरावृत्ति' : 'Piaget stages — full revision'
              }
            />
          </div>
          <div>
            <span className={label}>{lang === 'hi' ? 'शीर्षक (हिंदी)' : 'Title (Hindi)'}</span>
            <input
              className={field}
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
              placeholder="पियाजे की अवस्थाएँ — पूर्ण पुनरावृत्ति"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={label}>{lang === 'hi' ? 'विवरण (English)' : 'Description (English)'}</span>
            <textarea
              className={`${field} min-h-[80px]`}
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
            />
          </div>
          <div>
            <span className={label}>{lang === 'hi' ? 'विवरण (हिंदी)' : 'Description (Hindi)'}</span>
            <textarea
              className={`${field} min-h-[80px]`}
              value={descHi}
              onChange={(e) => setDescHi(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className={label}>{lang === 'hi' ? 'विषय' : 'Subject'}</span>
            <select className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {t(s.name, lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>{lang === 'hi' ? 'शिक्षक' : 'Educator'}</span>
            <select className={field} value={educatorId} onChange={(e) => setEducatorId(e.target.value)}>
              {EDUCATORS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>{lang === 'hi' ? 'पहुँच' : 'Access'}</span>
            <select
              className={field}
              value={access}
              onChange={(e) => setAccess(e.target.value as ContentAccess)}
            >
              <option value="free">{t(UI.free, lang)}</option>
              <option value="plus">Plus</option>
              <option value="iconic">Iconic</option>
            </select>
          </div>
        </div>

        {mode === 'video' ? (
          <div>
            <span className={label}>{lang === 'hi' ? 'कक्षा की भाषा' : 'Class language'}</span>
            <div className="flex gap-2">
              {(['hi', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={`rounded-full border px-4 py-1.5 text-[12px] font-bold ${
                    language === l
                      ? 'border-transparent bg-[var(--color-brand)] text-white'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]'
                  }`}
                >
                  {l === 'hi' ? 'हिंदी' : 'English'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <span className={label}>{lang === 'hi' ? 'किन परीक्षाओं हेतु' : 'Target exams'}</span>
          <div className="flex flex-wrap gap-2">
            {EXAMS.map((e) => {
              const on = examIds.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() =>
                    setExamIds((prev) =>
                      prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                    on
                      ? 'border-transparent bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]'
                  }`}
                >
                  {e.shortName}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="w-full rounded-xl bg-[var(--color-brand)] py-3.5 text-[14px] font-bold text-white disabled:opacity-40"
        >
          {lang === 'hi' ? 'प्रकाशित करें' : 'Publish'}
        </button>

        {saved ? (
          <p className="rounded-xl bg-[var(--color-success-light)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-success)]">
            {lang === 'hi'
              ? '✓ प्रकाशित! यह अब वीडियो/नोट्स सूची में दिख रहा है।'
              : '✓ Published — it now appears in the videos/notes list.'}
          </p>
        ) : null}

        <p className="text-[11px] leading-relaxed text-[var(--color-faint)]">
          {lang === 'hi'
            ? 'नोट: बिना बैकएंड के फ़ाइल इसी ब्राउज़र टैब में रहती है। बैकएंड जोड़ते ही यही फ़ॉर्म असली स्टोरेज पर अपलोड करेगा।'
            : 'Note: without a backend the file lives in this browser tab only. Wire up storage and this same form uploads for real.'}
        </p>
      </div>

      {uploadedVideos.length || uploadedNotes.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'आपके अपलोड' : 'Your uploads'} />
          <div className="space-y-2">
            {uploadedVideos.map((v) => (
              <Link key={v.id} href={`/videos/${v.id}`} className="card flex items-center gap-3 p-3">
                <span className="text-xl">🎥</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                  {t(v.title, lang)}
                </span>
                <Badge tone="brand">{lang === 'hi' ? 'वीडियो' : 'Video'}</Badge>
              </Link>
            ))}
            {uploadedNotes.map((n) => (
              <Link key={n.id} href={`/notes/${n.id}`} className="card flex items-center gap-3 p-3">
                <span className="text-xl">📄</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                  {t(n.title, lang)}
                </span>
                <Badge tone="accent">{lang === 'hi' ? 'नोट्स' : 'Notes'}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** A one-line "you are signed in as …" with the sign-in link beside it. */
function StudioIdentity({ lang }: { lang: 'en' | 'hi' }) {
  const { access, loading } = useStudioAccess();
  const hi = lang === 'hi';
  if (loading || !access) return null;

  const label =
    access.kind === 'staff'
      ? hi
        ? `स्टाफ़ के रूप में साइन इन: ${access.email ?? ''}`
        : `Signed in as staff: ${access.email ?? ''}`
      : access.kind === 'not-staff'
        ? hi
          ? `${access.email ?? 'यह खाता'} — स्टाफ़ नहीं`
          : `${access.email ?? 'This account'} — not staff`
        : access.kind === 'signed-out'
          ? hi
            ? 'साइन इन नहीं हैं'
            : 'Not signed in'
          : hi
            ? 'इस बिल्ड में कोई डेटाबेस नहीं'
            : 'No database in this build';

  return (
    <div className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <span className="text-[13px] text-[var(--color-muted)]">{label}</span>
      {access.kind !== 'no-backend' ? (
        <Link href="/studio/sign-in" className="text-[13px] font-bold text-[var(--color-brand)]">
          {access.kind === 'staff'
            ? hi
              ? 'खाता बदलें'
              : 'Switch account'
            : hi
              ? 'साइन इन'
              : 'Sign in'}
        </Link>
      ) : null}
    </div>
  );
}
