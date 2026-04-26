"use client";

import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  DEFAULT_APPLICATION_PIPELINE_STATUSES,
  type ApplicationPipelineStatus,
  type JobApplicationRecordClient,
} from "@techrecruit/shared/lib/job-application-shared";
import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth, signOut } from "firebase/auth";
import {
  ArrowClockwise,
  Briefcase,
  ChartLine,
  Copy,
  EnvelopeSimple,
  FileText,
  GearSix,
  MagnifyingGlass,
  PencilSimple,
  SignOut,
  Trash,
  UploadSimple,
  Users,
  UsersThree,
} from "@phosphor-icons/react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  marketingSiteRootHttpHrefForPortalTenant,
  marketingSiteRolesHttpHrefForPortalTenant,
  publicJobPageHttpHrefForPortalTenant,
} from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { ApplicationsPanel } from "@/components/portal/ApplicationsPanel";
import { FileUploadWizard } from "@/components/portal/FileUploadWizard";
import {
  countUnreadApplications,
  loadViewedApplicationIds,
  persistViewedApplicationIds,
} from "@/lib/application-inbox-storage";
import { ManualEntryWizard } from "@/components/portal/ManualEntryWizard";
import { PortalAnalyticsPanel } from "@/components/portal/PortalAnalyticsPanel";
import { PortalSettingsPanel } from "@/components/portal/PortalSettingsPanel";
import { PortalTeamPanel } from "@/components/portal/PortalTeamPanel";
import { PortalThemeToggle } from "@/components/portal/PortalThemeToggle";

type Flow = "choose" | "file" | "manual";
type PortalTab = "vacancies" | "applications" | "analytics" | "users" | "settings";

function jobMatchesOpenListingsFilter(job: JobDetail, q: string): boolean {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return true;
  const haystack = [job.ref, job.title, job.companyName, job.slug, job.id ?? ""].join(" ").toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}

export function PortalDashboard({
  initialJobs,
  tenantId,
  user,
  displayName,
  teamDirectoryEnabled,
}: {
  initialJobs: JobDetail[];
  tenantId: string;
  user: User;
  displayName: string;
  /** True when `PORTAL_TENANT_FIREBASE_CLAIM` is set — enables per-tenant team directory and admin user management. */
  teamDirectoryEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [flow, setFlow] = useState<Flow>("choose");
  /** When set, manual entry opens in edit mode (PUT + same form). */
  const [jobToEdit, setJobToEdit] = useState<JobDetail | null>(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [openListingsFilter, setOpenListingsFilter] = useState("");
  const [portalTab, setPortalTab] = useState<PortalTab>(() => {
    const t = searchParams.get("tab");
    if (t === "analytics") return "analytics";
    if (t === "settings") return "settings";
    if (t === "users" && teamDirectoryEnabled) return "users";
    const open =
      t === "applications" ||
      Boolean(searchParams.get("vacancy")?.trim()) ||
      Boolean(searchParams.get("ref")?.trim());
    return open ? "applications" : "vacancies";
  });

  /** Full applications list for unread badge when not on Applications tab (panel syncs when it is). */
  const [inboxApplicationRows, setInboxApplicationRows] = useState<JobApplicationRecordClient[] | null>(null);
  const [viewedApplicationIds, setViewedApplicationIds] = useState<Set<string>>(() =>
    loadViewedApplicationIds(tenantId, user.uid),
  );

  const [applicationPipeline, setApplicationPipeline] = useState<ApplicationPipelineStatus[]>(() => [
    ...DEFAULT_APPLICATION_PIPELINE_STATUSES,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const headers = await portalAuthHeaders(user);
        const res = await fetch("/api/portal/application-pipeline", {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => ({}))) as { statuses?: ApplicationPipelineStatus[] };
        if (cancelled || !Array.isArray(data.statuses) || !data.statuses.length) return;
        setApplicationPipeline(data.statuses);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setViewedApplicationIds(loadViewedApplicationIds(tenantId, user.uid));
  }, [tenantId, user.uid]);

  const markApplicantViewed = useCallback(
    (applicationId: string) => {
      setViewedApplicationIds((prev) => {
        if (prev.has(applicationId)) return prev;
        const next = new Set(prev);
        next.add(applicationId);
        persistViewedApplicationIds(tenantId, user.uid, next);
        return next;
      });
    },
    [tenantId, user.uid],
  );

  const onApplicationRowsLoaded = useCallback((rows: JobApplicationRecordClient[] | null) => {
    setInboxApplicationRows(rows);
  }, []);

  const fetchInboxApplications = useCallback(async () => {
    try {
      const fetchList = async (forceRefresh: boolean) =>
        fetch("/api/portal/applications", {
          headers: await portalAuthHeaders(user, { forceRefreshToken: forceRefresh }),
          credentials: "include",
          cache: "no-store",
        });
      let res = await fetchList(false);
      if (res.status === 401) res = await fetchList(true);
      const data = (await res.json().catch(() => ({}))) as { applications?: JobApplicationRecordClient[] };
      if (res.ok) setInboxApplicationRows(data.applications ?? []);
    } catch {
      /* keep prior */
    }
  }, [user]);

  useEffect(() => {
    if (portalTab === "applications") return;
    void fetchInboxApplications();
  }, [portalTab, fetchInboxApplications]);

  const applicationsUnreadCount = useMemo(
    () => countUnreadApplications(inboxApplicationRows, viewedApplicationIds),
    [inboxApplicationRows, viewedApplicationIds],
  );

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "analytics") {
      setPortalTab("analytics");
      return;
    }
    if (t === "settings") {
      setPortalTab("settings");
      return;
    }
    if (t === "users") {
      if (teamDirectoryEnabled) {
        setPortalTab("users");
      } else {
        setPortalTab("vacancies");
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tab");
        params.delete("vacancy");
        params.delete("ref");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
      return;
    }
    const open =
      t === "applications" ||
      Boolean(searchParams.get("vacancy")?.trim()) ||
      Boolean(searchParams.get("ref")?.trim());
    setPortalTab(open ? "applications" : "vacancies");
  }, [searchParams, teamDirectoryEnabled, pathname, router]);

  const setPortalTabWithUrl = useCallback(
    (tab: PortalTab) => {
      setPortalTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "applications") {
        params.set("tab", "applications");
      } else if (tab === "analytics") {
        params.set("tab", "analytics");
        params.delete("vacancy");
        params.delete("ref");
      } else if (tab === "users") {
        params.set("tab", "users");
        params.delete("vacancy");
        params.delete("ref");
      } else if (tab === "settings") {
        params.set("tab", "settings");
        params.delete("vacancy");
        params.delete("ref");
      } else {
        params.delete("tab");
        params.delete("vacancy");
        params.delete("ref");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function openApplicationsForJob(job: JobDetail) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "applications");
    const vid = job.id?.trim();
    if (vid) {
      params.set("vacancy", vid);
      params.delete("ref");
    } else {
      params.set("ref", job.ref);
      params.delete("vacancy");
    }
    setPortalTab("applications");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleDelete(job: JobDetail) {
    const label = job.ref;
    if (!confirm(`Delete ${label}?`)) return;
    setDeleteError(null);
    const headers = await portalAuthHeaders(user);
    const vid = job.id?.trim();
    const qs = vid ? `?id=${encodeURIComponent(vid)}` : "";
    const res = await fetch(`/api/portal/jobs/${encodeURIComponent(job.ref)}${qs}`, {
      method: "DELETE",
      headers: { ...headers },
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Delete failed (${res.status})`;
      setDeleteError(msg);
      return;
    }
    setJobs((list) =>
      job.id ? list.filter((j) => j.id !== job.id) : list.filter((j) => j.ref !== job.ref),
    );
    startTransition(() => router.refresh());
  }

  const filteredOpenListings = useMemo(
    () => jobs.filter((j) => jobMatchesOpenListingsFilter(j, openListingsFilter)),
    [jobs, openListingsFilter],
  );

  const marketingRolesHref = useMemo(
    () => marketingSiteRolesHttpHrefForPortalTenant(tenantId),
    [tenantId],
  );
  const marketingRootHref = useMemo(
    () => marketingSiteRootHttpHrefForPortalTenant(tenantId),
    [tenantId],
  );

  async function copyJobPublicLink(job: JobDetail) {
    if (typeof window === "undefined") return;
    const url = publicJobPageHttpHrefForPortalTenant(tenantId, job.slug);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRef(job.ref);
      window.setTimeout(() => setCopiedRef((r) => (r === job.ref ? null : r)), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedRef(job.ref);
        window.setTimeout(() => setCopiedRef((r) => (r === job.ref ? null : r)), 2000);
      } catch {
        /* ignore */
      }
    }
  }

  const pageTitle =
    portalTab === "vacancies"
      ? "Vacancies"
      : portalTab === "analytics"
        ? "Analytics"
        : portalTab === "users"
          ? "Team"
          : portalTab === "settings"
            ? "Settings"
            : "Applications";
  const pageSubtitle =
    portalTab === "vacancies"
      ? "Create and manage open roles and listings."
      : portalTab === "analytics"
        ? "Pipeline, intake, and applications by vacancy."
        : portalTab === "users"
          ? "Who has access to this portal for your organization."
          : portalTab === "settings"
            ? "Notifications and password."
            : "Review candidates and applications.";

  const tabButtonMobile = (
    tab: PortalTab,
    icon: ReactNode,
    label: string,
    options?: { unreadBadge?: number },
  ) => {
    const n = options?.unreadBadge ?? 0;
    const showBadge = tab === "applications" && n > 0;
    return (
      <button
        type="button"
        onClick={() => setPortalTabWithUrl(tab)}
        aria-label={showBadge ? `${label}, ${n} unread` : label}
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:gap-1.5 sm:px-2 sm:text-sm ${
          portalTab === tab
            ? "bg-white text-[#0B1F3A] shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600/80"
            : "text-slate-600 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <span className="relative inline-flex shrink-0">
          {icon}
          {showBadge ? (
            <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 max-w-[2.25rem] items-center justify-center rounded-full bg-[#2563EB] px-0.5 text-[9px] font-bold leading-none text-white dark:bg-sky-500">
              {n > 99 ? "99+" : n}
            </span>
          ) : null}
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const tabButtonSidebar = (
    tab: PortalTab,
    icon: ReactNode,
    label: string,
    options?: { unreadBadge?: number },
  ) => {
    const n = options?.unreadBadge ?? 0;
    const showBadge = tab === "applications" && n > 0;
    return (
      <button
        type="button"
        onClick={() => setPortalTabWithUrl(tab)}
        aria-label={showBadge ? `${label}, ${n} unread` : label}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
          portalTab === tab
            ? "bg-[#F8FAFC] text-[#0B1F3A] shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/90 dark:text-slate-100 dark:ring-slate-600/70"
            : "text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        {showBadge ? (
          <span
            className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold leading-none text-white tabular-nums dark:bg-sky-500"
            aria-hidden
          >
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="relative w-full min-h-screen flex-1 overflow-x-hidden bg-[#F8FAFC] dark:bg-background">
      <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-500/20 dark:bg-[#1c2638]/90 md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
              <Image src="/brand-logo.png" alt="" width={36} height={36} className="h-7 w-7 object-contain" unoptimized />
            </span>
            <span className="truncate font-display text-sm font-semibold text-[#0B1F3A] dark:text-slate-100">Recruiter portal</span>
          </div>
          <PortalThemeToggle />
        </div>
        <div className="flex gap-1 px-2 pb-2">
          {tabButtonMobile(
            "vacancies",
            <Briefcase className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />,
            "Vacancies",
          )}
          {tabButtonMobile(
            "applications",
            <Users className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />,
            "Applications",
            { unreadBadge: applicationsUnreadCount },
          )}
          {tabButtonMobile(
            "analytics",
            <ChartLine className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />,
            "Analytics",
          )}
          {teamDirectoryEnabled
            ? tabButtonMobile(
                "users",
                <UsersThree className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />,
                "Team",
              )
            : null}
          {tabButtonMobile(
            "settings",
            <GearSix className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />,
            "Settings",
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs dark:border-slate-700/80">
          {marketingRootHref ? (
            <a href={marketingRootHref} className="font-medium text-[#2563EB] dark:text-sky-400">
              Back to site
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => signOut(getAuth(getApp()))}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300"
          >
            <SignOut className="h-3.5 w-3.5" weight="duotone" aria-hidden />
            Sign out
          </button>
        </div>
      </div>

      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/80 bg-white dark:border-slate-500/20 dark:bg-[#1c2638]/95 md:flex lg:w-64"
        aria-label="Recruiter portal navigation"
      >
        <div className="shrink-0">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5 dark:border-slate-500/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <Image src="/brand-logo.png" alt="" width={40} height={40} className="h-8 w-8 object-contain" priority unoptimized />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-[#0B1F3A] dark:text-slate-100">Recruiter portal</p>
              <p className="font-sans text-[10px] font-medium tracking-[0.18em] text-slate-400 dark:text-slate-500">
                HirePilot
              </p>
            </div>
          </div>
          <p className="px-4 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recruitment</p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2" aria-label="Portal sections">
          {tabButtonSidebar(
            "vacancies",
            <Briefcase className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />,
            "Vacancies",
          )}
          {tabButtonSidebar(
            "applications",
            <Users className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />,
            "Applications",
            { unreadBadge: applicationsUnreadCount },
          )}
          {tabButtonSidebar(
            "analytics",
            <ChartLine className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />,
            "Analytics",
          )}
          {teamDirectoryEnabled
            ? tabButtonSidebar(
                "users",
                <UsersThree className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />,
                "Team",
              )
            : null}
          {tabButtonSidebar(
            "settings",
            <GearSix className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />,
            "Settings",
          )}
        </nav>
        <div className="shrink-0 space-y-2 border-t border-slate-100 p-3 dark:border-slate-500/15">
          <p className="flex items-center gap-1.5 truncate rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 font-mono text-[10px] text-slate-700 dark:border-slate-500/20 dark:bg-slate-800/40 dark:text-slate-300">
            <EnvelopeSimple className="h-3.5 w-3.5 shrink-0 text-slate-400" weight="duotone" aria-hidden />
            <span className="truncate" title={displayName}>
              {displayName}
            </span>
          </p>
          {marketingRootHref ? (
            <a
              href={marketingRootHref}
              className="flex w-full items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-[#2563EB]/30 hover:text-[#2563EB] dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:text-sky-300"
            >
              Back to site
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => signOut(getAuth(getApp()))}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB]/30 hover:bg-[#2563EB]/[0.06] hover:text-[#1d4ed8] dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-100 dark:hover:border-sky-500/35"
          >
            <SignOut className="h-4 w-4 text-slate-500 dark:text-slate-400" weight="duotone" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60 lg:pl-64">
        <header className="sticky top-0 z-20 hidden shrink-0 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-sm dark:border-slate-500/20 dark:bg-[#1c2638]/90 sm:px-6 sm:py-5 md:block">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 sm:flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Recruiter portal</p>
              <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-[#0B1F3A] dark:text-slate-100">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pageSubtitle}</p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 self-start sm:ml-auto sm:w-auto sm:shrink-0 sm:self-center">
              <div className="inline-flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
                <PortalThemeToggle />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.reload();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#2563EB]/35 hover:text-[#2563EB] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:text-sky-300"
                >
                  <ArrowClockwise className="h-4 w-4" weight="duotone" aria-hidden />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="shrink-0 border-b border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-500/20 dark:bg-[#1c2638]/88 md:hidden">
          <h1 className="font-display text-lg font-semibold text-[#0B1F3A] dark:text-slate-100">{pageTitle}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{pageSubtitle}</p>
        </div>

        <div className="flex-1">
          <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 pb-20 sm:px-6 lg:px-8">
      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {deleteError}
        </p>
      ) : null}

      {portalTab === "applications" ? (
        <ApplicationsPanel
          user={user}
          tenantId={tenantId}
          jobs={jobs}
          initialVacancyId={searchParams.get("vacancy") ?? undefined}
          initialJobRef={searchParams.get("ref") ?? undefined}
          viewedApplicationIds={viewedApplicationIds}
          onMarkApplicantViewed={markApplicantViewed}
          onApplicationRowsLoaded={onApplicationRowsLoaded}
          applicationPipeline={applicationPipeline}
          onApplicationPipelineSaved={setApplicationPipeline}
        />
      ) : null}

      {portalTab === "analytics" ? (
        <PortalAnalyticsPanel
          user={user}
          tenantId={tenantId}
          jobs={jobs}
          applicationPipeline={applicationPipeline}
          onOpenApplicationsForJob={openApplicationsForJob}
        />
      ) : null}

      {portalTab === "settings" ? <PortalSettingsPanel user={user} /> : null}

      {portalTab === "users" && teamDirectoryEnabled ? <PortalTeamPanel user={user} tenantId={tenantId} /> : null}

      {portalTab === "vacancies" && flow === "choose" ? (
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8 dark:border-slate-500/25 dark:bg-[#243144]/80 dark:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">New listing</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950 dark:text-slate-100">How do you want to add this role?</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
            Upload a file with the job, or fill in the form yourself — whichever is easier.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFlow("file")}
              className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-5 py-6 text-left transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/[0.04] dark:border-slate-500/25 dark:bg-slate-800/40 dark:hover:border-[#2563EB]/30 dark:hover:bg-[#2563EB]/[0.08]"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-slate-100">
                <UploadSimple className="h-5 w-5 shrink-0 text-[#2563EB] dark:text-sky-400" weight="duotone" aria-hidden />
                Upload document
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                Pick a file, then check the details before you publish.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setJobToEdit(null);
                setFlow("manual");
              }}
              className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-5 py-6 text-left transition hover:border-[#2563EB]/40 hover:bg-[#2563EB]/[0.04] dark:border-slate-500/25 dark:bg-slate-800/40 dark:hover:border-[#2563EB]/30 dark:hover:bg-[#2563EB]/[0.08]"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-slate-100">
                <FileText className="h-5 w-5 shrink-0 text-[#2563EB] dark:text-sky-400" weight="duotone" aria-hidden />
                Enter manually
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                Same six sections as after a document upload — fill in what you need, then publish.
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {portalTab === "vacancies" && flow === "file" ? (
        <FileUploadWizard
          user={user}
          tenantId={tenantId}
          onBack={() => setFlow("choose")}
        />
      ) : null}
      {portalTab === "vacancies" && flow === "manual" ? (
        <ManualEntryWizard
          user={user}
          tenantId={tenantId}
          jobToEdit={jobToEdit}
          onAfterPublish={() => setJobToEdit(null)}
          onBack={() => {
            setFlow("choose");
            setJobToEdit(null);
          }}
        />
      ) : null}

      {portalTab === "vacancies" ? (
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">Open listings</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            {openListingsFilter.trim()
              ? `${filteredOpenListings.length} of ${jobs.length} role${jobs.length === 1 ? "" : "s"}`
              : `${jobs.length} role${jobs.length === 1 ? "" : "s"}`}{" "}
            ·{" "}
            {marketingRolesHref ? (
              <a
                href={marketingRolesHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
              >
                View on site
              </a>
            ) : (
              <span
                className="cursor-not-allowed font-medium text-zinc-400 dark:text-slate-500"
                title="On production, set NEXT_PUBLIC_MARKETING_SITE_URL on the portal host (e.g. Netlify env). Local dev can also infer from NEXT_PUBLIC_PORTAL_URL (e.g. :3001 → :3000)."
              >
                View on site
              </span>
            )}
          </p>
          <label className="flex w-full min-w-0 max-w-full items-center gap-2 sm:max-w-sm">
            <span className="sr-only">Filter listings</span>
            <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-slate-500" weight="duotone" aria-hidden />
            <input
              id="portal-open-listings-filter"
              type="search"
              value={openListingsFilter}
              onChange={(e) => setOpenListingsFilter(e.target.value)}
              placeholder="Filter by title, company, ref…"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500"
              autoComplete="off"
              aria-label="Filter open listings"
            />
          </label>
        </div>
        {filteredOpenListings.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {filteredOpenListings.map((job) => {
              const publicJobHref = publicJobPageHttpHrefForPortalTenant(tenantId, job.slug);
              return (
              <li
                key={`${job.ref}-${job.id ?? ""}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3 dark:border-slate-500/25 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-zinc-400 dark:text-slate-500">{job.ref}</p>
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-slate-100">{job.title}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{job.companyName}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-3">
                  {publicJobHref ? (
                    <a
                      href={publicJobHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      View
                    </a>
                  ) : (
                    <span
                      className="cursor-not-allowed text-xs font-semibold text-zinc-400 dark:text-slate-500"
                      title="On production, set NEXT_PUBLIC_MARKETING_SITE_URL on the portal host (e.g. Netlify env). Local dev can also infer from NEXT_PUBLIC_PORTAL_URL (e.g. :3001 → :3000)."
                    >
                      View
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setJobToEdit(job);
                      setFlow("manual");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] underline-offset-2 transition hover:text-[#1d4ed8] hover:underline dark:text-sky-400"
                    title="Edit this vacancy"
                  >
                    <PencilSimple className="h-3.5 w-3.5 shrink-0" weight="bold" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openApplicationsForJob(job)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] underline-offset-2 transition hover:text-[#1d4ed8] hover:underline dark:text-sky-400"
                    title="Open applications for this vacancy"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
                    Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyJobPublicLink(job)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                    title="Copy public link to this vacancy"
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
                    {copiedRef === job.ref ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${job.ref}`}
                    onClick={() => handleDelete(job)}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Trash className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        ) : null}
        {jobs.length > 0 && filteredOpenListings.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-slate-500/30 dark:bg-slate-800/30 dark:text-slate-400">
            No listings match &ldquo;{openListingsFilter.trim()}&rdquo;. Try another search or clear the filter.
          </p>
        ) : null}
        {jobs.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-slate-500/30 dark:bg-slate-800/30 dark:text-slate-400">
            No open listings yet — add a role above.
          </p>
        ) : null}
      </section>
      ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
