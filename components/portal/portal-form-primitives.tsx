import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

export const textareaClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

/** Inputs on tinted panels — matches benefits section */
export const inputPanelClass = `${inputClass} bg-white/90`;
export const textareaPanelClass = `${textareaClass} bg-white/90`;

/** TechRecruit brand — use sparingly for accents */
export const brand = {
  softBg: "bg-[#7107E7]/[0.04]",
  softBorder: "border-[#7107E7]/15",
  accentBorderL: "border-l-[3px] border-l-[#7107E7]/70",
  bullet: "text-[#7107E7]",
  ring: "ring-1 ring-[#7107E7]/10",
} as const;

/** `overflow-visible` so FieldLabel tooltips above the panel aren’t clipped. */
const sectionPanelClass = `overflow-visible rounded-xl border border-zinc-200/90 ${brand.accentBorderL} ${brand.softBg} p-4 sm:p-5 ${brand.ring}`;

export const labelClass = "mb-1.5 block text-xs font-medium text-zinc-800";

export const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-xl border border-[#7107E7]/12 bg-white/95 px-2.5 py-1.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-[#7107E7]/8";

export const emptyStateClass = `rounded-xl border border-dashed ${brand.softBorder} bg-white/70 px-3 py-4 text-sm text-zinc-500`;

export const addButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#7107E7]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#5b06c2] shadow-sm transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/8";

export function SectionPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${sectionPanelClass} ${className}`}>{children}</div>;
}

/** Nested cluster inside a SectionPanel — groups related inputs with a light frame and label. */
export const fieldGroupClass =
  "rounded-xl border border-zinc-200/75 bg-white/85 p-4 shadow-sm shadow-zinc-200/25 sm:p-5";

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
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

/** Inner form card — matches VacancyPreviewEditor */
export const formCardClass =
  "overflow-visible rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/40";

const stepPillStripBaseClass =
  "flex min-w-0 flex-wrap items-center justify-start gap-2 gap-y-2 rounded-xl bg-zinc-100/70 px-0 py-2.5";

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
  return `inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-full border px-3 py-0 text-xs font-semibold leading-none outline-none transition focus-visible:ring-2 focus-visible:ring-[#7107E7]/40 focus-visible:ring-offset-2 ${
    active
      ? "border-[#7107E7] bg-[#7107E7] text-white shadow-sm shadow-[#7107E7]/25"
      : "border-zinc-200/90 bg-white text-zinc-600 shadow-sm hover:border-zinc-300/80 hover:bg-zinc-50 hover:text-zinc-900"
  }`;
}
