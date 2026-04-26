"use client";

import { IntakeCalendarBlock } from "@/components/portal/IntakeCalendarBlock";
import { StatusFilterChips } from "@/components/portal/StatusFilterChips";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  type ApplicationPipelineStatus,
  type JobApplicationRecordClient,
  orderedStatusFilterOptions,
  pipelineStageSwatchClass,
} from "@techrecruit/shared/lib/job-application-shared";
import { publicJobPageHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { CaretLeft, CaretRight, MagnifyingGlass, Users } from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

type VacancyAgg = {
  key: string;
  jobRef: string;
  jobTitle: string;
  companyName: string;
  count: number;
  job: JobDetail | null;
};

function normVacancyUuid(s: string | undefined | null): string {
  return (s?.trim() ?? "").toLowerCase();
}

function jobFromRefAndId(
  jobRef: string,
  vacancyId: string | undefined,
  jobs: JobDetail[],
): JobDetail | null {
  const vid = vacancyId?.trim();
  if (vid) {
    const byId = jobs.find((j) => normVacancyUuid(j.id) === normVacancyUuid(vid));
    if (byId) return byId;
  }
  return jobs.find((j) => j.ref.trim() === jobRef.trim()) ?? null;
}

/** Start of local Monday for the week containing `d`. */
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

function shortWeekLabel(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Mon–Sun range label for the intake week starting `start` (a Monday 00:00 local). */
function intakeWeekRangeLabel(start: Date): string {
  const end = addDays(start, 6);
  try {
    const a = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const b = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${a} – ${b}`;
  } catch {
    return start.toISOString().slice(0, 10);
  }
}

/** `Date.parse` plus numeric epoch ms (some APIs serialize timestamps as numbers). */
function applicationCreatedAtMs(createdAt: string): number {
  const p = Date.parse(createdAt);
  if (!Number.isNaN(p)) return p;
  if (typeof createdAt === "string" && /^\d+$/.test(createdAt.trim())) {
    const n = Number(createdAt.trim());
    if (n > 0 && n < 1e15) {
      // Heuristic: 13 digits = ms, 10 = seconds
      return n < 1e12 ? n * 1000 : n;
    }
  }
  return NaN;
}

export function PortalAnalyticsPanel({
  user,
  tenantId,
  jobs,
  applicationPipeline,
  onOpenApplicationsForJob,
}: {
  user: User;
  tenantId: string;
  jobs: JobDetail[];
  applicationPipeline: ApplicationPipelineStatus[];
  onOpenApplicationsForJob: (job: JobDetail) => void;
}) {
  const [rows, setRows] = useState<JobApplicationRecordClient[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusIncluded, setStatusIncluded] = useState<Set<string>>(
    () => new Set(applicationPipeline.map((s) => s.id)),
  );
  const [intakeView, setIntakeView] = useState<"chart" | "calendar">("chart");
  const [vacancySearch, setVacancySearch] = useState("");
  const [vacancyListPage, setVacancyListPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/applications", {
        headers: { ...headers },
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        applications?: JobApplicationRecordClient[];
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const base = typeof data.error === "string" ? data.error : `Failed (${res.status})`;
        const extra =
          typeof data.detail === "string" && data.detail.trim() ? `: ${data.detail.trim()}` : "";
        throw new Error(base + extra);
      }
      setRows(data.applications ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load applications.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusAnalyticsOrder = useMemo(
    () => orderedStatusFilterOptions(applicationPipeline, (rows ?? []).map((r) => r.status)),
    [applicationPipeline, rows],
  );

  const statusAnalyticsKey = statusAnalyticsOrder.map((s) => s.id).join("\0");

  useEffect(() => {
    setStatusIncluded(new Set(statusAnalyticsOrder.map((s) => s.id)));
  }, [statusAnalyticsKey]);

  const filteredRows = useMemo(
    () => (rows ?? []).filter((r) => statusIncluded.has(r.status)),
    [rows, statusIncluded],
  );

  const total = filteredRows.length;

  const countsByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of statusAnalyticsOrder) m.set(s.id, 0);
    for (const r of filteredRows) {
      const st = r.status;
      m.set(st, (m.get(st) ?? 0) + 1);
    }
    return m;
  }, [filteredRows, statusAnalyticsOrder]);

  const byVacancy = useMemo((): VacancyAgg[] => {
    const list = filteredRows;
    const map = new Map<string, VacancyAgg>();
    for (const r of list) {
      const k = `${r.jobRef}||${r.vacancyId ?? ""}||${r.jobTitle}||${r.companyName}`;
      const cur = map.get(k);
      if (cur) {
        cur.count += 1;
      } else {
        const job = jobFromRefAndId(r.jobRef, r.vacancyId, jobs);
        map.set(k, {
          key: k,
          jobRef: r.jobRef,
          jobTitle: r.jobTitle,
          companyName: r.companyName,
          count: 1,
          job,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.jobTitle.localeCompare(b.jobTitle));
  }, [filteredRows, jobs]);

  const VACANCY_PAGE_SIZE = 10;

  const vacanciesFiltered = useMemo(() => {
    const q = vacancySearch.trim().toLowerCase();
    if (!q) return byVacancy;
    return byVacancy.filter((v) => {
      const blob = [v.jobRef, v.jobTitle, v.companyName].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [byVacancy, vacancySearch]);

  const vacancyMaxCount = useMemo(
    () => (vacanciesFiltered.length ? Math.max(...vacanciesFiltered.map((v) => v.count)) : 0),
    [vacanciesFiltered],
  );

  const vacancyTotalPages = Math.max(1, Math.ceil(vacanciesFiltered.length / VACANCY_PAGE_SIZE));

  useEffect(() => {
    setVacancyListPage(1);
  }, [vacancySearch, statusAnalyticsKey]);

  useEffect(() => {
    setVacancyListPage((p) => (p > vacancyTotalPages ? vacancyTotalPages : p));
  }, [vacancyTotalPages]);

  const vacancyPageSafe = Math.min(Math.max(1, vacancyListPage), vacancyTotalPages);
  const vacanciesPageSlice = useMemo(() => {
    const start = (vacancyPageSafe - 1) * VACANCY_PAGE_SIZE;
    return vacanciesFiltered.slice(start, start + VACANCY_PAGE_SIZE);
  }, [vacanciesFiltered, vacancyPageSafe]);

  const vacancyRangeLabel = useMemo(() => {
    if (vacanciesFiltered.length === 0) return "0";
    const from = (vacancyPageSafe - 1) * VACANCY_PAGE_SIZE + 1;
    const to = Math.min(vacancyPageSafe * VACANCY_PAGE_SIZE, vacanciesFiltered.length);
    return `${from}–${to}`;
  }, [vacanciesFiltered.length, vacancyPageSafe]);

  const newLast7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filteredRows.filter((r) => {
      const t = applicationCreatedAtMs(r.createdAt);
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
  }, [filteredRows]);

  const intakeDayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filteredRows) {
      const t = applicationCreatedAtMs(r.createdAt);
      if (Number.isNaN(t)) continue;
      const d = new Date(t);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const k = `${y}-${mo}-${day}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [filteredRows]);

  /** Bar chart: one column per day, current calendar week (Mon–Sun) in local time. */
  const intakeThisWeekBars = useMemo(() => {
    const mon = startOfWeekMonday(new Date());
    const dayKey = (d: Date) => {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${day}`;
    };
    const shortDay = (d: Date) => {
      try {
        return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
      } catch {
        return shortWeekLabel(d);
      }
    };
    const buckets: { day: Date; label: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      buckets.push({
        day: d,
        label: shortDay(d),
        count: intakeDayCounts.get(dayKey(d)) ?? 0,
      });
    }
    const maxC = Math.max(0, ...buckets.map((b) => b.count));
    return { mon, buckets, maxC: maxC > 0 ? maxC : 1 };
  }, [intakeDayCounts]);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8 dark:border-slate-500/25 dark:bg-[#243144]/80 dark:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)]">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">Analytics</p>
        <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950 dark:text-slate-100">Pipeline & intake</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-slate-400">
          How candidates move through your pipeline, new applications over time, and which listings drive applicants.
        </p>
      </div>

      {err ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-slate-400">Loading analytics…</p>
      ) : rows === null ? null : (
        <div className="mt-6">
          <StatusFilterChips
            statuses={statusAnalyticsOrder}
            included={statusIncluded}
            onChange={setStatusIncluded}
            id="analytics-status-filter"
            label="Pipeline status (analytics)"
            className="w-full max-w-3xl"
          />
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 dark:border-slate-500/25 dark:bg-slate-800/40">
              <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">Total (in view)</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-zinc-950 dark:text-slate-100">
                {total}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 dark:border-slate-500/25 dark:bg-slate-800/40">
              <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">Last 7 days (in view)</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-zinc-950 dark:text-slate-100">
                {newLast7d}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-4 dark:border-slate-500/25 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">Active vacancies</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-zinc-950 dark:text-slate-100">
                {jobs.length}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-slate-100">Pipeline by stage</h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-slate-400">
              Counts among applicants matching the status filter above.
            </p>
            <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-700/80">
              {statusAnalyticsOrder.map((row) => {
                const c = countsByStatus.get(row.id) ?? 0;
                if (total === 0 || c === 0) return null;
                const w = (c / total) * 100;
                return (
                  <div
                    key={row.id}
                    className={`h-full min-w-0 ${pipelineStageSwatchClass(row.id)}`}
                    style={{ width: `${w}%` }}
                    title={`${row.label}: ${c} (${w.toFixed(0)}%)`}
                  />
                );
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {statusAnalyticsOrder.map((row) => {
                const c = countsByStatus.get(row.id) ?? 0;
                return (
                  <li key={row.id} className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-slate-300">
                    <span className={`h-2 w-2 shrink-0 rounded-sm ${pipelineStageSwatchClass(row.id)}`} aria-hidden />
                    <span className="font-medium">{row.label}</span>
                    <span className="tabular-nums text-zinc-500 dark:text-slate-400">{c}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-slate-100">Applicant intake</h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-slate-400">
              Bar chart: this week (Mon–Sun) with one bar per day. Calendar: choose week, month, or year. Local timezone.
              Respects the status filter.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">View</span>
              <div className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50/90 p-0.5 dark:border-slate-500/30 dark:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIntakeView("chart")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    intakeView === "chart"
                      ? "bg-white text-[#0B1F3A] shadow-sm ring-1 ring-zinc-200/80 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600/60"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  This week
                </button>
                <button
                  type="button"
                  onClick={() => setIntakeView("calendar")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    intakeView === "calendar"
                      ? "bg-white text-[#0B1F3A] shadow-sm ring-1 ring-zinc-200/80 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600/60"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>

            {intakeView === "chart" ? (
            <>
            {/*
              Parent must stretch columns to a fixed height so bar % height resolves against a real
              box — with `items-end` + auto column height, % heights collapsed to the same min line.
            */}
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-slate-400">
              {intakeWeekRangeLabel(intakeThisWeekBars.mon)}
            </p>
            <div className="mt-2 grid h-40 grid-cols-7 gap-1 overflow-visible sm:gap-1.5">
              {intakeThisWeekBars.buckets.map((b) => {
                const maxC = intakeThisWeekBars.maxC;
                const hPct = maxC > 0 ? (b.count / maxC) * 100 : 0;
                const people =
                  b.count === 0
                    ? "No applicants"
                    : `${b.count} applicant${b.count === 1 ? "" : "s"}`;
                return (
                  <div
                    key={+b.day}
                    className="group relative flex min-h-0 min-w-0 flex-col"
                    role="group"
                    aria-label={`Intake: ${people} on ${b.day.toLocaleDateString()}. Current week (local), status filter applied.`}
                  >
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-max min-w-[8.5rem] max-w-[min(11rem,200%)] -translate-x-1/2 rounded-lg border border-zinc-700/20 bg-zinc-900 px-2.5 py-2 text-center text-[11px] text-white shadow-lg opacity-0 transition-opacity duration-100 group-hover:opacity-100 dark:border-slate-500/30 dark:bg-slate-800"
                    >
                      <p className="font-semibold tabular-nums text-white">{people}</p>
                      <p className="mt-0.5 text-[10px] font-normal text-zinc-200 dark:text-slate-300">
                        {b.day.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex min-h-0 w-full flex-1 flex-col justify-end">
                      <div
                        className={`w-full min-w-0 max-w-full self-center rounded-t-md bg-[#2563EB] transition-colors group-hover:bg-[#1d4ed8] dark:bg-sky-500 dark:group-hover:bg-sky-400 ${
                          b.count === 0 ? "min-h-0" : "min-h-[3px]"
                        }`}
                        style={{ height: b.count === 0 ? 0 : `${hPct}%` }}
                      />
                    </div>
                    <span className="mt-1 line-clamp-2 min-h-[1.5rem] w-full text-center text-[8px] font-medium text-zinc-500 group-hover:text-zinc-700 dark:text-slate-500 dark:group-hover:text-slate-300 sm:text-[10px]">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
            </>
            ) : (
              <IntakeCalendarBlock dayCounts={intakeDayCounts} className="mt-4" />
            )}
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-slate-100">Applications by vacancy</h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-slate-400">
              Where candidates applied — volume bars scale to the busiest listing in the current filter and search.
            </p>
            {byVacancy.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <label className="relative block min-w-[min(100%,18rem)] flex-1 sm:max-w-md">
                  <span className="sr-only">Search vacancies</span>
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-slate-500"
                    weight="duotone"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={vacancySearch}
                    onChange={(e) => setVacancySearch(e.target.value)}
                    placeholder="Search by ref, title, or company…"
                    className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/35 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                    autoComplete="off"
                  />
                </label>
                <p className="text-xs tabular-nums text-zinc-500 dark:text-slate-400">
                  <span className="font-medium text-zinc-700 dark:text-slate-300">{vacanciesFiltered.length}</span>{" "}
                  listing{vacanciesFiltered.length === 1 ? "" : "s"}
                  {vacanciesFiltered.length > VACANCY_PAGE_SIZE ? (
                    <>
                      {" "}
                      · showing {vacancyRangeLabel}
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            {byVacancy.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-slate-400">
                No applications in view — widen the pipeline filter above or wait for new applicants.
              </p>
            ) : vacanciesFiltered.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-slate-400">No vacancies match your search.</p>
            ) : (
              <>
                <ul className="mt-4 max-h-[min(28rem,70vh)] space-y-2 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/90 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                  {vacanciesPageSlice.map((v) => {
                    const publicHref = v.job
                      ? publicJobPageHttpHrefForPortalTenant(tenantId, v.job.slug)
                      : null;
                    const barPct = vacancyMaxCount > 0 ? (v.count / vacancyMaxCount) * 100 : 0;
                    return (
                      <li
                        key={v.key}
                        className="rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3 dark:border-slate-500/25 dark:bg-slate-800/40"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10px] text-zinc-400 dark:text-slate-500">{v.jobRef}</p>
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-slate-100">{v.jobTitle}</p>
                            <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{v.companyName}</p>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:max-w-md">
                            <div
                              className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-slate-700/80"
                              role="presentation"
                              aria-hidden
                            >
                              <div
                                className="h-full min-w-0 rounded-full bg-[#2563EB] transition-[width] dark:bg-sky-500"
                                style={{
                                  width: `${barPct}%`,
                                  minWidth: v.count > 0 ? "4px" : undefined,
                                }}
                              />
                            </div>
                            <p className="text-[11px] font-medium tabular-nums text-zinc-600 dark:text-slate-400">
                              {v.count} applicant{v.count === 1 ? "" : "s"}
                              {vacancyMaxCount > 0 ? (
                                <span className="font-normal text-zinc-400 dark:text-slate-500">
                                  {" "}
                                  ({Math.round((v.count / vacancyMaxCount) * 100)}% of top listing)
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 lg:justify-end">
                            {publicHref ? (
                              <a
                                href={publicHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
                              >
                                View job
                              </a>
                            ) : v.job ? (
                              <span
                                className="cursor-not-allowed text-xs font-semibold text-zinc-400 dark:text-slate-500"
                                title="Set NEXT_PUBLIC_MARKETING_SITE_URL on the portal host to open the public job page."
                              >
                                View job
                              </span>
                            ) : null}
                            {v.job ? (
                              <button
                                type="button"
                                onClick={() => onOpenApplicationsForJob(v.job!)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#2563EB]/25 bg-[#2563EB]/8 px-2.5 py-1.5 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#2563EB]/12 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
                                title="Open applications for this vacancy"
                              >
                                <Users className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
                                Applications
                              </button>
                            ) : (
                              <span
                                className="text-[10px] text-zinc-400 dark:text-slate-500"
                                title="No matching vacancy in your portal — job may be from legacy data."
                              >
                                Not in directory
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {vacancyTotalPages > 1 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 pt-4 dark:border-slate-500/25">
                    <p className="text-xs text-zinc-500 dark:text-slate-400">
                      Page{" "}
                      <span className="font-semibold tabular-nums text-zinc-800 dark:text-slate-200">
                        {vacancyPageSafe}
                      </span>{" "}
                      of {vacancyTotalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={vacancyPageSafe <= 1}
                        onClick={() => setVacancyListPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/35 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                      >
                        <CaretLeft className="h-3.5 w-3.5" aria-hidden />
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={vacancyPageSafe >= vacancyTotalPages}
                        onClick={() => setVacancyListPage((p) => Math.min(vacancyTotalPages, p + 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500/35 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                      >
                        Next
                        <CaretRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
        </div>
      )}
    </section>
  );
}
