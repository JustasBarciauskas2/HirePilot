"use client";

import { ApplicantRankedCard } from "@/components/portal/ApplicantRankedCard";
import { StatusFilterChips } from "@/components/portal/StatusFilterChips";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  type JobApplicationRecordClient,
  type JobApplicationStatus,
  isScreeningPendingOnRecord,
  JOB_APPLICATION_STATUSES,
} from "@techrecruit/shared/lib/job-application-shared";
import { buildApplicationsCsv, triggerCsvDownload } from "@techrecruit/shared/lib/applications-csv";
import { publicJobPageHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import {
  Bell,
  CaretDown,
  FileCsv,
  Funnel,
  MagnifyingGlass,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

/** Canonical form for vacancy UUIDs in filter keys and comparisons (avoids case mismatches). */
function normVacancyUuid(s: string | undefined | null): string {
  return (s?.trim() ?? "").toLowerCase();
}

/** Value for the filter dropdown — filtering is applied client-side on the loaded list. */
function jobFilterValue(job: JobDetail): string {
  const vid = job.id?.trim();
  if (vid) return `vacancy:${normVacancyUuid(vid)}`;
  return `ref:${job.ref}`;
}

function filterLabel(jobs: JobDetail[], filterKey: string): string | null {
  if (!filterKey) return null;
  if (filterKey.startsWith("vacancy:")) {
    const id = normVacancyUuid(filterKey.slice("vacancy:".length));
    const j = jobs.find((x) => normVacancyUuid(x.id) === id);
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
  if (v) return `vacancy:${normVacancyUuid(v)}`;
  const r = initialJobRef?.trim();
  if (r) return `ref:${r}`;
  return "";
}

function jobFromFilterKey(filterKey: string, jobList: JobDetail[]): JobDetail | undefined {
  if (filterKey.startsWith("vacancy:")) {
    const id = normVacancyUuid(filterKey.slice("vacancy:".length));
    return jobList.find((x) => normVacancyUuid(x.id) === id);
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

/** Absolute public job URL on the marketing site (portal has no `/jobs/[slug]` route). */
function jobVacancyExternalHref(r: JobApplicationRecordClient, tenantId: string): string | null {
  const slug = r.jobSlug?.trim();
  if (!slug) return null;
  return publicJobPageHttpHrefForPortalTenant(tenantId, slug);
}

export function ApplicationsPanel({
  user,
  tenantId,
  jobs,
  initialVacancyId,
  initialJobRef,
}: {
  user: User;
  tenantId: string;
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
  const vacancyComboInputRef = useRef<HTMLInputElement | null>(null);
  /** Filters visible rows by candidate name and job fields (title, ref, company, slug). */
  const [vacancyRowSearch, setVacancyRowSearch] = useState("");
  /** Pipeline stages to include; at least one remains selected (see `StatusFilterChips`). */
  const [statusIncluded, setStatusIncluded] = useState<Set<JobApplicationStatus>>(
    () => new Set(JOB_APPLICATION_STATUSES),
  );
  const [rows, setRows] = useState<JobApplicationRecordClient[] | null>(null);
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

  const vacancyComboGateRef = useRef({ filterKey: "", dirty: false });
  vacancyComboGateRef.current = { filterKey, dirty: vacancyComboDirty };

  /** When the list opens, focus the field and select the current label so the next keystroke searches (replaces text). */
  useEffect(() => {
    if (!vacancyComboOpen) return;
    const el = vacancyComboInputRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      const { filterKey: fk, dirty } = vacancyComboGateRef.current;
      el.focus();
      if (fk && !dirty) {
        el.select();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [vacancyComboOpen]);

  const syncUrl = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "applications");
      if (!next) {
        params.delete("vacancy");
        params.delete("ref");
      } else if (next.startsWith("vacancy:")) {
        params.set("vacancy", normVacancyUuid(next.slice("vacancy:".length)));
        params.delete("ref");
      } else if (next.startsWith("ref:")) {
        params.set("ref", next.slice("ref:".length));
        params.delete("vacancy");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErr(null);
      setRows(null);
      try {
        const fetchList = async (forceRefresh: boolean) =>
          fetch("/api/portal/applications", {
            signal,
            headers: await portalAuthHeaders(user, { forceRefreshToken: forceRefresh }),
            credentials: "include",
            cache: "no-store",
          });
        let res = await fetchList(false);
        if (res.status === 401) {
          res = await fetchList(true);
        }
        if (signal?.aborted) return;
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
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (signal?.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load applications.");
        setRows(null);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user],
  );

  /** Refetch without clearing the table — used while screening is still processing. */
  const refreshApplicationsSilently = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const fetchList = async (forceRefresh: boolean) =>
          fetch("/api/portal/applications", {
            signal,
            headers: await portalAuthHeaders(user, { forceRefreshToken: forceRefresh }),
            credentials: "include",
            cache: "no-store",
          });
        let res = await fetchList(false);
        if (res.status === 401) {
          res = await fetchList(true);
        }
        if (signal?.aborted) return;
        const data = (await res.json().catch(() => ({}))) as {
          applications?: JobApplicationRecordClient[];
        };
        if (!res.ok) return;
        setRows(data.applications ?? []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        /* keep existing rows */
      }
    },
    [user],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
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
    let inFlight: AbortController | null = null;
    const id = window.setInterval(() => {
      inFlight?.abort();
      inFlight = new AbortController();
      void refreshApplicationsSilently(inFlight.signal);
    }, 4000);
    return () => {
      window.clearInterval(id);
      inFlight?.abort();
    };
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
      return list.filter((r) => r.jobRef.trim() === ref.trim());
    }
    if (filterKey.startsWith("vacancy:")) {
      const uuidNorm = normVacancyUuid(filterKey.slice("vacancy:".length));
      const job = jobs.find((x) => normVacancyUuid(x.id) === uuidNorm);
      return list.filter((r) => {
        const rid = normVacancyUuid(r.vacancyId);
        if (rid && rid === uuidNorm) return true;
        // Legacy rows with no vacancy id: match by job ref only (avoid ref fallback when id is set — wrong tenant row).
        if (!rid && job && r.jobRef.trim() === job.ref.trim()) return true;
        return false;
      });
    }
    return list;
  }, [rows, filterKey, jobs]);

  const filteredByStatus = useMemo(
    () => filteredByVacancy.filter((r) => statusIncluded.has(r.status)),
    [filteredByVacancy, statusIncluded],
  );

  const displayed = useMemo(() => {
    const q = vacancyRowSearch.trim().toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((r) => {
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
  }, [filteredByStatus, vacancyRowSearch]);

  const jobsForSelect = useMemo(() => {
    const q = vacancyComboQuery.trim().toLowerCase();
    // Only narrow the list while the user is typing. The value after picking a row is
    // `formatJobLabel` (uses — and ·) and does not match the simple `ref title company` join,
    // so filtering would hide every other vacancy until the user blurs.
    const shouldFilter = vacancyComboDirty && q.length > 0;
    let list = shouldFilter
      ? jobs.filter((j) =>
          [j.ref, j.title, j.companyName, j.slug ?? ""].join(" ").toLowerCase().includes(q),
        )
      : jobs;
    const selected = filterKey ? jobFromFilterKey(filterKey, jobs) : undefined;
    if (
      selected &&
      !list.some(
        (j) =>
          j.ref === selected.ref &&
          normVacancyUuid(j.id) === normVacancyUuid(selected.id),
      )
    ) {
      list = [selected, ...list];
    }
    return list;
  }, [jobs, vacancyComboQuery, filterKey, vacancyComboDirty]);

  const activeFilterLabel = filterLabel(jobs, filterKey);

  /** Notification banner: only while at least one visible row is still `new`. */
  const newApplicationCount = useMemo(
    () => displayed.filter((r) => r.status === "new").length,
    [displayed],
  );

  /** AI match first when screening exists; else newest first. */
  const sortedForCards = useMemo(() => {
    const list = [...displayed];
    const scoreValue = (r: JobApplicationRecordClient): number | null => {
      if (!r.screening) return null;
      const m = r.screening.match;
      const max = m.scoreMax ?? 100;
      if (max <= 0) return 0;
      return (m.score / max) * 100;
    };
    list.sort((a, b) => {
      const sa = scoreValue(a);
      const sb = scoreValue(b);
      if (sa != null && sb != null && sa !== sb) return sb - sa;
      if (sa != null && sb == null) return -1;
      if (sa == null && sb != null) return 1;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
    return list;
  }, [displayed]);

  const listHeaderJob = filterKey ? jobFromFilterKey(filterKey, jobs) : undefined;
  const aiScreeningAllIdle = !displayed.some((r) => isScreeningPendingOnRecord(r));
  const hasAnyScreening = displayed.some((r) => r.screening);

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
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8 dark:border-slate-500/25 dark:bg-[#243144]/80 dark:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">Candidates</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950 dark:text-slate-100">Applications</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-slate-400">
            Pick a vacancy (search as you type), narrow by pipeline status, then filter by name or job fields.
          </p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 lg:max-w-none lg:flex-1 lg:items-end xl:max-w-2xl">
          <div ref={vacancyComboRef} className="flex w-full min-w-0 flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-slate-400" htmlFor="vacancy-combobox-input">
              <span className="inline-flex items-center gap-1.5">
                <Funnel className="h-3.5 w-3.5 text-zinc-400 dark:text-slate-500" weight="duotone" aria-hidden />
                Vacancy
              </span>
            </label>
            <div className="relative">
              <input
                ref={vacancyComboInputRef}
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
                onClick={(e) => {
                  setVacancyComboOpen(true);
                  const el = e.currentTarget;
                  if (filterKey && !vacancyComboDirty) {
                    window.requestAnimationFrame(() => el.select());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setVacancyComboOpen(false);
                }}
                placeholder="Search by ref, title, company, or slug — then pick a row"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-20 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500"
                autoComplete="off"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                {vacancyComboQuery.trim() ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Clear vacancy search"
                    className="pointer-events-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearVacancyCombo();
                    }}
                  >
                    <X className="h-4 w-4" weight="bold" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={vacancyComboOpen ? "Close vacancy list" : "Open vacancy list"}
                  className="pointer-events-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => setVacancyComboOpen((o) => !o)}
                >
                  <CaretDown className="h-4 w-4" weight="bold" aria-hidden />
                </button>
              </div>
              {vacancyComboOpen ? (
                <ul
                  id="vacancy-combobox-listbox"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 text-left text-sm shadow-lg ring-1 ring-zinc-950/5 dark:border-slate-500/30 dark:bg-slate-800 dark:ring-slate-900/30"
                >
                  <li role="presentation" className="px-1">
                    <button
                      type="button"
                      role="option"
                      aria-selected={filterKey === ""}
                      className={`flex w-full rounded-lg px-3 py-2 text-left transition ${
                        filterKey === ""
                          ? "bg-[#2563EB]/10 font-medium text-[#1d4ed8] dark:bg-sky-500/15 dark:text-sky-300"
                          : "text-zinc-800 hover:bg-[#2563EB]/10 hover:font-medium hover:text-[#1d4ed8] dark:text-slate-200 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
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
                          className={`flex w-full rounded-lg px-3 py-2 text-left transition ${
                            selected
                              ? "bg-[#2563EB]/10 font-medium text-[#1d4ed8] dark:bg-sky-500/15 dark:text-sky-300"
                              : "text-zinc-800 hover:bg-[#2563EB]/10 hover:font-medium hover:text-[#1d4ed8] dark:text-slate-200 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
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
          <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-medium text-zinc-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <MagnifyingGlass className="h-3.5 w-3.5 text-zinc-400 dark:text-slate-500" weight="duotone" aria-hidden />
              Filter applicants by job or name
            </span>
            <input
              type="search"
              value={vacancyRowSearch}
              onChange={(e) => setVacancyRowSearch(e.target.value)}
              placeholder="Match name, title, ref, company, or slug on each row…"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500"
              autoComplete="off"
            />
          </label>
          <StatusFilterChips
            included={statusIncluded}
            onChange={setStatusIncluded}
            id="applications-status-filter"
            className="w-full"
          />
          <div className="flex w-full flex-wrap gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-slate-500/25 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/70"
            >
              Refresh
            </button>
            <button
              type="button"
              disabled={loading || !rows?.length}
              onClick={downloadAllApplicationsCsv}
              title="Download every application in your account as a CSV (not limited by the vacancy filter)."
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
            >
              <FileCsv className="h-4 w-4 text-[#2563EB]" weight="duotone" aria-hidden />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {!loading && rows !== null && newApplicationCount > 0 ? (
        <div
          className="mt-6 flex flex-col gap-2 rounded-2xl border border-[#2563EB]/25 bg-gradient-to-br from-[#2563EB]/[0.08] via-white to-amber-50/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-sky-500/20 dark:from-sky-500/10 dark:via-slate-800/40 dark:to-slate-800/20"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/15 text-[#1d4ed8] dark:bg-sky-500/20 dark:text-sky-300">
              <Bell className="h-5 w-5" weight="duotone" aria-hidden />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-zinc-950 dark:text-slate-100">
                {newApplicationCount} new {newApplicationCount === 1 ? "application" : "applications"}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-slate-400">
                {activeFilterLabel ? (
                  <>
                    In this filter: <span className="font-medium text-zinc-800 dark:text-slate-200">{activeFilterLabel}</span>
                    {filterKey.startsWith("ref:") ? (
                      <span className="text-zinc-400 dark:text-slate-500"> · by job reference</span>
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
        <p className="mt-8 text-sm text-zinc-500 dark:text-slate-400">Loading…</p>
      ) : err ? null : displayed.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500 dark:border-slate-500/30 dark:bg-slate-800/30 dark:text-slate-400">
          <p>
            {!rows?.length
              ? "No applications yet."
              : filteredByVacancy.length === 0
                ? activeFilterLabel
                  ? "No applications for this vacancy."
                  : "No applications yet."
                : filteredByStatus.length === 0
                  ? "No applicants match the selected status filters — turn on at least one stage above."
                  : vacancyRowSearch.trim()
                    ? "No applicants match your search — try different keywords or clear the search."
                    : "No applications yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100 sm:text-lg">
                {listHeaderJob
                  ? `${listHeaderJob.title} · ${displayed.length} applicant${displayed.length === 1 ? "" : "s"}`
                  : `All vacancies · ${displayed.length} applicant${displayed.length === 1 ? "" : "s"}`}
              </h3>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-slate-400">
                {hasAnyScreening
                  ? "Ranked by AI match score"
                  : "Sorted by application date (newest first)"}
              </p>
            </div>
            {displayed.length > 0 ? (
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium ${
                  aiScreeningAllIdle
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50"
                    : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/40"
                }`}
              >
                <Sparkle className="h-3.5 w-3.5" weight="fill" aria-hidden />
                {aiScreeningAllIdle ? "AI screening complete" : "AI screening in progress"}
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-zinc-400 dark:text-slate-500">
            Click a candidate to open details and AI screening. Change pipeline status in the expanded panel.
          </p>
          <ul className="mt-4 space-y-3">
            {sortedForCards.map((r) => (
              <ApplicantRankedCard
                key={r.id}
                r={r}
                expanded={screeningExpandedId === r.id}
                onToggle={() => setScreeningExpandedId((cur) => (cur === r.id ? null : r.id))}
                onUpdateStatus={updateStatus}
                onDownloadCv={downloadCv}
                jobPublicHref={jobVacancyExternalHref(r, tenantId)}
                pendingScreening={isScreeningPendingOnRecord(r)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
