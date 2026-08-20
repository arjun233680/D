'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

/**
 * The chrome the preparation screens share.
 *
 * A dashboard and a PYQ browser sit under one selection — "HTET TGT Science" —
 * and both carry the same drawer, the same title block and the same bottom bar.
 * Kept here so the two cannot drift; the drawer in particular is the only way
 * to reach Syllabus, Bookmarks and Change Selection, and a copy of it that
 * fell behind would quietly strand one of those.
 */

export const VIOLET = '#6d4aed';
export const INK = '#1e1b4b';
export const MUTED = '#6b7280';

const NAV = [
  { href: '/', icon: '🏠', label: { en: 'Home', hi: 'होम' } },
  { href: '/notes', icon: '📖', label: { en: 'Study', hi: 'अध्ययन' } },
  { href: '/tests', icon: '📋', label: { en: 'Tests', hi: 'टेस्ट' } },
  { href: '/analytics/pyq', icon: '📊', label: { en: 'Performance', hi: 'प्रदर्शन' } },
  { href: '/profile', icon: '👤', label: { en: 'Profile', hi: 'प्रोफ़ाइल' } },
] as const;

const DRAWER = [
  {
    heading: { en: 'Analysis & Progress', hi: 'विश्लेषण एवं प्रगति' },
    items: [
      { href: '/goal', icon: '📕', label: { en: 'Syllabus', hi: 'पाठ्यक्रम' }, tint: '#6d4aed' },
      { href: '/analytics/pyq', icon: '🥧', label: { en: 'PYQ Analysis', hi: 'PYQ विश्लेषण' }, tint: '#ea580c' },
      { href: '/analytics/pyq', icon: '📊', label: { en: 'Performance', hi: 'प्रदर्शन' }, tint: '#16a34a' },
    ],
  },
  {
    heading: { en: 'Personal', hi: 'व्यक्तिगत' },
    items: [
      { href: '/practice/bookmarks', icon: '🔖', label: { en: 'Bookmarks', hi: 'बुकमार्क' }, tint: '#6d4aed' },
      { href: '/onboarding/exams?change=1', icon: '⇄', label: { en: 'Change Selection', hi: 'चुनाव बदलें' }, tint: '#0891b2' },
    ],
  },
  {
    heading: { en: 'Account', hi: 'खाता' },
    items: [
      { href: '/doubts', icon: '❓', label: { en: 'Help & Support', hi: 'सहायता' }, tint: '#db2777' },
      { href: '/profile', icon: '⚙️', label: { en: 'Settings', hi: 'सेटिंग्स' }, tint: '#6b7280' },
    ],
  },
] as const;

/**
 * The slide-over menu.
 *
 * A real overlay rather than a permanent column: the design shows it open
 * beside the content on a wide screen, but a phone has no room for both, and
 * the same markup serving both is what keeps the links in one place.
 */
export function Drawer({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'hi';
}) {
  if (!open) return null;
  const hi = lang === 'hi';
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        role="presentation"
      />
      <nav
        aria-label={hi ? 'मेन्यू' : 'Menu'}
        className="relative flex h-full w-[270px] flex-col overflow-y-auto bg-white px-4 pt-5 pb-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={hi ? 'बंद करें' : 'Close menu'}
          className="mb-4 grid h-10 w-10 place-items-center rounded-xl"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 6h14M3 10h14M3 14h14" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {DRAWER.map((group) => (
          <div key={group.heading.en} className="mb-5">
            <p className="mb-2 px-2 text-[12px] font-bold tracking-wide uppercase" style={{ color: VIOLET }}>
              {hi ? group.heading.hi : group.heading.en}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.label.en + item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[#f6f4fd]"
              >
                <span aria-hidden className="text-[18px]" style={{ color: item.tint }}>
                  {item.icon}
                </span>
                <span className="text-[16px] font-medium" style={{ color: INK }}>
                  {hi ? item.label.hi : item.label.en}
                </span>
              </Link>
            ))}
            <div className="mt-4 h-px bg-[#eeebf8]" />
          </div>
        ))}
      </nav>
    </div>
  );
}

/** The bar across the top: menu, an optional back arrow, a title, and actions. */
export function PrepHeader({
  title,
  subtitle,
  onMenu,
  back,
  lang,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
  /** Where the back arrow goes. Omitted on the screen that owns the section. */
  back?: string;
  lang: 'en' | 'hi';
}) {
  const router = useRouter();
  const hi = lang === 'hi';
  return (
    <header className="flex items-start gap-3 px-5 pt-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label={hi ? 'मेन्यू खोलें' : 'Open menu'}
        className="mt-1 grid h-9 w-9 shrink-0 place-items-center"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M3 6h14M3 10h14M3 14h14" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {back ? (
        <button
          type="button"
          onClick={() => router.push(back)}
          aria-label={hi ? 'वापस' : 'Back'}
          className="mt-1 grid h-9 w-9 shrink-0 place-items-center"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12 4 6.5 10 12 16"
              stroke={INK}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] leading-tight font-extrabold" style={{ color: INK }}>
          {title}
        </h1>
        <p className="truncate text-[13px]" style={{ color: MUTED }}>
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <Link href="/explore" aria-label={hi ? 'खोजें' : 'Search'} className="grid h-9 w-9 place-items-center">
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6" stroke={INK} strokeWidth="1.8" />
            <path d="m13.6 13.6 3.4 3.4" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </Link>
        <Link
          href="/current-affairs"
          aria-label={hi ? 'सूचनाएँ' : 'Updates'}
          className="relative grid h-9 w-9 place-items-center"
        >
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 3a5 5 0 0 0-5 5v3l-1.4 2.2h12.8L15 11V8a5 5 0 0 0-5-5Z"
              stroke={INK}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M8.2 16a2 2 0 0 0 3.6 0" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

/** The five-tab bar pinned to the foot of every preparation screen. */
export function PrepNav({ active, lang }: { active: string; lang: 'en' | 'hi' }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eeebf8] bg-white">
      <div className="mx-auto grid max-w-[760px] lg:max-w-[1040px] grid-cols-5">
        {NAV.map((item) => {
          const on = item.href === active;
          return (
            <Link key={item.label.en} href={item.href} className="flex flex-col items-center gap-1 py-2.5">
              <span aria-hidden className={`text-[18px] ${on ? '' : 'opacity-40 grayscale'}`}>
                {item.icon}
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: on ? VIOLET : '#9b96b0' }}
              >
                {lang === 'hi' ? item.label.hi : item.label.en}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** Wraps a screen with the drawer state its header needs. */
export function PrepShell({
  lang,
  children,
}: {
  lang: 'en' | 'hi';
  children: (open: () => void) => ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <Drawer open={menu} onClose={() => setMenu(false)} lang={lang} />
      {children(() => setMenu(true))}
    </>
  );
}

/**
 * What a list says when the question bank has nothing for it yet.
 *
 * Used rather than hiding the section: a learner who taps "Previous Year" and
 * lands on a blank screen assumes the app is broken. Saying the papers are not
 * loaded yet is both true and less alarming.
 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#ded9f3] bg-white px-4 py-6 text-center">
      <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
        {children}
      </p>
    </div>
  );
}
