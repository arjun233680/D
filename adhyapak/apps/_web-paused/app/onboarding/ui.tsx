'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The furniture every onboarding step shares.
 *
 * Three screens ask three questions with the same frame: a back arrow, a
 * progress rail, a heading over an illustration, a list, and a violet button
 * pinned to the bottom. Kept here rather than copied so the second and third
 * steps cannot drift from the first — which is exactly what happens when the
 * only thing holding a flow together is that somebody pasted it carefully.
 *
 * Colours are literal rather than tokens from globals.css for the reason given
 * on the sign-in page: those tokens are the green Adhyapak brand that governs
 * the rest of the app, and this flow is the violet one from the design.
 */

export const VIOLET = '#6d4aed';
export const VIOLET_LIGHT = '#8b5cf6';
export const INK = '#1e1b4b';
export const MUTED = '#6b7280';
export const LINE = '#e8e4f6';

export const gradient = `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})`;

/** The three dots at the top. Filled behind you, ringed ahead. */
export function StepRail({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
      {([1, 2, 3] as const).map((n) => {
        const done = n < step;
        const here = n === step;
        return (
          <div key={n} className="flex items-center gap-1.5">
            {n > 1 ? (
              <span
                aria-hidden
                className="h-[2px] w-7 rounded-full"
                style={{ background: n <= step ? VIOLET : '#ded9f3' }}
              />
            ) : null}
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold"
              style={
                done || here
                  ? { background: VIOLET, color: '#fff' }
                  : { background: '#efecfa', color: '#a8a3bd' }
              }
            >
              {done ? <Tick /> : n}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      /*
       * History first, so the back arrow undoes the step the learner actually
       * took. `fallback` covers the learner who landed here directly — from a
       * bookmark, or a reload after the tab was restored — where going "back"
       * would leave the app entirely.
       */
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      aria-label="Back"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#eceaf6] bg-white"
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
  );
}

export function Tick({ small = false }: { small?: boolean }) {
  const s = small ? 10 : 13;
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.4 5.4 10.3 11.5 4.2"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Arrow() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The cap-and-books mark that sits in every step's top corner. */
export function BooksArt({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none ${className}`}
      viewBox="0 0 180 130"
      fill="none"
    >
      <circle cx="140" cy="30" r="34" fill="#efecfd" />
      <circle cx="96" cy="72" r="16" fill="#f3f0fd" />
      <path d="M60 74c-9-3-14-11-12-19 9-1 17 4 19 12" fill="#34c77b" opacity=".8" />
      <rect x="66" y="86" width="96" height="14" rx="4" fill="#7c5cf7" />
      <rect x="66" y="86" width="96" height="5" rx="2.5" fill="#9b83fa" />
      <rect x="72" y="100" width="88" height="14" rx="4" fill="#fbc02d" />
      <rect x="72" y="100" width="88" height="5" rx="2.5" fill="#fdd460" />
      <rect x="62" y="114" width="102" height="13" rx="4" fill="#eef1fb" />
      <path d="M113 40 158 56l-45 16-45-16 45-16Z" fill="#5b46d6" />
      <path d="M113 58v22" stroke="#4a37bd" strokeWidth="3" strokeLinecap="round" />
      <path d="M88 64v13c0 5 11 9 25 9s25-4 25-9V64l-25 9-25-9Z" fill="#6d4aed" />
    </svg>
  );
}

/** The tip strip above the button: "you can change this later". */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f4f1fd] px-4 py-3.5">
      <span aria-hidden className="text-[15px] leading-none">
        💡
      </span>
      <p className="text-[12.5px] leading-relaxed text-[#5c5875]">{children}</p>
    </div>
  );
}

/** The violet action pinned to the foot of every step. */
export function ContinueBar({
  onClick,
  disabled,
  busy,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  busy?: boolean;
  label: string;
  /** Anything shown above the button — an error, a selection summary. */
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-[#eeebf8] bg-[#faf9ff]/95 backdrop-blur">
      <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px] px-5 py-4">
        {children}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,74,237,0.9)] disabled:opacity-45 disabled:shadow-none"
          style={{ background: gradient }}
        >
          {label}
          <Arrow />
        </button>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

/** A red line that says what failed, in the learner's language. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-3 rounded-xl bg-[#fdecec] px-3 py-2 text-[12.5px] leading-relaxed text-[#b42318]"
    >
      {children}
    </p>
  );
}

/**
 * The strip of already-chosen exams that steps 2 and 3 carry at the top.
 *
 * Not decoration: the question underneath it is "which level", and the honest
 * answer depends on which exams are in play. Showing them keeps the learner
 * from having to remember what they tapped on the previous screen.
 */
export function ChosenExams({
  items,
  title,
}: {
  items: { id: string; shortName: string; subtitle: string; emoji: string; color: string }[];
  title?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-5 rounded-2xl bg-[#f4f1fd] p-3">
      {title ? (
        <p className="mb-2 px-1 text-[12.5px] font-bold" style={{ color: VIOLET }}>
          {title}
        </p>
      ) : null}
      <div className="rail flex gap-3">
        {items.map((e) => (
          <div key={e.id} className="flex min-w-[150px] shrink-0 items-start gap-2.5">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px]"
              style={{ backgroundColor: `${e.color}1a` }}
              aria-hidden
            >
              {e.emoji}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-[14px] font-bold" style={{ color: e.color }}>
                  {e.shortName}
                </span>
                <span
                  aria-hidden
                  className="grid h-[15px] w-[15px] place-items-center rounded-full"
                  style={{ background: VIOLET }}
                >
                  <Tick small />
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-[#6b7280]">
                {e.subtitle}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
