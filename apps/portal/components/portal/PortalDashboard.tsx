"use client";

import type { JobDetail } from "@techrecruit/shared/data/jobs";
import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth, signOut } from "firebase/auth";
import {
  Briefcase,
  Copy,
  EnvelopeSimple,
  FileText,
  MagnifyingGlass,
  PencilSimple,
  SignOut,
  Trash,
  UploadSimple,
  Users,
} from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  marketingSiteRolesHttpHrefForPortalTenant,
  publicJobPageHttpHrefForPortalTenant,
} from "@techrecruit/shared/lib/portal-tenant";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { ApplicationsPanel } from "@/components/portal/ApplicationsPanel";
import { FileUploadWizard } from "@/components/portal/FileUploadWizard";
import { ManualEntryWizard } from "@/components/portal/ManualEntryWizard";

type Flow = "choose" | "file" | "manual";
type PortalTab = "vacancies" | "applications";

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
}: {
  initialJobs: JobDetail[];
  tenantId: string;
  user: User;
  displayName: string;
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
    const open =
      searchParams.get("tab") === "applications" ||
      Boolean(searchParams.get("vacancy")?.trim()) ||
      Boolean(searchParams.get("ref")?.trim());
    return open ? "applications" : "vacancies";
  });

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    const open =
      searchParams.get("tab") === "applications" ||
      Boolean(searchParams.get("vacancy")?.trim()) ||
      Boolean(searchParams.get("ref")?.trim());
    setPortalTab(open ? "applications" : "vacancies");
  }, [searchParams]);

  const setPortalTabWithUrl = useCallback(
    (tab: PortalTab) => {
      setPortalTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "applications") {
        params.set("tab", "applications");
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

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Portal</p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-zinc-950">Dashboard</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">Signed in as</span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50 px-2.5 py-1.5 font-mono text-[11px] leading-none text-zinc-800 sm:text-xs">
                <EnvelopeSimple className="h-3.5 w-3.5 shrink-0 text-zinc-400" weight="duotone" aria-hidden />
                <span className="truncate" title={displayName}>
                  {displayName}
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut(getAuth(getApp()))}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/[0.06] hover:text-[#5b06c2] sm:self-center"
          >
            <SignOut className="h-4 w-4 text-zinc-500" weight="duotone" aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setPortalTabWithUrl("vacancies")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
            portalTab === "vacancies"
              ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200/80"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Briefcase className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
          Vacancies
        </button>
        <button
          type="button"
          onClick={() => setPortalTabWithUrl("applications")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
            portalTab === "applications"
              ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200/80"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Users className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
          Applications
        </button>
      </div>

      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
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
        />
      ) : null}

      {portalTab === "vacancies" && flow === "choose" ? (
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">New listing</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950">How do you want to add this role?</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a file with the job, or fill in the form yourself — whichever is easier.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFlow("file")}
              className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-5 py-6 text-left transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/[0.04]"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-900">
                <UploadSimple className="h-5 w-5 shrink-0 text-[#7107E7]" weight="duotone" aria-hidden />
                Upload document
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-zinc-500">
                Pick a file, then check the details before you publish.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setJobToEdit(null);
                setFlow("manual");
              }}
              className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-5 py-6 text-left transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/[0.04]"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-900">
                <FileText className="h-5 w-5 shrink-0 text-[#7107E7]" weight="duotone" aria-hidden />
                Enter manually
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-zinc-500">
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
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Open listings</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs text-zinc-500">
            {openListingsFilter.trim()
              ? `${filteredOpenListings.length} of ${jobs.length} role${jobs.length === 1 ? "" : "s"}`
              : `${jobs.length} role${jobs.length === 1 ? "" : "s"}`}{" "}
            ·{" "}
            {marketingRolesHref ? (
              <a
                href={marketingRolesHref}
                className="font-medium text-[#7107E7] underline-offset-2 hover:underline"
              >
                View on site
              </a>
            ) : (
              <span
                className="cursor-not-allowed font-medium text-zinc-400"
                title="On production, set NEXT_PUBLIC_MARKETING_SITE_URL on the portal host (e.g. Netlify env). Local dev can also infer from NEXT_PUBLIC_PORTAL_URL (e.g. :3001 → :3000)."
              >
                View on site
              </span>
            )}
          </p>
          <label className="flex w-full min-w-0 max-w-full items-center gap-2 sm:max-w-sm">
            <span className="sr-only">Filter listings</span>
            <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-zinc-400" weight="duotone" aria-hidden />
            <input
              id="portal-open-listings-filter"
              type="search"
              value={openListingsFilter}
              onChange={(e) => setOpenListingsFilter(e.target.value)}
              placeholder="Filter by title, company, ref…"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
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
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-zinc-400">{job.ref}</p>
                  <p className="truncate text-sm font-medium text-zinc-900">{job.title}</p>
                  <p className="truncate text-xs text-zinc-500">{job.companyName}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-3">
                  {publicJobHref ? (
                    <a
                      href={publicJobHref}
                      className="text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span
                      className="cursor-not-allowed text-xs font-semibold text-zinc-400"
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
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7107E7] underline-offset-2 transition hover:text-[#5b06c2] hover:underline"
                    title="Edit this vacancy"
                  >
                    <PencilSimple className="h-3.5 w-3.5 shrink-0" weight="bold" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openApplicationsForJob(job)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7107E7] underline-offset-2 transition hover:text-[#5b06c2] hover:underline"
                    title="Open applications for this vacancy"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
                    Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyJobPublicLink(job)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                    title="Copy public link to this vacancy"
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
                    {copiedRef === job.ref ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${job.ref}`}
                    onClick={() => handleDelete(job)}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
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
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600">
            No listings match &ldquo;{openListingsFilter.trim()}&rdquo;. Try another search or clear the filter.
          </p>
        ) : null}
        {jobs.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600">
            No open listings yet — add a role above.
          </p>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}
