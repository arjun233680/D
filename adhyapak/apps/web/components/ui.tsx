'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ContentAccess } from '@adhyapak/core';
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
