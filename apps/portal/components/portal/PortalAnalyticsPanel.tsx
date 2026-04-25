"use client";

import { IntakeCalendarBlock } from "@/components/portal/IntakeCalendarBlock";
import { StatusFilterChips } from "@/components/portal/StatusFilterChips";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  type JobApplicationRecordClient,
  type JobApplicationStatus,
  JOB_APPLICATION_STATUS_LABELS,
  JOB_APPLICATION_STATUSES,
} from "@techrecruit/shared/lib/job-application-shared";
import { publicJobPageHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { Users } from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_ORDER: JobApplicationStatus[] = [...JOB_APPLICATION_STATUSES];

const STAGE_STYLES: Record<JobApplicationStatus, string> = {
  new: "bg-sky-500",
  reviewing: "bg-amber-500",
  shortlisted: "bg-violet-500",
  rejected: "bg-rose-500",
  hired: "bg-emerald-500",
};

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
  onOpenApplicationsForJob,
}: {
  user: User;
  tenantId: string;
  jobs: JobDetail[];
  onOpenApplicationsForJob: (job: JobDetail) => void;
}) {
  const [rows, setRows] = useState<JobApplicationRecordClient[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusIncluded, setStatusIncluded] = useState<Set<JobApplicationStatus>>(
    () => new Set(JOB_APPLICATION_STATUSES),
  );
  const [intakeView, setIntakeView] = useState<"chart" | "calendar">("chart");

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

  const filteredRows = useMemo(
    () => (rows ?? []).filter((r) => statusIncluded.has(r.status)),
    [rows, statusIncluded],
  );

  const total = filteredRows.length;

  const countsByStatus = useMemo(() => {
    const m = new Map<JobApplicationStatus, number>();
    for (const s of STATUS_ORDER) m.set(s, 0);
    for (const r of filteredRows) {
      const st = r.status;
      m.set(st, (m.get(st) ?? 0) + 1);
    }
    return m;
  }, [filteredRows]);

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
      ) : rows === null ? null : (rows?.length ?? 0) === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 dark:border-slate-500/30 dark:bg-slate-800/30 dark:text-slate-400">
          No applications yet. When candidates apply, stage counts, intake, and per-vacancy volume will appear here.
        </p>
      ) : (
        <div className="mt-6">
          <StatusFilterChips
            included={statusIncluded}
            onChange={setStatusIncluded}
            id="analytics-status-filter"
            label="Pipeline status (analytics)"
            className="w-full max-w-3xl"
          />
          {total === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-amber-200/90 bg-amber-50/50 px-4 py-6 text-center text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/25 dark:text-amber-100">
              No applications match the selected status filters. Include at least one stage above to see pipeline,
              intake, and vacancy breakdown.
            </p>
          ) : (
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
              {STATUS_ORDER.map((s) => {
                const c = countsByStatus.get(s) ?? 0;
                if (total === 0 || c === 0) return null;
                const w = (c / total) * 100;
                return (
                  <div
                    key={s}
                    className={`h-full min-w-0 ${STAGE_STYLES[s]}`}
                    style={{ width: `${w}%` }}
                    title={`${JOB_APPLICATION_STATUS_LABELS[s]}: ${c} (${w.toFixed(0)}%)`}
                  />
                );
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {STATUS_ORDER.map((s) => {
                const c = countsByStatus.get(s) ?? 0;
                return (
                  <li key={s} className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-slate-300">
                    <span className={`h-2 w-2 shrink-0 rounded-sm ${STAGE_STYLES[s]}`} aria-hidden />
                    <span className="font-medium">{JOB_APPLICATION_STATUS_LABELS[s]}</span>
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
              Where candidates applied — your listings and their volume.
            </p>
            <ul className="mt-4 space-y-2">
              {byVacancy.map((v) => {
                const publicHref = v.job
                  ? publicJobPageHttpHrefForPortalTenant(tenantId, v.job.slug)
                  : null;
                return (
                  <li
                    key={v.key}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-500/25 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-zinc-400 dark:text-slate-500">{v.jobRef}</p>
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-slate-100">{v.jobTitle}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{v.companyName}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-3">
                      <span className="text-xs font-semibold tabular-nums text-zinc-600 dark:text-slate-400">
                        {v.count} applicant{v.count === 1 ? "" : "s"}
                      </span>
                      {publicHref ? (
                        <a
                          href={publicHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
                        >
                          View
                        </a>
                      ) : v.job ? (
                        <span
                          className="cursor-not-allowed text-xs font-semibold text-zinc-400 dark:text-slate-500"
                          title="Set NEXT_PUBLIC_MARKETING_SITE_URL on the portal host to open the public job page."
                        >
                          View
                        </span>
                      ) : null}
                      {v.job ? (
                        <button
                          type="button"
                          onClick={() => onOpenApplicationsForJob(v.job!)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] underline-offset-2 transition hover:text-[#1d4ed8] hover:underline dark:text-sky-400"
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
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
          )}
        </div>
      )}
    </section>
  );
}
