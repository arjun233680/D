'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';

/**
 * The page for a link that no longer resolves.
 *
 * Next ships a default, and it reads "404: This page could not be found." in
 * English on an app whose every other string carries both languages. It went
 * unnoticed because it is not a string in this repository — the bilingual guard
 * scans our source and Next's default is not in it.
 *
 * It also stopped being a rare screen. Emptying the bundled lessons and batches
 * removed every `/videos/<id>` and `/batches/<id>` route with them, so anyone
 * holding an old link — a bookmark, a shared URL, a search result — arrives
 * here. Telling them what happened, in their language, with the way onward, is
 * the least this page owes them.
 */
export default function NotFound() {
  const { lang } = useStore();
  const hi = lang === 'hi';

  return (
    <div className="mx-auto max-w-lg px-4 pt-16 pb-20 text-center sm:px-0">
      <p className="text-[52px] leading-none font-extrabold text-[var(--color-line-strong)]">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">
        {hi ? 'यह पृष्ठ नहीं मिला' : 'This page could not be found'}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)]">
        {hi
          ? 'हो सकता है यह हटा दिया गया हो या पता बदल गया हो। प्रश्न बैंक, नोट्स और टेस्ट सीरीज़ नीचे से खुल जाएँगे।'
          : 'It may have been removed, or the address may have changed. The question bank, notes and test series are all reachable below.'}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white"
        >
          {hi ? 'होम' : 'Home'}
        </Link>
        {[
          { href: '/practice', label: hi ? 'अभ्यास' : 'Practice' },
          { href: '/tests', label: hi ? 'टेस्ट सीरीज़' : 'Tests' },
          { href: '/notes', label: hi ? 'नोट्स' : 'Notes' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-[13px] font-bold transition-colors hover:border-[var(--color-line-strong)]"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
