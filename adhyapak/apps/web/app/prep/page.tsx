'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { EmptyNote, INK, MUTED, PrepHeader, PrepNav, PrepShell, VIOLET } from './ui';
import { selectionTitle, useSelection } from './useSelection';

/**
 * The dashboard for one selection — everything an HTET TGT Science candidate
 * does, on one screen.
 *
 * The progress bar and "Continue Learning" are deliberately empty rather than
 * filled with the design's 45% and "Chapter 1 • Chemistry, 60% completed".
 * Nothing records a chapter opened or a topic finished yet, so both would be
 * invented — and invented progress is worse than none, because a learner who
 * has done nothing would be told they are nearly halfway and plan around it.
 * Both light up on their own once the app records that activity.
 */

const TILES = [
  { href: '/prep/pyq', icon: '📄', tint: '#e6f0fd', dot: '#2563eb', label: { en: 'PYQ', hi: 'विगत वर्ष' }, sub: { en: 'Previous Year Questions', hi: 'विगत वर्ष प्रश्न' } },
  { href: '/notes', icon: '📗', tint: '#e8f7ee', dot: '#16a34a', label: { en: 'Notes', hi: 'नोट्स' }, sub: { en: 'Study Smart', hi: 'बेहतर पढ़ाई' } },
  { href: '/tests', icon: '📋', tint: '#fff3e6', dot: '#ea580c', label: { en: 'Test Series', hi: 'टेस्ट सीरीज़' }, sub: { en: 'Practice & Improve', hi: 'अभ्यास एवं सुधार' } },
  { href: '/tests', icon: '🎯', tint: '#f6efff', dot: '#9333ea', label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' }, sub: { en: 'Real Exam Experience', hi: 'वास्तविक परीक्षा अनुभव' } },
  { href: '/current-affairs', icon: '📰', tint: '#fdeaf3', dot: '#db2777', label: { en: 'Current Affairs', hi: 'समसामयिकी' }, sub: { en: 'Stay Updated Daily', hi: 'रोज़ अपडेट रहें' } },
  { href: '/practice', icon: '📅', tint: '#e8f7ee', dot: '#16a34a', label: { en: 'DPP', hi: 'DPP' }, sub: { en: 'Daily Practice Papers', hi: 'दैनिक अभ्यास पत्र' } },
  { href: '/practice', icon: '❓', tint: '#fff8e6', dot: '#eab308', label: { en: 'Quick Quiz', hi: 'त्वरित क्विज़' }, sub: { en: 'Test Your Knowledge', hi: 'अपना ज्ञान परखें' } },
  { href: '/notes', icon: '📘', tint: '#f1eefc', dot: '#6d4aed', label: { en: 'Revision Notes', hi: 'रिवीज़न नोट्स' }, sub: { en: 'High Yield Notes', hi: 'महत्वपूर्ण नोट्स' } },
] as const;

function PrepDashboard() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { selection, loading } = useSelection();

  if (loading || !selection) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white">
        <p className="text-[13px]" style={{ color: MUTED }}>
          {hi ? 'लाया जा रहा है…' : 'Loading…'}
        </p>
      </div>
    );
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;
  const title = selectionTitle(selection, subjectName);
  const subtitle = selection.exam ? t(selection.exam.name, lang) : t(selection.level.fullName, lang);

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <div className="min-h-dvh bg-[#faf9ff] pb-24">
          <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
            <PrepHeader title={title} subtitle={subtitle} onMenu={openMenu} lang={lang} />

            {/* The design shows "45% Completed" over a filled bar. Nothing
                measures that yet, so the bar stays at zero and says why. */}
            <div className="border-b border-[#eeebf8] px-5 pt-4 pb-4">
              <p className="text-[13px] font-semibold" style={{ color: MUTED }}>
                {hi ? 'अभी शुरू नहीं किया' : 'Not started yet'}
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-[#efecfa]">
                <div className="h-2 w-0 rounded-full" style={{ background: VIOLET }} />
              </div>
            </div>

            <section className="mt-5 px-5">
              <h2 className="flex items-center gap-2 text-[17px] font-extrabold" style={{ color: INK }}>
                <span aria-hidden>📖</span>
                {hi ? 'अध्ययन एवं अभ्यास' : 'Study & Practice'}
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
                {TILES.map((tile) => (
                  <Link
                    key={tile.label.en + tile.href}
                    href={tile.href}
                    className="flex flex-col items-center rounded-2xl p-4 text-center"
                    style={{ backgroundColor: tile.tint }}
                  >
                    <span aria-hidden className="text-[30px] leading-none">
                      {tile.icon}
                    </span>
                    <span className="mt-3 text-[14px] font-bold" style={{ color: INK }}>
                      {t(tile.label, lang)}
                    </span>
                    <span className="mt-1 text-[11.5px] leading-snug" style={{ color: MUTED }}>
                      {t(tile.sub, lang)}
                    </span>
                    <span
                      aria-hidden
                      className="mt-3 grid h-7 w-7 place-items-center rounded-full"
                      style={{ background: tile.dot }}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M4 10h11m0 0-4-4m4 4-4 4"
                          stroke="#fff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>

              <Link
                href="/notes"
                className="mt-3 flex items-center gap-3 rounded-2xl bg-[#e9f7f3] p-4"
              >
                <span aria-hidden className="text-[24px]">
                  Σ
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold" style={{ color: INK }}>
                    {hi ? 'सूत्र संग्रह' : 'Formula Sheet'}
                  </span>
                  <span className="block text-[12px]" style={{ color: MUTED }}>
                    {hi ? 'महत्वपूर्ण सूत्र' : 'Important Formulas'}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ background: '#0d9488' }}
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 10h11m0 0-4-4m4 4-4 4"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </section>

            <section className="mt-7 px-5">
              <h2 className="flex items-center gap-2 text-[17px] font-extrabold" style={{ color: INK }}>
                <span aria-hidden>🔖</span>
                {hi ? 'तैयारी जारी रखें' : 'Continue Learning'}
              </h2>
              <div className="mt-3">
                <EmptyNote>
                  {hi
                    ? 'अभी तक कोई अध्याय शुरू नहीं हुआ। ऊपर से कुछ भी खोलिए — जहाँ छोड़ेंगे, वहीं से यहाँ दिखेगा।'
                    : 'No chapter started yet. Open anything above, and where you left off will appear here.'}
                </EmptyNote>
              </div>
            </section>
          </div>

          <PrepNav active="/" lang={lang} />
        </div>
      )}
    </PrepShell>
  );
}

/**
 * `useSearchParams` needs a Suspense boundary in an exported app, or the build
 * refuses to prerender the page at all.
 */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <PrepDashboard />
    </Suspense>
  );
}
