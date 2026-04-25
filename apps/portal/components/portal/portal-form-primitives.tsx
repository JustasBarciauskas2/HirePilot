import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/45 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500";

export const textareaClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/45 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500";

/** Inputs on tinted panels — matches benefits section */
export const inputPanelClass = `${inputClass} bg-white/90 dark:bg-slate-800/45`;
export const textareaPanelClass = `${textareaClass} bg-white/90 dark:bg-slate-800/45`;

/** TechRecruit brand — use sparingly for accents */
export const brand = {
  softBg: "bg-[#2563EB]/[0.04]",
  softBorder: "border-[#2563EB]/15",
  accentBorderL: "border-l-[3px] border-l-[#2563EB]/70",
  bullet: "text-[#2563EB]",
  ring: "ring-1 ring-[#2563EB]/10",
} as const;

/** `overflow-visible` so FieldLabel tooltips above the panel aren’t clipped. */
const sectionPanelClass = `overflow-visible rounded-xl border border-zinc-200/90 dark:border-slate-500/25 ${brand.accentBorderL} ${brand.softBg} dark:bg-slate-800/35 p-4 sm:p-5 ${brand.ring} dark:ring-slate-600/20`;

export const labelClass =
  "mb-1.5 block text-xs font-medium text-zinc-800 dark:text-slate-200";

export const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-xl border border-[#2563EB]/12 bg-white/95 px-2.5 py-1.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-[#2563EB]/8 dark:border-sky-500/20 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-sky-500/15";

export const emptyStateClass = `rounded-xl border border-dashed ${brand.softBorder} bg-white/70 px-3 py-4 text-sm text-zinc-500 dark:border-slate-500/30 dark:bg-slate-800/30 dark:text-slate-400`;

export const addButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#2563EB]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#1d4ed8] shadow-sm transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/8 dark:border-sky-500/30 dark:bg-slate-800/50 dark:text-sky-300 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/10";

export function SectionPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${sectionPanelClass} ${className}`}>{children}</div>;
}

/** Nested cluster inside a SectionPanel — groups related inputs with a light frame and label. */
export const fieldGroupClass =
  "rounded-xl border border-zinc-200/75 bg-white/85 p-4 shadow-sm shadow-zinc-200/25 sm:p-5 dark:border-slate-500/25 dark:bg-slate-800/40 dark:shadow-none";

export function FieldGroup({
  title,
  children,
  className = "",
}: {
  /** Omit when the group is only a visual frame (e.g. under SectionPanel + FieldLabel). */
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${fieldGroupClass} ${className}`}>
      {title ? (
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

/** Inner form card — matches VacancyPreviewEditor */
export const formCardClass =
  "overflow-visible rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/40 dark:border-slate-500/25 dark:bg-slate-800/40 dark:shadow-[0_8px_32px_-16px_rgba(0,0,0,0.35)]";

const stepPillStripBaseClass =
  "flex min-w-0 flex-wrap items-center justify-start gap-2 gap-y-2 rounded-xl bg-zinc-100/70 px-0 py-2.5 dark:bg-slate-800/50";

/**
 * Pill row — `w-fit` so the tint only wraps the controls (avoids a full-width bar that looks misaligned).
 * Inside SectionPanel, pills line up with inputs (same padding). When the strip is a direct child of the
 * white form card, use `stepPillStripInFormCardClass` so the first pill matches section field insets.
 */
export const stepPillStripClass = `${stepPillStripBaseClass} w-fit max-w-full`;

/** Matches SectionPanel: 3px accent border + p-4 sm:p-5 inner padding (same as inputs). */
export const stepPillStripInFormCardClass = `${stepPillStripBaseClass} w-full pl-[calc(0.1875rem+1rem)] sm:pl-[calc(0.1875rem+1.25rem)]`;

export function stepPillClass(active: boolean): string {
  /** Same border width + min-height in both states so pills line up (ring/shadow-only inactive was shifting visually). */
  return `inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-full border px-3 py-0 text-xs font-semibold leading-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
    active
      ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/25"
      : "border-zinc-200/90 bg-white text-zinc-600 shadow-sm hover:border-zinc-300/80 hover:bg-zinc-50 hover:text-zinc-900 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
  }`;
}
