'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { t, type ContentAccess, type ElectiveError } from '@adhyapak/core';
import { useStore } from '@/lib/store';

/* Small presentational atoms shared by every screen. */

export function SectionHeader({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  const { lang } = useStore();
  return (
    <div className="mb-3 flex items-end justify-between gap-4 px-4 sm:px-0">
      <div className="min-w-0">
        <h2 className="truncate text-[17px] font-bold text-[var(--color-body)] sm:text-xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
        >
          {action ?? (lang === 'hi' ? 'सभी देखें' : 'See all')}
        </Link>
      ) : null}
    </div>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="rail flex gap-3 px-4 pb-1 sm:px-0">
      {children}
      <div className="w-1 shrink-0 sm:hidden" aria-hidden />
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'warning' | 'info' | 'success';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-[var(--color-surface-alt)] text-[var(--color-muted)] border-[var(--color-line)]',
    brand: 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)] border-transparent',
    accent: 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-transparent',
    danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-transparent',
    warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-transparent',
    info: 'bg-[var(--color-info-light)] text-[var(--color-info)] border-transparent',
    success: 'bg-[var(--color-success-light)] text-[var(--color-success)] border-transparent',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function AccessBadge({ access, lang }: { access: ContentAccess; lang: 'en' | 'hi' }) {
  if (access === 'free') {
    return <Badge tone="brand">{lang === 'hi' ? 'निःशुल्क' : 'Free'}</Badge>;
  }
  if (access === 'plus') {
    return <Badge tone="accent">Plus</Badge>;
  }
  return <Badge tone="warning">Iconic</Badge>;
}

export function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
      {label}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger' | 'accent' | 'brand';
}) {
  const colors: Record<string, string> = {
    neutral: 'text-[var(--color-body)]',
    success: 'text-[var(--color-success)]',
    danger: 'text-[var(--color-danger)]',
    accent: 'text-[var(--color-accent)]',
    brand: 'text-[var(--color-brand)]',
  };
  return (
    <div className="card px-3 py-3 text-center">
      <div className={`text-lg font-extrabold tabular-nums sm:text-xl ${colors[tone]}`}>{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-[var(--color-muted)]">{label}</div>
    </div>
  );
}

export function ProgressBar({ value, color = 'var(--color-brand)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

/**
 * Shown where a syllabus would be, when the paper has an elective and we do not
 * know which subject the learner sits.
 *
 * This is the visible half of `PaperSubjects` being a result type. HTET Levels
 * 2 and 3 are a different paper for each of twelve (or twenty-one) subjects, so
 * guessing one would show most candidates somebody else's syllabus and quietly
 * miscount their practice. Asking is the only correct behaviour.
 */
export function ElectiveNotice({
  error,
  lang,
}: {
  error: ElectiveError;
  lang: 'en' | 'hi';
}) {
  const hi = lang === 'hi';
  const groupName = error.kind === 'unknown-group' ? undefined : error.group?.name;

  const body =
    error.kind === 'not-in-group'
      ? hi
        ? 'आपका चुना हुआ विषय इस पेपर में उपलब्ध नहीं है। कृपया दोबारा चुनें।'
        : 'The subject saved on your profile is not offered for this paper. Please choose again.'
      : error.kind === 'unknown-group'
        ? hi
          ? 'इस पेपर का विषय विवरण अनुपलब्ध है। हमें इसे ठीक करना होगा।'
          : 'This paper is missing its subject list — that is a bug on our side, not yours.'
        : hi
          ? 'यह पेपर हर अभ्यर्थी के लिए अलग होता है। अपना विषय चुनिए, फिर हम उसी का सिलेबस दिखाएँगे।'
          : 'This paper differs for every candidate. Pick your subject and we will show that syllabus.';

  return (
    <div className="card flex flex-col items-start gap-3 p-5">
      <div>
        <h3 className="text-base font-bold">
          {hi ? 'पहले अपना विषय चुनें' : 'Choose your subject first'}
          {groupName ? ` — ${t(groupName, lang)}` : ''}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p>
      </div>
      {error.kind !== 'unknown-group' ? (
        <Link
          href="/goal"
          className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[13px] font-bold text-white"
        >
          {hi ? 'विषय चुनें' : 'Choose subject'}
        </Link>
      ) : null}
    </div>
  );
}

/** Colour-block thumbnail. No remote images, so cards never wait on a network. */
export function Thumb({
  color,
  emoji,
  ratio = 'aspect-video',
  children,
}: {
  color: string;
  emoji: string;
  ratio?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative ${ratio} w-full overflow-hidden rounded-xl`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 55%, #0b1120 190%)` }}
    >
      <span className="absolute right-3 bottom-2 text-3xl opacity-90 select-none">{emoji}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------- async screen states */

/**
 * The three states every database-backed screen has to handle.
 *
 * `AsyncSection` renders skeletons while loading, an error with a retry button
 * when the call failed, an empty state when the query legitimately returned
 * nothing, and the children only when there is something to show. Screens get
 * all four by wrapping their content instead of by remembering to write them.
 */
export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--color-surface-alt)] ${className}`}
      aria-hidden
    />
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel: string;
}) {
  return (
    <div
      role="alert"
      className="card flex flex-col items-center gap-2 px-6 py-12 text-center"
    >
      <div className="text-4xl">⚠️</div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full bg-[var(--color-ink)] px-5 py-2 text-[13px] font-bold text-white"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AsyncSection<T>({
  state,
  lang,
  empty,
  skeleton,
  children,
}: {
  state: { data: T | undefined; loading: boolean; error: Error | null; retry: () => void };
  lang: 'en' | 'hi';
  /** Shown when the call succeeded and there is genuinely nothing to display. */
  empty: { icon: string; title: string; body: string };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const hi = lang === 'hi';

  if (state.loading && state.data === undefined) {
    return (
      <div aria-busy="true" aria-live="polite">
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        )}
      </div>
    );
  }

  if (state.error && state.data === undefined) {
    return (
      <ErrorState
        title={hi ? 'लोड नहीं हो सका' : 'Could not load'}
        body={
          hi
            ? 'सामग्री लोड नहीं हो पाई। कृपया दोबारा प्रयास करें।'
            : 'That content did not load. Please try again.'
        }
        onRetry={state.retry}
        retryLabel={hi ? 'दोबारा प्रयास करें' : 'Try again'}
      />
    );
  }

  const data = state.data;
  const isEmpty =
    data === undefined || data === null || (Array.isArray(data) && data.length === 0);
  if (isEmpty) return <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />;

  return <>{children(data as T)}</>;
}
