"use client";

import { CandidateScreeningCard } from "@/components/jobs/CandidateScreeningCard";
import type { JobDetail } from "@/data/jobs";
import {
  type JobApplicationRecord,
  type JobApplicationStatus,
  isScreeningPendingOnRecord,
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
  CaretDown,
  CircleNotch,
  DotsSixVertical,
  DownloadSimple,
  FileCsv,
  Funnel,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

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

function formatJobLabel(j: JobDetail): string {
  return `${j.ref} — ${j.title} · ${j.companyName}`;
}

/** Public job page URL (`/jobs/[slug]`). */
function jobVacancyHref(r: JobApplicationRecord): string {
  const slug = r.jobSlug?.trim();
  if (!slug) return "#";
  return `/jobs/${encodeURIComponent(slug)}`;
}

function ScreeningCta({
  r,
  expanded,
  onToggle,
  variant,
}: {
  r: JobApplicationRecord;
  expanded: boolean;
  onToggle: () => void;
  variant: "mobile" | "table";
}) {
  const card =
    "w-full max-w-full rounded-lg border border-[#7107E7]/30 bg-[#7107E7]/[0.07] px-2.5 py-2 text-left text-xs font-semibold leading-snug text-[#5b06c2] shadow-sm";
  const mobileExtras = variant === "mobile" ? " transition hover:border-[#7107E7]/45 hover:bg-[#7107E7]/10 sm:max-w-xs sm:self-center" : " transition hover:border-[#7107E7]/45 hover:bg-[#7107E7]/10";

  if (r.screening) {
    return (
      <button type="button" onClick={onToggle} className={`${card}${mobileExtras}`}>
        <span className="block whitespace-normal">{expanded ? "Hide screening" : "View screening"}</span>
        <span className="mt-0.5 block font-mono text-[11px] font-medium tabular-nums text-zinc-600">
          Score {Math.round(r.screening.match.score)}/{r.screening.match.scoreMax ?? 100}
        </span>
      </button>
    );
  }

  if (isScreeningPendingOnRecord(r)) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 ${card}${variant === "mobile" ? " sm:max-w-xs sm:self-center" : ""}`}
      >
        <CircleNotch className="h-4 w-4 shrink-0 animate-spin text-[#7107E7]" weight="bold" aria-hidden />
        <span className="font-semibold">Screening loading…</span>
      </div>
    );
  }

  const noScreeningClass =
    variant === "mobile"
      ? "text-right text-[10px] leading-snug text-zinc-400 sm:text-left"
      : "text-[10px] leading-snug text-zinc-400";

  return (
    <span className={noScreeningClass} title="When your backend returns screening, it appears here.">
      No screening
    </span>
  );
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
  /** Combobox: type to filter vacancies; value reflects selection or current search text. */
  const [vacancyComboQuery, setVacancyComboQuery] = useState("");
  /** When true, URL/filter sync must not overwrite the input (user is typing). */
  const [vacancyComboDirty, setVacancyComboDirty] = useState(false);
  const [vacancyComboOpen, setVacancyComboOpen] = useState(false);
  const vacancyComboRef = useRef<HTMLDivElement | null>(null);
  /** Filters visible rows by candidate name and job fields (title, ref, company, slug). */
  const [vacancyRowSearch, setVacancyRowSearch] = useState("");
  const [rows, setRows] = useState<JobApplicationRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Expanded application row for AI screening details (recruiter-only). */
  const [screeningExpandedId, setScreeningExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setFilterKey(buildInitialFilterKey(initialVacancyId, initialJobRef));
    setVacancyComboDirty(false);
  }, [initialVacancyId, initialJobRef]);

  useEffect(() => {
    if (vacancyComboDirty) return;
    const fk = filterKey;
    if (!fk) {
      setVacancyComboQuery("");
      return;
    }
    const j = jobFromFilterKey(fk, jobs);
    if (j) setVacancyComboQuery(formatJobLabel(j));
  }, [filterKey, jobs, vacancyComboDirty]);

  useEffect(() => {
    if (!vacancyComboOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (vacancyComboRef.current?.contains(e.target as Node)) return;
      setVacancyComboOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [vacancyComboOpen]);

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

  /** Refetch without clearing the table — used while screening is still processing. */
  const refreshApplicationsSilently = useCallback(async () => {
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/applications", {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        applications?: JobApplicationRecord[];
      };
      if (!res.ok) return;
      setRows(data.applications ?? []);
    } catch {
      /* keep existing rows */
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Warm token cache so PATCH does not wait on a cold `getIdToken()` after the user picks a status. */
  useEffect(() => {
    void user.getIdToken();
  }, [user]);

  const hasPendingScreening = useMemo(
    () => rows?.some((r) => isScreeningPendingOnRecord(r)) ?? false,
    [rows],
  );

  useEffect(() => {
    if (!hasPendingScreening) return;
    const id = window.setInterval(() => void refreshApplicationsSilently(), 4000);
    return () => window.clearInterval(id);
  }, [hasPendingScreening, refreshApplicationsSilently]);

  async function updateStatus(id: string, status: JobApplicationStatus) {
    let previous: JobApplicationStatus | undefined;
    // Controlled <select> reads `value` from state; commit before awaiting auth so the UI updates immediately.
    flushSync(() => {
      setRows((prev) => {
        if (!prev) return prev;
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;
        previous = row.status;
        return prev.map((r) => (r.id === id ? { ...r, status } : r));
      });
    });

    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch(`/api/portal/applications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok && previous !== undefined) {
        const restore = previous;
        setRows((prev) =>
          prev ? prev.map((r) => (r.id === id ? { ...r, status: restore } : r)) : prev,
        );
      }
    } catch {
      if (previous !== undefined) {
        const restore = previous;
        setRows((prev) =>
          prev ? prev.map((r) => (r.id === id ? { ...r, status: restore } : r)) : prev,
        );
      }
    }
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
      const fullName = `${r.firstName} ${r.lastName}`.trim().toLowerCase();
      const blob = [
        r.firstName,
        r.lastName,
        fullName,
        r.jobTitle,
        r.jobRef,
        r.companyName,
        r.jobSlug ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [filteredByVacancy, vacancyRowSearch]);

  const jobsForSelect = useMemo(() => {
    const q = vacancyComboQuery.trim().toLowerCase();
    let list = q
      ? jobs.filter((j) =>
          [j.ref, j.title, j.companyName, j.slug ?? ""].join(" ").toLowerCase().includes(q),
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
  }, [jobs, vacancyComboQuery, filterKey]);

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

  function selectVacancy(nextKey: string) {
    setVacancyComboDirty(false);
    onFilterChange(nextKey);
    const j = nextKey ? jobFromFilterKey(nextKey, jobs) : undefined;
    setVacancyComboQuery(j ? formatJobLabel(j) : "");
    setVacancyComboOpen(false);
  }

  function clearVacancyCombo() {
    setVacancyComboDirty(false);
    onFilterChange("");
    setVacancyComboQuery("");
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Candidates</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950">Applications</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Pick a vacancy (search as you type), then review applicants. Use the field below to filter rows by
            candidate name, job title, reference, company, or slug.
          </p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 lg:max-w-none lg:flex-1 lg:items-end xl:max-w-2xl">
          <div ref={vacancyComboRef} className="flex w-full min-w-0 flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600" htmlFor="vacancy-combobox-input">
              <span className="inline-flex items-center gap-1.5">
                <Funnel className="h-3.5 w-3.5 text-zinc-400" weight="duotone" aria-hidden />
                Vacancy
              </span>
            </label>
            <div className="relative">
              <input
                id="vacancy-combobox-input"
                type="text"
                role="combobox"
                aria-expanded={vacancyComboOpen}
                aria-controls="vacancy-combobox-listbox"
                aria-autocomplete="list"
                value={vacancyComboQuery}
                onChange={(e) => {
                  setVacancyComboQuery(e.target.value);
                  setVacancyComboDirty(true);
                  setVacancyComboOpen(true);
                }}
                onFocus={() => setVacancyComboOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setVacancyComboOpen(false);
                }}
                placeholder="Search by ref, title, company, or slug — then pick a row"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-20 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
                autoComplete="off"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {vacancyComboQuery.trim() ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Clear vacancy search"
                    className="pointer-events-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearVacancyCombo();
                    }}
                  >
                    <X className="h-4 w-4" weight="bold" aria-hidden />
                  </button>
                ) : null}
                <CaretDown className="h-4 w-4 text-zinc-400" weight="bold" aria-hidden />
              </div>
              {vacancyComboOpen ? (
                <ul
                  id="vacancy-combobox-listbox"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 text-left text-sm shadow-lg ring-1 ring-zinc-950/5"
                >
                  <li role="presentation" className="px-1">
                    <button
                      type="button"
                      role="option"
                      aria-selected={filterKey === ""}
                      className={`flex w-full rounded-lg px-3 py-2 text-left transition hover:bg-zinc-50 ${
                        filterKey === "" ? "bg-[#7107E7]/10 font-medium text-[#5b06c2]" : "text-zinc-800"
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectVacancy("")}
                    >
                      All vacancies
                    </button>
                  </li>
                  {jobsForSelect.map((j) => {
                    const v = jobFilterValue(j);
                    const selected = filterKey === v;
                    return (
                      <li key={`${j.ref}-${j.id ?? ""}`} role="presentation" className="px-1">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full rounded-lg px-3 py-2 text-left transition hover:bg-zinc-50 ${
                            selected ? "bg-[#7107E7]/10 font-medium text-[#5b06c2]" : "text-zinc-800"
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectVacancy(v)}
                        >
                          <span className="line-clamp-2">
                            {j.ref} — {j.title} · {j.companyName}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
          <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <MagnifyingGlass className="h-3.5 w-3.5 text-zinc-400" weight="duotone" aria-hidden />
              Filter applicants by job or name
            </span>
            <input
              type="search"
              value={vacancyRowSearch}
              onChange={(e) => setVacancyRowSearch(e.target.value)}
              placeholder="Match name, title, ref, company, or slug on each row…"
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
                  ? "No applicants match your search — try different keywords or clear the search."
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
                    title={JOB_APPLICATION_STATUS_LABELS[r.status]}
                    onChange={(e) => void updateStatus(r.id, e.target.value as JobApplicationStatus)}
                    className="max-w-[min(100%,9rem)] min-w-0 shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
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
                <div className="mt-3 flex flex-col items-stretch gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                  <button
                    type="button"
                    onClick={() => void downloadCv(r.id)}
                    className="inline-flex w-fit items-center gap-1 self-end text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline sm:self-center"
                  >
                    <DownloadSimple className="h-3.5 w-3.5 shrink-0" weight="bold" aria-hidden />
                    Download CV
                  </button>
                  <ScreeningCta
                    r={r}
                    expanded={screeningExpandedId === r.id}
                    onToggle={() =>
                      setScreeningExpandedId((cur) => (cur === r.id ? null : r.id))
                    }
                    variant="mobile"
                  />
                </div>
                {screeningExpandedId === r.id && r.screening ? (
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <CandidateScreeningCard
                      screening={r.screening}
                      onClose={() => setScreeningExpandedId(null)}
                    />
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
                      style={{
                        width: `${(columnWidths[logical]! / columnWidthTotal) * 100}%`,
                        ...(logical === 4 ? { minWidth: 168 } : {}),
                      }}
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
                          className="relative min-w-0 px-2 py-3 sm:px-3"
                        >
                          <div className="flex items-start gap-1 pr-1">
                            <button
                              type="button"
                              draggable
                              aria-label={`Move column: ${meta.label}`}
                              title="Drag to reorder column"
                              className="mt-0.5 shrink-0 cursor-grab rounded border-0 bg-transparent p-0.5 text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-600 active:cursor-grabbing"
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", String(visualIndex));
                                e.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              <DotsSixVertical className="h-4 w-4" weight="bold" aria-hidden />
                            </button>
                            <span className="min-w-0 flex-1 leading-snug break-words">{meta.label}</span>
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
                              <td
                                key={logical}
                                className="min-w-0 overflow-hidden px-3 py-3 sm:px-4"
                              >
                                <select
                                  value={r.status}
                                  title={JOB_APPLICATION_STATUS_LABELS[r.status]}
                                  onChange={(e) => void updateStatus(r.id, e.target.value as JobApplicationStatus)}
                                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
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
                              <td
                                key={logical}
                                className="min-w-[12rem] max-w-none px-3 py-3 align-top sm:min-w-[14rem] sm:px-4"
                              >
                                <div className="flex min-w-0 flex-col gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => void downloadCv(r.id)}
                                    className="inline-flex w-fit shrink-0 items-center gap-1 text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                                  >
                                    <DownloadSimple className="h-3.5 w-3.5 shrink-0" weight="bold" aria-hidden />
                                    Download CV
                                  </button>
                                  <ScreeningCta
                                    r={r}
                                    expanded={screeningExpandedId === r.id}
                                    onToggle={() =>
                                      setScreeningExpandedId((cur) => (cur === r.id ? null : r.id))
                                    }
                                    variant="table"
                                  />
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
                            <CandidateScreeningCard
                              screening={r.screening}
                              onClose={() => setScreeningExpandedId(null)}
                            />
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
