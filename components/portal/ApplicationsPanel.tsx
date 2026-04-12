"use client";

import { CandidateScreeningCard } from "@/components/jobs/CandidateScreeningCard";
import type { JobDetail } from "@/data/jobs";
import {
  type JobApplicationRecord,
  type JobApplicationStatus,
  JOB_APPLICATION_STATUS_LABELS,
  JOB_APPLICATION_STATUSES,
} from "@/lib/job-application-shared";
import { useApplicationsTableColumnOrder } from "@/hooks/useApplicationsTableColumnOrder";
import { useApplicationsTableColumnWidths } from "@/hooks/useApplicationsTableColumnWidths";
import { APPLICATIONS_TABLE_COLUMNS } from "@/lib/applications-table-columns";
import { buildApplicationsCsv, triggerCsvDownload } from "@/lib/applications-csv";
import { portalAuthHeaders } from "@/lib/portal-auth";
import {
  Bell,
  DotsSixVertical,
  DownloadSimple,
  FileCsv,
  Funnel,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Value for the filter dropdown — filtering is applied client-side on the loaded list. */
function jobFilterValue(job: JobDetail): string {
  const vid = job.id?.trim();
  if (vid) return `vacancy:${vid}`;
  return `ref:${job.ref}`;
}

function filterLabel(jobs: JobDetail[], filterKey: string): string | null {
  if (!filterKey) return null;
  if (filterKey.startsWith("vacancy:")) {
    const id = filterKey.slice("vacancy:".length);
    const j = jobs.find((x) => x.id?.trim() === id);
    return j ? `${j.title}` : "This vacancy";
  }
  if (filterKey.startsWith("ref:")) {
    const ref = filterKey.slice("ref:".length);
    const j = jobs.find((x) => x.ref === ref);
    return j ? `${j.title}` : ref;
  }
  return null;
}

function buildInitialFilterKey(initialVacancyId?: string, initialJobRef?: string): string {
  const v = initialVacancyId?.trim();
  if (v) return `vacancy:${v}`;
  const r = initialJobRef?.trim();
  if (r) return `ref:${r}`;
  return "";
}

function jobFromFilterKey(filterKey: string, jobList: JobDetail[]): JobDetail | undefined {
  if (filterKey.startsWith("vacancy:")) {
    const id = filterKey.slice("vacancy:".length);
    return jobList.find((x) => x.id?.trim() === id);
  }
  if (filterKey.startsWith("ref:")) {
    const ref = filterKey.slice("ref:".length);
    return jobList.find((x) => x.ref === ref);
  }
  return undefined;
}

/** Public job page URL (`/jobs/[slug]`). */
function jobVacancyHref(r: JobApplicationRecord): string {
  const slug = r.jobSlug?.trim();
  if (!slug) return "#";
  return `/jobs/${encodeURIComponent(slug)}`;
}

export function ApplicationsPanel({
  user,
  jobs,
  initialVacancyId,
  initialJobRef,
}: {
  user: User;
  jobs: JobDetail[];
  initialVacancyId?: string;
  initialJobRef?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterKey, setFilterKey] = useState(() =>
    buildInitialFilterKey(initialVacancyId, initialJobRef),
  );
  /** Narrows the vacancy dropdown (ref, title, company). */
  const [vacancyListSearch, setVacancyListSearch] = useState("");
  /** Filters visible applicant rows by text on job title, ref, company, slug. */
  const [vacancyRowSearch, setVacancyRowSearch] = useState("");
  const [rows, setRows] = useState<JobApplicationRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Expanded application row for AI screening details (recruiter-only). */
  const [screeningExpandedId, setScreeningExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setFilterKey(buildInitialFilterKey(initialVacancyId, initialJobRef));
  }, [initialVacancyId, initialJobRef]);

  const { widths: columnWidths, onResizeBetweenLogical } = useApplicationsTableColumnWidths(user.uid);
  const { columnOrder, moveColumn } = useApplicationsTableColumnOrder(user.uid);

  const syncUrl = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "applications");
      if (!next) {
        params.delete("vacancy");
        params.delete("ref");
      } else if (next.startsWith("vacancy:")) {
        params.set("vacancy", next.slice("vacancy:".length));
        params.delete("ref");
      } else if (next.startsWith("ref:")) {
        params.set("ref", next.slice("ref:".length));
        params.delete("vacancy");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setRows(null);
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/applications", {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        applications?: JobApplicationRecord[];
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const base = typeof data.error === "string" ? data.error : `Failed (${res.status})`;
        const extra = typeof data.detail === "string" && data.detail.trim() ? `: ${data.detail.trim()}` : "";
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

  async function updateStatus(id: string, status: JobApplicationStatus) {
    const headers = await portalAuthHeaders(user);
    const res = await fetch(`/api/portal/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, status } : r)) : prev));
  }

  async function downloadCv(id: string) {
    const headers = await portalAuthHeaders(user);
    const res = await fetch(`/api/portal/applications/${encodeURIComponent(id)}/cv`, {
      headers,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (!res.ok || typeof data.url !== "string") return;
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  function downloadAllApplicationsCsv() {
    if (!rows?.length) return;
    const csv = buildApplicationsCsv(rows);
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    triggerCsvDownload(csv, `applications-${stamp}`);
  }

  const filteredByVacancy = useMemo(() => {
    const list = rows ?? [];
    if (!filterKey) return list;
    if (filterKey.startsWith("ref:")) {
      const ref = filterKey.slice("ref:".length);
      return list.filter((r) => r.jobRef === ref);
    }
    if (filterKey.startsWith("vacancy:")) {
      const uuid = filterKey.slice("vacancy:".length);
      const job = jobs.find((x) => x.id?.trim() === uuid);
      return list.filter((r) => {
        if (r.vacancyId?.trim() === uuid) return true;
        if (job && r.jobRef === job.ref) return true;
        return false;
      });
    }
    return list;
  }, [rows, filterKey, jobs]);

  const displayed = useMemo(() => {
    const q = vacancyRowSearch.trim().toLowerCase();
    if (!q) return filteredByVacancy;
    return filteredByVacancy.filter((r) => {
      const blob = [r.jobTitle, r.jobRef, r.companyName, r.jobSlug ?? ""].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [filteredByVacancy, vacancyRowSearch]);

  const jobsForSelect = useMemo(() => {
    const q = vacancyListSearch.trim().toLowerCase();
    let list = q
      ? jobs.filter((j) =>
          [j.ref, j.title, j.companyName].join(" ").toLowerCase().includes(q),
        )
      : jobs;
    const selected = filterKey ? jobFromFilterKey(filterKey, jobs) : undefined;
    if (
      selected &&
      !list.some(
        (j) =>
          j.ref === selected.ref && (j.id?.trim() ?? "") === (selected.id?.trim() ?? ""),
      )
    ) {
      list = [selected, ...list];
    }
    return list;
  }, [jobs, vacancyListSearch, filterKey]);

  const activeFilterLabel = filterLabel(jobs, filterKey);

  /** Notification banner: only while at least one visible row is still `new`. */
  const newApplicationCount = useMemo(
    () => displayed.filter((r) => r.status === "new").length,
    [displayed],
  );

  const columnWidthTotal = useMemo(
    () => columnWidths.reduce((a, b) => a + b, 0) || 1,
    [columnWidths],
  );

  function onFilterChange(next: string) {
    setFilterKey(next);
    syncUrl(next);
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Candidates</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950">Applications</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Search or pick a vacancy, then review applicants. Use the text box to narrow the list or filter rows by
            job title, reference, or company.
          </p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 lg:max-w-none lg:flex-1 lg:items-end xl:max-w-2xl">
          <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <MagnifyingGlass className="h-3.5 w-3.5 text-zinc-400" weight="duotone" aria-hidden />
              Find a vacancy in the list
            </span>
            <input
              type="search"
              value={vacancyListSearch}
              onChange={(e) => setVacancyListSearch(e.target.value)}
              placeholder="Type job ref, title, or company…"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
              autoComplete="off"
            />
          </label>
          <label className="flex w-full min-w-[14rem] flex-col gap-1.5 text-xs font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <Funnel className="h-3.5 w-3.5 text-zinc-400" weight="duotone" aria-hidden />
              Vacancy
            </span>
            <select
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
              value={filterKey}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              <option value="">All vacancies</option>
              {jobsForSelect.map((j) => (
                <option key={j.ref + (j.id ?? "")} value={jobFilterValue(j)}>
                  {j.ref} — {j.title} · {j.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <MagnifyingGlass className="h-3.5 w-3.5 text-zinc-400" weight="duotone" aria-hidden />
              Filter applicants by job
            </span>
            <input
              type="search"
              value={vacancyRowSearch}
              onChange={(e) => setVacancyRowSearch(e.target.value)}
              placeholder="Match title, ref, company, or slug on each row…"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
              autoComplete="off"
            />
          </label>
          <div className="flex w-full flex-wrap gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={loading || !rows?.length}
              onClick={downloadAllApplicationsCsv}
              title="Download every application in your account as a CSV (not limited by the vacancy filter)."
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCsv className="h-4 w-4 text-[#7107E7]" weight="duotone" aria-hidden />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {!loading && rows !== null && newApplicationCount > 0 ? (
        <div
          className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#7107E7]/25 bg-gradient-to-br from-[#7107E7]/[0.08] via-white to-amber-50/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7107E7]/15 text-[#5b06c2]">
              <Bell className="h-5 w-5" weight="duotone" aria-hidden />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-zinc-950">
                {newApplicationCount} new {newApplicationCount === 1 ? "application" : "applications"}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {activeFilterLabel ? (
                  <>
                    In this filter: <span className="font-medium text-zinc-800">{activeFilterLabel}</span>
                    {filterKey.startsWith("ref:") ? (
                      <span className="text-zinc-400"> · by job reference</span>
                    ) : null}
                  </>
                ) : (
                  "Review or change status in the table below — this notice hides when nothing is still marked New."
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {err ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading…</p>
      ) : err ? null : displayed.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
          <p>
            {!rows?.length
              ? "No applications yet."
              : filteredByVacancy.length === 0
                ? activeFilterLabel
                  ? "No applications for this vacancy."
                  : "No applications yet."
                : vacancyRowSearch.trim()
                  ? "No applicants match your job search — try different keywords or clear the search."
                  : "No applications yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {displayed.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-950">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{formatDate(r.createdAt)}</p>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) => void updateStatus(r.id, e.target.value as JobApplicationStatus)}
                    className="max-w-[9rem] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
                  >
                    {JOB_APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {JOB_APPLICATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs">
                  <p className="font-mono text-[10px] text-zinc-400">{r.jobRef}</p>
                  {r.jobSlug?.trim() ? (
                    <Link
                      href={jobVacancyHref(r)}
                      className="block w-full text-left font-medium text-[#7107E7] underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7107E7]/35"
                    >
                      {r.jobTitle}
                    </Link>
                  ) : (
                    <p className="font-medium text-zinc-900">{r.jobTitle}</p>
                  )}
                  <p className="text-zinc-500">{r.companyName}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <a href={`mailto:${r.email}`} className="font-medium text-[#7107E7] underline-offset-2 hover:underline">
                    {r.email}
                  </a>
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} className="text-zinc-600 hover:underline">
                      {r.phone}
                    </a>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => void downloadCv(r.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                  >
                    <DownloadSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    CV
                  </button>
                  {r.screening ? (
                    <button
                      type="button"
                      onClick={() =>
                        setScreeningExpandedId((cur) => (cur === r.id ? null : r.id))
                      }
                      className="text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                    >
                      {screeningExpandedId === r.id ? "Hide screening" : "View screening"}
                      <span className="ml-1 font-mono text-[10px] font-normal text-zinc-500">
                        {Math.round(r.screening.match.score)}/{r.screening.match.scoreMax ?? 100}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400" title="When your backend returns screening, it appears here.">
                      No screening
                    </span>
                  )}
                </div>
                {screeningExpandedId === r.id && r.screening ? (
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <CandidateScreeningCard screening={r.screening} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Desktop table — column widths persist per signed-in user (localStorage) */}
          <div className="mt-6 hidden md:block">
            <p className="mb-2 text-xs text-zinc-400">
              Drag the <span className="font-medium text-zinc-500">⋮⋮</span> handle to reorder columns. Drag column
              borders to resize. Order and widths are saved for your account on this browser. Job titles link to the
              public vacancy page. Use <span className="font-medium text-zinc-500">View screening</span> when AI
              screening data is available.
            </p>
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-zinc-200/90">
              <table className="w-full min-w-0 table-fixed divide-y divide-zinc-200 text-left text-sm">
                <colgroup>
                  {columnOrder.map((logical) => (
                    <col
                      key={logical}
                      style={{ width: `${(columnWidths[logical]! / columnWidthTotal) * 100}%` }}
                    />
                  ))}
                </colgroup>
                <thead className="bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    {columnOrder.map((logical, visualIndex) => {
                      const meta = APPLICATIONS_TABLE_COLUMNS[logical];
                      return (
                        <th
                          key={logical}
                          scope="col"
                          title={meta.title}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const raw = e.dataTransfer.getData("text/plain");
                            const from = parseInt(raw, 10);
                            if (!Number.isNaN(from) && from !== visualIndex) {
                              moveColumn(from, visualIndex);
                            }
                          }}
                          className="relative min-w-0 whitespace-nowrap px-2 py-3 sm:px-3"
                        >
                          <div className="flex items-center gap-1 pr-1">
                            <button
                              type="button"
                              draggable
                              aria-label={`Move column: ${meta.label}`}
                              title="Drag to reorder column"
                              className="shrink-0 cursor-grab rounded border-0 bg-transparent p-0.5 text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-600 active:cursor-grabbing"
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", String(visualIndex));
                                e.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              <DotsSixVertical className="h-4 w-4" weight="bold" aria-hidden />
                            </button>
                            <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                          </div>
                          {visualIndex < columnOrder.length - 1 ? (
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-label={`Resize between ${meta.label} and next column`}
                              title="Drag to resize column"
                              className="absolute right-0 top-0 z-10 h-full w-3 translate-x-1/2 cursor-col-resize border-0 bg-transparent p-0 hover:bg-[#7107E7]/20 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7107E7]/35"
                              onMouseDown={onResizeBetweenLogical(logical, columnOrder[visualIndex + 1]!)}
                            />
                          ) : null}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {displayed.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="align-top text-zinc-800 transition hover:bg-zinc-50/80">
                      {columnOrder.map((logical) => {
                        switch (logical) {
                          case 0:
                            return (
                              <td
                                key={logical}
                                className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-3 text-xs text-zinc-500 sm:px-4"
                              >
                                {formatDate(r.createdAt)}
                              </td>
                            );
                          case 1:
                            return (
                              <td key={logical} className="min-w-0 overflow-hidden px-3 py-3 font-medium text-zinc-950 sm:px-4">
                                <span className="line-clamp-2 break-words">
                                  {r.firstName} {r.lastName}
                                </span>
                              </td>
                            );
                          case 2:
                            return (
                              <td key={logical} className="min-w-0 overflow-hidden px-3 py-3 text-xs sm:px-4">
                                <a
                                  href={`mailto:${r.email}`}
                                  className="break-all text-[#7107E7] underline-offset-2 hover:underline"
                                >
                                  {r.email}
                                </a>
                                {r.phone ? (
                                  <p className="mt-1 text-zinc-600">
                                    <a href={`tel:${r.phone}`} className="hover:underline">
                                      {r.phone}
                                    </a>
                                  </p>
                                ) : null}
                              </td>
                            );
                          case 3:
                            return (
                              <td key={logical} className="min-w-0 overflow-hidden px-3 py-3 text-xs sm:px-4">
                                <span className="font-mono text-[10px] text-zinc-400">{r.jobRef}</span>
                                {r.jobSlug?.trim() ? (
                                  <Link
                                    href={jobVacancyHref(r)}
                                    title="Open public job page"
                                    className="mt-0.5 block w-full max-w-full text-left font-medium text-[#7107E7] underline-offset-2 line-clamp-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7107E7]/35"
                                  >
                                    {r.jobTitle}
                                  </Link>
                                ) : (
                                  <p className="mt-0.5 line-clamp-2 font-medium text-zinc-900">{r.jobTitle}</p>
                                )}
                                <p className="line-clamp-1 text-zinc-500">{r.companyName}</p>
                              </td>
                            );
                          case 4:
                            return (
                              <td key={logical} className="min-w-0 overflow-hidden whitespace-nowrap px-3 py-3 sm:px-4">
                                <select
                                  value={r.status}
                                  onChange={(e) => void updateStatus(r.id, e.target.value as JobApplicationStatus)}
                                  className="max-w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
                                >
                                  {JOB_APPLICATION_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {JOB_APPLICATION_STATUS_LABELS[s]}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          case 5:
                            return (
                              <td key={logical} className="min-w-0 overflow-hidden whitespace-nowrap px-3 py-3 sm:px-4">
                                <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                  <button
                                    type="button"
                                    onClick={() => void downloadCv(r.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                                  >
                                    <DownloadSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
                                    Download
                                  </button>
                                  {r.screening ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setScreeningExpandedId((cur) => (cur === r.id ? null : r.id))
                                      }
                                      className="text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                                    >
                                      {screeningExpandedId === r.id ? "Hide screening" : "View screening"}
                                      <span className="ml-1 font-mono text-[10px] font-normal text-zinc-500">
                                        {Math.round(r.screening.match.score)}/
                                        {r.screening.match.scoreMax ?? 100}
                                      </span>
                                    </button>
                                  ) : (
                                    <span
                                      className="text-[10px] text-zinc-400"
                                      title="When your backend returns screening, it appears here."
                                    >
                                      No screening
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          default:
                            return null;
                        }
                      })}
                      </tr>
                      {screeningExpandedId === r.id && r.screening ? (
                        <tr className="bg-zinc-50/90">
                          <td colSpan={columnOrder.length} className="p-4 sm:p-6">
                            <CandidateScreeningCard screening={r.screening} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
