"use client";

import type { ApplicationPipelineStatus } from "@techrecruit/shared/lib/job-application-shared";

export function allStatusesIncluded(ids: readonly string[]): Set<string> {
  return new Set(ids);
}

function allSelected(s: ReadonlySet<string>, ids: readonly string[]): boolean {
  return s.size === ids.length && ids.every((x) => s.has(x));
}

type StatusFilterChipsProps = {
  statuses: ApplicationPipelineStatus[];
  included: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  id?: string;
  label?: string;
  className?: string;
};

/**
 * Multi-select by pipeline status. At least one status stays selected.
 */
export function StatusFilterChips({
  statuses,
  included,
  onChange,
  id = "status-filter",
  label = "Status",
  className = "",
}: StatusFilterChipsProps) {
  const ids = statuses.map((x) => x.id);

  const toggle = (s: string) => {
    const next = new Set(included);
    if (next.has(s)) {
      if (next.size <= 1) return;
      next.delete(s);
    } else {
      next.add(s);
    }
    onChange(next);
  };

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="text-xs font-medium text-zinc-600 dark:text-slate-400" id={`${id}-label`}>
        {label}
      </p>
      <div
        className="mt-1.5 flex flex-wrap gap-1.5"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {statuses.map((row) => {
          const s = row.id;
          const on = included.has(s);
          return (
            <button
              key={s}
              type="button"
              data-status={s}
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                on
                  ? "border-[#2563EB]/40 bg-[#2563EB]/10 text-[#1d4ed8] dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-300"
                  : "border-zinc-200/90 bg-zinc-50/80 text-zinc-500 hover:border-zinc-300 dark:border-slate-500/30 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-slate-500/50"
              }`}
            >
              {row.label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={allSelected(included, ids)}
          onClick={() => onChange(allStatusesIncluded(ids))}
          className="rounded-lg border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition enabled:hover:border-[#2563EB]/40 enabled:hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/40 dark:text-slate-400 dark:enabled:hover:text-sky-300"
        >
          All
        </button>
      </div>
    </div>
  );
}
