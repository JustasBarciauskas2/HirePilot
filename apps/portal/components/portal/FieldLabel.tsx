"use client";

import { Info } from "@phosphor-icons/react";
import { useId } from "react";

/**
 * Label + info icon. Hover or keyboard focus shows the hint immediately (CSS), not the delayed browser `title` tooltip.
 */
export function FieldLabel({ label, hint }: { label: string; hint: string }) {
  const tipId = useId();

  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-800 dark:text-slate-200">
      <span>{label}</span>
      <span className="group relative inline-flex shrink-0">
        <button
          type="button"
          className="inline-flex cursor-help rounded p-0.5 text-zinc-400 transition hover:text-[#2563EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 dark:text-slate-500 dark:hover:text-sky-400"
          aria-describedby={tipId}
          aria-label={`About ${label}`}
        >
          <Info className="h-3.5 w-3.5" weight="regular" aria-hidden />
        </button>
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[200] mb-1.5 w-max max-w-[min(100vw-2rem,22rem)] -translate-x-1/2 whitespace-normal rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-left text-xs font-normal leading-snug text-zinc-700 shadow-lg ring-1 ring-black/[0.06] opacity-0 transition-opacity duration-75 ease-out group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-600/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-900/40"
        >
          {hint}
        </span>
      </span>
    </span>
  );
}
