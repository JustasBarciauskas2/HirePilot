"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

export type IntakeCalScale = "week" | "month" | "year";

const WEEKDAYS_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Neutral panel styles — aligned with `PortalAnalyticsPanel` cards. */
const CAL_CARD =
  "rounded-2xl border border-zinc-200/80 bg-zinc-50/80 dark:border-slate-500/25 dark:bg-slate-800/40" as const;
const CAL_MUTED = "text-zinc-500 dark:text-slate-400" as const;
const CAL_INNER =
  "rounded-xl border border-zinc-200/70 bg-white/90 dark:border-slate-500/25 dark:bg-slate-800/30" as const;

/** Matches portal intake bar chart: `bg-[#2563EB]` (light) / `dark:bg-sky-500` (dark). */
const HEAT_RGB_LIGHT = { r: 37, g: 99, b: 235 } as const;
const HEAT_RGB_DARK = { r: 14, g: 165, b: 233 } as const; // sky-500

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
}

function addYears(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setFullYear(x.getFullYear() + n);
  return x;
}

/** Local calendar day key. */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFutureLocalDay(d: Date): boolean {
  return localDateKey(d) > localDateKey(new Date());
}

function isLocalToday(d: Date): boolean {
  return localDateKey(d) === localDateKey(new Date());
}

function anchorForScale(scale: IntakeCalScale, d: Date): Date {
  if (scale === "week") return startOfWeekMonday(d);
  if (scale === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/** Latest period start the user is allowed to navigate to (week / month / year of “today”). */
function maxCursorForScale(scale: IntakeCalScale, today = new Date()): Date {
  if (scale === "week") return startOfWeekMonday(today);
  if (scale === "month") return new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  return new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function countForDay(dayCounts: ReadonlyMap<string, number>, d: Date): number {
  return dayCounts.get(localDateKey(d)) ?? 0;
}

function sumRange(dayCounts: ReadonlyMap<string, number>, start: Date, endExclusive: Date): number {
  let n = 0;
  for (const [k, c] of dayCounts) {
    const t = Date.parse(k + "T12:00:00");
    if (Number.isNaN(t)) continue;
    if (t >= +start && t < +endExclusive) n += c;
  }
  return n;
}

/**
 * Intake “heat” fill — same brand blues as the weekly bar chart, not flat grey.
 */
function heatFillRgba(n: number, max: number, isDark: boolean): string | undefined {
  if (n <= 0 || max <= 0) return undefined;
  const t = Math.min(1, n / max);
  const { r, g, b } = isDark ? HEAT_RGB_DARK : HEAT_RGB_LIGHT;
  const a = isDark ? 0.1 + t * 0.42 : 0.08 + t * 0.38;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/** Month day cell background (complements `heatFillRgba`). */
function monthCellHeatStyle(c: number, max: number, isDark: boolean): CSSProperties | undefined {
  if (c <= 0) return undefined;
  const t = Math.min(1, c / max);
  const { r, g, b } = isDark ? HEAT_RGB_DARK : HEAT_RGB_LIGHT;
  const a1 = (isDark ? 0.06 : 0.05) + t * 0.28;
  const a2 = (isDark ? 0.12 : 0.1) + t * 0.38;
  const end = `rgba(${r}, ${g}, ${b}, ${a2.toFixed(3)})`;
  if (isDark) {
    return {
      background: `linear-gradient(165deg, rgb(15 23 42) 0%, rgba(${r},${g},${b},${a1.toFixed(3)}) 40%, ${end} 100%)`,
    };
  }
  return { background: `linear-gradient(145deg, rgb(255 255 255) 0%, ${end} 100%)` };
}

/** Bar fill inside year month tiles (light blue lift, not neutral grey). */
function yearMonthBarBackground(count: number, maxMonth: number, isDark: boolean): string {
  if (count === 0) return "transparent";
  const t = count / maxMonth;
  const { r, g, b } = isDark ? HEAT_RGB_DARK : HEAT_RGB_LIGHT;
  if (isDark) {
    const a1 = 0.08 + 0.2 * t;
    const a2 = 0.12 + 0.35 * t;
    return `linear-gradient(180deg, rgba(${r},${g},${b},${a1.toFixed(3)}), rgba(${r},${g},${b},${a2.toFixed(3)}))`;
  }
  const a1 = 0.07 + 0.18 * t;
  const a2 = 0.1 + 0.28 * t;
  return `linear-gradient(180deg, rgba(${r},${g},${b},${a1.toFixed(3)}), rgba(${r},${g},${b},${a2.toFixed(3)}))`;
}

/**
 * `document.documentElement` has `class="dark"` (Tailwind) — used so inline heat matches theme.
 * Avoids flash: initial render assumes light, then effect updates.
 */
function useHtmlDarkClass(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => {
      if (typeof document === "undefined") return;
      setDark(document.documentElement.classList.contains("dark"));
    };
    read();
    const o = new MutationObserver(read);
    o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => o.disconnect();
  }, []);
  return dark;
}

type Props = {
  dayCounts: ReadonlyMap<string, number>;
  className?: string;
};

export function IntakeCalendarBlock({ dayCounts, className = "" }: Props) {
  const [scale, setScale] = useState<IntakeCalScale>("month");
  const [cursor, setCursor] = useState<Date>(() => anchorForScale("month", new Date()));

  useEffect(() => {
    setCursor(anchorForScale(scale, new Date()));
  }, [scale]);

  useEffect(() => {
    const mc = maxCursorForScale(scale, new Date());
    setCursor((c) => (c.getTime() > mc.getTime() ? new Date(mc) : c));
  }, [scale]);

  const maxDayInData = useMemo(() => {
    let m = 0;
    for (const c of dayCounts.values()) m = Math.max(m, c);
    return m > 0 ? m : 1;
  }, [dayCounts]);

  const canGoNext = useMemo(() => {
    const now = new Date();
    const mc = maxCursorForScale(scale, now);
    if (scale === "week") return addDays(cursor, 7).getTime() <= mc.getTime();
    if (scale === "month") return addMonths(cursor, 1).getTime() <= mc.getTime();
    return cursor.getFullYear() < now.getFullYear();
  }, [scale, cursor]);

  const atCurrentPeriod = useMemo(() => {
    const t = new Date();
    if (scale === "week")
      return localDateKey(startOfWeekMonday(cursor)) === localDateKey(startOfWeekMonday(t));
    if (scale === "month")
      return cursor.getFullYear() === t.getFullYear() && cursor.getMonth() === t.getMonth();
    return cursor.getFullYear() === t.getFullYear();
  }, [scale, cursor]);

  const goPrev = useCallback(() => {
    setCursor((c) => {
      if (scale === "week") return addDays(c, -7);
      if (scale === "month") return addMonths(c, -1);
      return addYears(c, -1);
    });
  }, [scale]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    const mc = maxCursorForScale(scale, new Date());
    setCursor((c) => {
      if (scale === "week") {
        const n = addDays(c, 7);
        return n.getTime() > mc.getTime() ? new Date(mc) : n;
      }
      if (scale === "month") {
        const n = addMonths(c, 1);
        return n.getTime() > mc.getTime() ? new Date(mc) : n;
      }
      const n = addYears(c, 1);
      const yMax = new Date().getFullYear();
      return n.getFullYear() > yMax ? new Date(mc) : n;
    });
  }, [scale, canGoNext]);

  const goToday = useCallback(() => {
    setCursor(anchorForScale(scale, new Date()));
  }, [scale]);

  const headerLabel = useMemo(() => {
    if (scale === "week") {
      const a = cursor;
      const b = addDays(a, 6);
      const left = a.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const right = b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return `${left} – ${right}`;
    }
    if (scale === "month") {
      return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    return String(cursor.getFullYear());
  }, [scale, cursor]);

  const weekTotal = useMemo(() => {
    if (scale !== "week") return 0;
    const a = cursor;
    const b = addDays(a, 7);
    return sumRange(dayCounts, a, b);
  }, [scale, cursor, dayCounts]);

  return (
    <div className={`${CAL_CARD} p-3 sm:p-4 ${className}`.trim()}>
      <p className={`mb-2 text-[11px] ${CAL_MUTED}`}>
        Only past and today — you can’t browse future dates.
      </p>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50/90 p-0.5 dark:border-slate-500/30 dark:bg-slate-800/50">
            {(
              [
                ["week", "Week"],
                ["month", "Month"],
                ["year", "Year"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setScale(v)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  scale === v
                    ? "bg-white text-[#0B1F3A] shadow-sm ring-1 ring-zinc-200/80 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600/60"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <p className="min-w-0 flex-1 text-center text-sm font-medium text-zinc-900 dark:text-slate-100 sm:order-2 sm:flex-initial sm:px-2">
              {headerLabel}
              {scale === "week" ? (
                <span className={`ml-2 tabular-nums text-xs font-normal ${CAL_MUTED}`}>· {weekTotal} total</span>
              ) : null}
            </p>
            <div className="flex w-full items-center justify-center gap-0.5 sm:order-3 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-zinc-200 bg-zinc-50/90 p-2 text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-slate-500/30 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800/90"
                aria-label="Previous"
              >
                <CaretLeft className="h-4 w-4" weight="bold" />
              </button>
              <button
                type="button"
                onClick={goToday}
                disabled={atCurrentPeriod}
                className="rounded-lg border border-zinc-200 bg-zinc-50/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/30 dark:bg-slate-800/80 dark:text-slate-200 dark:enabled:hover:bg-slate-800/90"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="rounded-lg border border-zinc-200 bg-zinc-50/90 p-2 text-zinc-800 shadow-sm transition enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/30 dark:bg-slate-800/80 dark:text-slate-200 dark:enabled:hover:bg-slate-800/90"
                aria-label="Next"
              >
                <CaretRight className="h-4 w-4" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {scale === "week" ? (
          <WeekGrid cursor={cursor} dayCounts={dayCounts} maxDayInData={maxDayInData} />
        ) : null}
        {scale === "month" ? (
          <MonthGrid cursor={cursor} dayCounts={dayCounts} maxDayInData={maxDayInData} />
        ) : null}
        {scale === "year" ? <YearGrid cursor={cursor} dayCounts={dayCounts} /> : null}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor,
  dayCounts,
  maxDayInData,
}: {
  cursor: Date;
  dayCounts: ReadonlyMap<string, number>;
  maxDayInData: number;
}) {
  const dark = useHtmlDarkClass();
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {WEEKDAYS_MON_FIRST.map((dow, i) => {
        const d = addDays(cursor, i);
        const isFuture = isFutureLocalDay(d);
        const isToday = isLocalToday(d);
        const c = isFuture ? 0 : countForDay(dayCounts, d);
        const fill = isFuture ? undefined : heatFillRgba(c, maxDayInData, dark);
        return (
          <div
            key={dow + localDateKey(d)}
            className={`group flex min-h-[4.5rem] flex-col rounded-xl border p-2 transition ${
              isFuture
                ? "border-dashed border-zinc-200/60 bg-zinc-100/50 opacity-70 dark:border-slate-500/35 dark:bg-slate-800/25"
                : `border-zinc-200/80 bg-white shadow-sm dark:border-slate-500/30 dark:bg-slate-800/40 ${
                    isToday ? "ring-2 ring-zinc-300/80 ring-offset-1 dark:ring-slate-500/70 dark:ring-offset-0" : ""
                  }`
            }`}
            title={
              isFuture
                ? "Future day"
                : `${c} applicant(s) on ${d.toLocaleDateString()}${isToday ? " (today)" : ""}`
            }
          >
            <span
              className={`text-[10px] font-medium uppercase tracking-wide ${
                isFuture ? CAL_MUTED : isToday ? "text-zinc-700 dark:text-slate-200" : "text-zinc-500 dark:text-slate-400"
              }`}
            >
              {dow}
            </span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                isFuture ? CAL_MUTED : "text-zinc-900 dark:text-slate-100"
              }`}
            >
              {d.getDate()}
            </span>
            <div
              className={`mt-1.5 min-h-9 flex-1 rounded-md border ${
                isFuture
                  ? "border-zinc-200/50 dark:border-slate-600/30"
                  : "border-[#2563EB]/20 dark:border-sky-500/35"
              }`}
              style={{
                background: isFuture
                  ? "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(100,116,139,0.1) 3px, rgba(100,116,139,0.1) 6px)"
                  : fill,
              }}
            />
            <span
              className={`mt-0.5 text-center text-xs font-bold tabular-nums ${
                isFuture ? CAL_MUTED : "text-zinc-800 dark:text-slate-200"
              }`}
            >
              {isFuture ? "—" : c}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  cursor,
  dayCounts,
  maxDayInData,
}: {
  cursor: Date;
  dayCounts: ReadonlyMap<string, number>;
  maxDayInData: number;
}) {
  const dark = useHtmlDarkClass();
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1, 0, 0, 0, 0);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const body = leading + lastDay;
  const rowCount = Math.ceil(body / 7);
  const cellCount = rowCount * 7;
  const cells: ({ type: "pad" } | { type: "day"; d: Date; count: number })[] = [];
  for (let i = 0; i < leading; i++) cells.push({ type: "pad" });
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(y, m, day, 0, 0, 0, 0);
    cells.push({ type: "day", d, count: countForDay(dayCounts, d) });
  }
  while (cells.length < cellCount) cells.push({ type: "pad" });

  return (
    <div className={`${CAL_INNER} p-2 sm:p-3`}>
      <div
        className={`mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase sm:text-xs ${CAL_MUTED}`}
      >
        {WEEKDAYS_MON_FIRST.map((d) => (
          <div key={d} className="py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {cells.map((cell, i) => {
          if (cell.type === "pad")
            return <div key={`pad-${i}`} className="min-h-[2.5rem] rounded-md sm:min-h-[3rem]" aria-hidden />;
          const isFuture = isFutureLocalDay(cell.d);
          const isToday = isLocalToday(cell.d);
          const c = isFuture ? 0 : cell.count;
          return (
            <div
              key={localDateKey(cell.d)}
              className={`group flex min-h-[2.5rem] flex-col items-center justify-between rounded-lg border p-0.5 sm:min-h-[3rem] sm:p-1 ${
                isFuture
                  ? "border-dashed border-zinc-200/60 bg-zinc-50/60 text-zinc-500 opacity-80 dark:border-slate-500/50 dark:bg-slate-900/30 dark:text-slate-400"
                  : isToday
                    ? "border-zinc-400/70 bg-zinc-100/90 ring-1 ring-zinc-300/60 dark:border-slate-500/50 dark:bg-slate-800/70 dark:ring-1 dark:ring-slate-500/50"
                    : "border-zinc-200/50 bg-zinc-50/40 dark:border-slate-500/25 dark:bg-slate-800/30"
              }`}
              style={isFuture ? undefined : c > 0 ? monthCellHeatStyle(c, maxDayInData, dark) : undefined}
              title={isFuture ? "Future" : `${c} applicant(s) on ${cell.d.toLocaleDateString()}`}
            >
              <span
                className={`text-[10px] font-medium tabular-nums sm:text-xs ${
                  isFuture
                    ? CAL_MUTED
                    : isToday
                      ? "text-zinc-900 dark:text-slate-100"
                      : "text-zinc-800 dark:text-slate-200"
                }`}
              >
                {cell.d.getDate()}
              </span>
              <span
                className={`text-[10px] font-bold tabular-nums sm:text-xs ${
                  isFuture
                    ? CAL_MUTED
                    : isToday
                      ? "text-zinc-800 dark:text-slate-200"
                      : "text-zinc-700 dark:text-slate-300"
                }`}
              >
                {isFuture ? "—" : c}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({ cursor, dayCounts }: { cursor: Date; dayCounts: ReadonlyMap<string, number> }) {
  const dark = useHtmlDarkClass();
  const y = cursor.getFullYear();
  const now = new Date();
  const thisYM = now.getFullYear() * 12 + now.getMonth();

  const months = useMemo(() => {
    const out: { month: number; label: string; count: number; isFuture: boolean }[] = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
      const isFuture = y * 12 + m > thisYM;
      const count = isFuture ? 0 : sumRange(dayCounts, start, end);
      const label = new Date(y, m, 1).toLocaleDateString(undefined, { month: "short" });
      out.push({ month: m, label, count, isFuture });
    }
    return out;
  }, [y, dayCounts, thisYM]);

  const maxMonth = useMemo(() => Math.max(1, ...months.filter((x) => !x.isFuture).map((x) => x.count)), [months]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {months.map(({ month, label, count, isFuture }) => (
        <div
          key={month}
          className={`flex min-h-[4.5rem] flex-col p-2.5 ${
            isFuture
              ? "rounded-xl border border-dashed border-zinc-200/60 bg-zinc-100/30 opacity-60 dark:border-slate-500/35 dark:bg-slate-800/20"
              : `${CAL_CARD} p-2.5 shadow-sm`
          }`}
          title={isFuture ? "Future month" : `${count} applicant(s) in ${label} ${y}`}
        >
          <span className={`text-xs font-semibold ${isFuture ? CAL_MUTED : "text-zinc-900 dark:text-slate-100"}`}>
            {label} {y}
          </span>
          <div
            className={`mt-1 min-h-7 flex-1 rounded-md border ${
              isFuture ? "border-zinc-200/40 dark:border-slate-600/30" : "border-zinc-200/50 dark:border-slate-500/25"
            }`}
            style={{
              background: isFuture
                ? "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(100,116,139,0.1) 3px, rgba(100,116,139,0.1) 6px)"
                : yearMonthBarBackground(count, maxMonth, dark),
            }}
          />
          <span
            className={`mt-1 text-lg font-bold tabular-nums ${
              isFuture ? CAL_MUTED : "text-zinc-900 dark:text-slate-100"
            }`}
          >
            {isFuture ? "—" : count}
          </span>
        </div>
      ))}
    </div>
  );
}
