'use client';

import type { Lang, SolutionFilter, SolutionFilterOption } from '@adhyapak/core';

/**
 * All / Correct / Incorrect / Unattempted, with a count on each.
 *
 * One control for every solutions list — practice and mock, on both apps — so
 * the chips read the same and the counts come from the same place as the
 * filtering. A chip with nothing behind it is disabled rather than hidden:
 * "Incorrect (0)" is a result worth seeing, and a chip that vanished would move
 * the others under the reader's cursor between one sitting and the next.
 */

const TONE: Record<SolutionFilter, { on: string; dot: string }> = {
  all: { on: 'var(--color-ink)', dot: 'var(--color-muted)' },
  correct: { on: 'var(--color-success)', dot: 'var(--color-success)' },
  incorrect: { on: 'var(--color-danger)', dot: 'var(--color-danger)' },
  unattempted: { on: 'var(--color-muted)', dot: 'var(--color-muted)' },
};

export function SolutionFilterChips({
  options,
  value,
  onChange,
  lang,
}: {
  options: SolutionFilterOption[];
  value: SolutionFilter;
  onChange: (filter: SolutionFilter) => void;
  lang: Lang;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const active = option.value === value;
        const empty = option.count === 0;
        return (
          <button
            key={option.value}
            type="button"
            disabled={empty}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
              active
                ? 'border-transparent text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-line-strong)]'
            } ${empty ? 'cursor-not-allowed opacity-40' : ''}`}
            style={active ? { background: TONE[option.value].on } : undefined}
          >
            {lang === 'hi' ? option.labelHi : option.labelEn}
            <span
              className="tabular-nums"
              style={active ? undefined : { color: TONE[option.value].dot }}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
