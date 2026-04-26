"use client";

import { ApplicantRankedCard } from "@/components/portal/ApplicantRankedCard";
import { ApplicationPipelineEditor } from "@/components/portal/ApplicationPipelineEditor";
import { StatusFilterChips } from "@/components/portal/StatusFilterChips";
import { countUnreadApplications, isApplicationUnread } from "@/lib/application-inbox-storage";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  type ApplicationPipelineStatus,
  type JobApplicationRecordClient,
  type RecruiterApplicationComment,
  isScreeningPendingOnRecord,
  orderedStatusFilterOptions,
} from "@techrecruit/shared/lib/job-application-shared";
import { buildApplicationsCsv, triggerCsvDownload } from "@techrecruit/shared/lib/applications-csv";
import { publicJobPageHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import {
  CaretDown,
  FileCsv,
  Funnel,
  ListBullets,
  MagnifyingGlass,
  Sparkle,
  Tray,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  viewedApplicationIds,
  inboxBaselineMs,
  onMarkApplicantViewed,
  onMarkAllApplicantsViewed,
  onApplicationRowsLoaded,
  applicationPipeline,
  onApplicationPipelineSaved,
}: {
  user: User;
  tenantId: string;
  jobs: JobDetail[];
  initialVacancyId?: string;
  initialJobRef?: string;
  viewedApplicationIds: Set<string>;
  /** Per-browser inbox start time: only applications newer than this can be unread (fresh users skip historical backlog). */
  inboxBaselineMs: number | null;
  onMarkApplicantViewed: (applicationId: string) => void;
  /** Marks every loaded application id as opened (full account list, not the filtered view). */
  onMarkAllApplicantsViewed: (applicationIds: string[]) => void;
  /** Lets the shell keep an unread badge in sync with the same list the panel uses. */
  onApplicationRowsLoaded?: (rows: JobApplicationRecordClient[] | null) => void;
  applicationPipeline: ApplicationPipelineStatus[];
  onApplicationPipelineSaved: (next: ApplicationPipelineStatus[]) => void;
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
  const [statusIncluded, setStatusIncluded] = useState<Set<string>>(
    () => new Set(applicationPipeline.map((s) => s.id)),
  );
  const [pipelineEditorOpen, setPipelineEditorOpen] = useState(false);
  const [rows, setRows] = useState<JobApplicationRecordClient[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Expanded application row for AI screening details (recruiter-only). */
  const [screeningExpandedId, setScreeningExpandedId] = useState<string | null>(null);

  const statusFilterOptions = useMemo(
    () => orderedStatusFilterOptions(applicationPipeline, (rows ?? []).map((r) => r.status)),
    [applicationPipeline, rows],
  );

  const statusFilterKey = statusFilterOptions.map((s) => s.id).join("\0");

  useEffect(() => {
    setStatusIncluded(new Set(statusFilterOptions.map((s) => s.id)));
  }, [statusFilterKey]);

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
        const nextRows = data.applications ?? [];
        setRows(nextRows);
        onApplicationRowsLoaded?.(nextRows);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (signal?.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load applications.");
        setRows(null);
        onApplicationRowsLoaded?.(null);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user, onApplicationRowsLoaded],
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
        const nextRows = data.applications ?? [];
        setRows(nextRows);
        onApplicationRowsLoaded?.(nextRows);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        /* keep existing rows */
      }
    },
    [user, onApplicationRowsLoaded],
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

  async function updateStatus(id: string, status: string) {
    let previous: string | undefined;
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

  async function addRecruiterComment(id: string, text: string): Promise<boolean> {
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch(`/api/portal/applications/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return false;
      const data = (await res.json().catch(() => ({}))) as { comment?: RecruiterApplicationComment };
      if (!data.comment) return false;
      setRows((prev) => {
        if (!prev) return prev;
        return prev.map((r) => {
          if (r.id !== id) return r;
          const merged = [...(r.recruiterComments ?? []), data.comment!];
          merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          return { ...r, recruiterComments: merged };
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  async function updateRecruiterComment(
    applicationId: string,
    commentId: string,
    text: string,
  ): Promise<boolean> {
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch(
        `/api/portal/applications/${encodeURIComponent(applicationId)}/comments/${encodeURIComponent(commentId)}`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text }),
        },
      );
      if (!res.ok) return false;
      const data = (await res.json().catch(() => ({}))) as { comment?: RecruiterApplicationComment };
      if (!data.comment) return false;
      setRows((prev) => {
        if (!prev) return prev;
        return prev.map((r) => {
          if (r.id !== applicationId) return r;
          return {
            ...r,
            recruiterComments: (r.recruiterComments ?? []).map((c) => (c.id === commentId ? data.comment! : c)),
          };
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  async function deleteRecruiterComment(applicationId: string, commentId: string): Promise<boolean> {
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch(
        `/api/portal/applications/${encodeURIComponent(applicationId)}/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE", headers, credentials: "include" },
      );
      if (!res.ok) return false;
      setRows((prev) => {
        if (!prev) return prev;
        return prev.map((r) => {
          if (r.id !== applicationId) return r;
          return {
            ...r,
            recruiterComments: (r.recruiterComments ?? []).filter((c) => c.id !== commentId),
          };
        });
      });
      return true;
    } catch {
      return false;
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
    const csv = buildApplicationsCsv(rows, applicationPipeline);
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

  const [addOpen, setAddOpen] = useState(false);
  const [intakeJobSlug, setIntakeJobSlug] = useState("");
  const [intakeFirst, setIntakeFirst] = useState("");
  const [intakeLast, setIntakeLast] = useState("");
  const [intakeEmail, setIntakeEmail] = useState("");
  const [intakePhone, setIntakePhone] = useState("");
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [intakeErr, setIntakeErr] = useState<string | null>(null);
  const [intakeOk, setIntakeOk] = useState(false);
  const intakeFileRef = useRef<HTMLInputElement>(null);

  function openAddPanel() {
    setIntakeErr(null);
    setIntakeOk(false);
    setAddOpen(true);
    const j = jobFromFilterKey(filterKey, jobs) ?? (jobs.length ? jobs[0] : undefined);
    setIntakeJobSlug(j?.slug?.trim() ?? "");
  }

  function closeAddPanel() {
    setAddOpen(false);
  }

  useEffect(() => {
    if (!addOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAddOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [addOpen]);

  async function submitIntake(e: FormEvent) {
    e.preventDefault();
    setIntakeErr(null);
    setIntakeOk(false);
    if (!intakeJobSlug.trim()) {
      setIntakeErr("Choose a vacancy.");
      return;
    }
    if (!intakeFirst.trim() || !intakeLast.trim()) {
      setIntakeErr("First name and last name are required.");
      return;
    }
    if (!intakeEmail.trim()) {
      setIntakeErr("Email is required.");
      return;
    }
    if (!intakeFile || intakeFile.size === 0) {
      setIntakeErr("Attach a CV (PDF or Word).");
      return;
    }
    setIntakeSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("jobSlug", intakeJobSlug.trim());
      fd.set("firstName", intakeFirst.trim());
      fd.set("lastName", intakeLast.trim());
      fd.set("email", intakeEmail.trim());
      fd.set("phone", intakePhone.trim());
      fd.set("cv", intakeFile);
      const doPost = async (forceRefresh: boolean) =>
        fetch("/api/portal/applications", {
          method: "POST",
          body: fd,
          headers: await portalAuthHeaders(user, { forceRefreshToken: forceRefresh }),
          credentials: "include",
        });
      let res = await doPost(false);
      if (res.status === 401) {
        res = await doPost(true);
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setIntakeErr(typeof data.error === "string" && data.error.trim() ? data.error : `Failed (${res.status})`);
        return;
      }
      setIntakeOk(true);
      setIntakeFirst("");
      setIntakeLast("");
      setIntakeEmail("");
      setIntakePhone("");
      setIntakeFile(null);
      if (intakeFileRef.current) intakeFileRef.current.value = "";
      void load();
    } catch (err) {
      setIntakeErr(err instanceof Error ? err.message : "Could not add applicant.");
    } finally {
      setIntakeSubmitting(false);
    }
  }

  /** Full-list unread count (same basis as the sidebar badge). */
  const unreadInboxCount = useMemo(
    () => countUnreadApplications(rows, viewedApplicationIds, inboxBaselineMs),
    [rows, viewedApplicationIds, inboxBaselineMs],
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
                placeholder="Search by ref, title, company, or public page path — then pick a row"
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
              placeholder="Match name, title, ref, company, or public page path on each row…"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500"
              autoComplete="off"
            />
          </label>
          <StatusFilterChips
            statuses={statusFilterOptions}
            included={statusIncluded}
            onChange={setStatusIncluded}
            id="applications-status-filter"
            className="w-full"
          />
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPipelineEditorOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
              title="Customize pipeline stages for your whole team"
            >
              <ListBullets className="h-4 w-4 text-[#2563EB]" weight="duotone" aria-hidden />
              Pipeline stages
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-slate-500/25 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/70"
            >
              Refresh
            </button>
            {!addOpen ? (
              <button
                type="button"
                onClick={openAddPanel}
                disabled={!jobs.length}
                title={
                  !jobs.length
                    ? "Add at least one open vacancy to attach candidates."
                    : "Add a candidate without using the public apply form."
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-2.5 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#2563EB]/12 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
              >
                <UserPlus className="h-4 w-4" weight="duotone" aria-hidden />
                Add applicant
              </button>
            ) : null}
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

      {addOpen ? (
        <div className="mt-6 w-full min-w-0">
          <form
            onSubmit={(e) => void submitIntake(e)}
            className="w-full overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/90 shadow-sm ring-1 ring-zinc-950/[0.04] dark:border-slate-500/30 dark:bg-slate-800/40 dark:ring-slate-950/20"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 bg-white/80 px-4 py-4 sm:px-6 dark:border-slate-500/20 dark:bg-slate-900/20">
              <div className="min-w-0 pr-2">
                <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100 sm:text-lg">
                  Add applicant manually
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-slate-400">
                  Headhunters and internal teams: same apply pipeline as the public job page (storage, Firestore, Java
                  webhook, AI screening)—without applicant or recruiter notification emails.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddPanel}
                className="shrink-0 rounded-xl border border-zinc-200/90 bg-white p-2.5 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800 dark:border-slate-500/40 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close form"
              >
                <X className="h-5 w-5" weight="bold" aria-hidden />
              </button>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              {intakeErr ? (
                <p
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                  role="alert"
                >
                  {intakeErr}
                </p>
              ) : null}
              {intakeOk ? (
                <p
                  className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                  role="status"
                >
                  Application saved. The list was refreshed; screening may take a few seconds to appear.
                </p>
              ) : null}

              <div className="mx-auto flex max-w-4xl flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-zinc-600 dark:text-slate-400"
                    htmlFor="intake-vacancy-select"
                  >
                    Vacancy
                  </label>
                  <select
                    id="intake-vacancy-select"
                    value={intakeJobSlug}
                    onChange={(e) => {
                      setIntakeJobSlug(e.target.value);
                      setIntakeErr(null);
                      setIntakeOk(false);
                    }}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                    required
                  >
                    {jobs.map((j) => (
                      <option key={`${j.ref}-${j.id ?? j.slug}`} value={j.slug}>
                        {formatJobLabel(j)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-slate-500">
                    Candidate
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-slate-400">
                      First name
                      <input
                        value={intakeFirst}
                        onChange={(e) => setIntakeFirst(e.target.value)}
                        autoComplete="given-name"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-slate-400">
                      Last name
                      <input
                        value={intakeLast}
                        onChange={(e) => setIntakeLast(e.target.value)}
                        autoComplete="family-name"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-slate-400">
                      Email
                      <input
                        type="email"
                        value={intakeEmail}
                        onChange={(e) => setIntakeEmail(e.target.value)}
                        autoComplete="email"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-slate-400">
                      Phone
                      <input
                        value={intakePhone}
                        onChange={(e) => setIntakePhone(e.target.value)}
                        autoComplete="tel"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-zinc-600 dark:text-slate-400">CV (PDF or Word, max 5MB)</span>
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300/90 bg-white/60 px-3 py-3 dark:border-slate-500/35 dark:bg-slate-800/30">
                    <input
                      ref={intakeFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setIntakeFile(f);
                        setIntakeErr(null);
                        setIntakeOk(false);
                      }}
                      className="text-sm text-zinc-800 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-800 dark:text-slate-200 dark:file:bg-slate-700 dark:file:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-zinc-200/80 bg-white/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 dark:border-slate-500/20 dark:bg-slate-900/20">
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={closeAddPanel}
                  className="order-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 sm:order-1 dark:border-slate-500/35 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={intakeSubmitting}
                  className="order-1 w-full rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 sm:w-auto dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {intakeSubmitting ? "Saving…" : "Save application"}
                </button>
              </div>
            </div>
          </form>
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
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-sm text-zinc-500 dark:text-slate-400">
                  {hasAnyScreening
                    ? "Ranked by AI match score"
                    : "Sorted by application date (newest first)"}
                </p>
                {unreadInboxCount > 0 ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1d4ed8] ring-1 ring-[#2563EB]/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25"
                    title="New applicants since you started using this inbox on this device, that you have not opened yet"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <Tray className="h-3.5 w-3.5" weight="duotone" aria-hidden />
                    {unreadInboxCount} unread
                  </span>
                ) : null}
                {rows?.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      onMarkAllApplicantsViewed(rows.map((r) => r.id).filter((id) => Boolean(id?.trim())))
                    }
                    className="text-xs font-semibold text-[#2563EB] underline decoration-[#2563EB]/35 underline-offset-2 transition hover:text-[#1d4ed8] hover:decoration-[#2563EB]/60 dark:text-sky-400 dark:decoration-sky-400/40 dark:hover:text-sky-300"
                  >
                    Mark all as read
                  </button>
                ) : null}
              </div>
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
            Open a row to read it—new applicants (since this inbox started on this device) that you have not opened yet
            show a blue dot. Use “Mark all as read” to clear the list. Team notes, CV, and AI screening live in the
            expanded panel.
          </p>
          <ul className="mt-4 space-y-3">
            {sortedForCards.map((r) => (
              <ApplicantRankedCard
                key={r.id}
                r={r}
                expanded={screeningExpandedId === r.id}
                unread={
                  inboxBaselineMs != null && isApplicationUnread(r, viewedApplicationIds, inboxBaselineMs)
                }
                onToggle={() => {
                  setScreeningExpandedId((cur) => {
                    if (cur === r.id) return null;
                    onMarkApplicantViewed(r.id);
                    return r.id;
                  });
                }}
                statusSelectOptions={statusFilterOptions}
                onUpdateStatus={updateStatus}
                onAddComment={addRecruiterComment}
                onUpdateComment={updateRecruiterComment}
                onDeleteComment={deleteRecruiterComment}
                recruiterUserId={user.uid}
                onDownloadCv={downloadCv}
                jobPublicHref={jobVacancyExternalHref(r, tenantId)}
                pendingScreening={isScreeningPendingOnRecord(r)}
              />
            ))}
          </ul>
        </>
      )}
      <ApplicationPipelineEditor
        open={pipelineEditorOpen}
        onClose={() => setPipelineEditorOpen(false)}
        pipeline={applicationPipeline}
        rows={rows}
        user={user}
        onSaved={onApplicationPipelineSaved}
      />
    </section>
  );
}
