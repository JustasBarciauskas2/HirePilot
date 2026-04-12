"use client";

import type { JobDetail } from "@/data/jobs";
import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth, signOut } from "firebase/auth";
import { EnvelopeSimple, FileText, SignOut, Trash, UploadSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { portalAuthHeaders } from "@/lib/portal-auth";
import { FileUploadWizard } from "@/components/portal/FileUploadWizard";
import { ManualEntryWizard } from "@/components/portal/ManualEntryWizard";

type Flow = "choose" | "file" | "manual";

export function PortalDashboard({
  initialJobs,
  user,
  displayName,
}: {
  initialJobs: JobDetail[];
  user: User;
  displayName: string;
}) {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("choose");
  const [jobs, setJobs] = useState(initialJobs);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

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

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <header className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Portal</p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-zinc-950">Vacancies</h1>
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

      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {deleteError}
        </p>
      ) : null}

      {flow === "choose" ? (
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
              onClick={() => setFlow("manual")}
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

      {flow === "file" ? <FileUploadWizard user={user} onBack={() => setFlow("choose")} /> : null}
      {flow === "manual" ? <ManualEntryWizard user={user} onBack={() => setFlow("choose")} /> : null}

      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Open listings</p>
        <p className="mt-1 text-xs text-zinc-500">
          {jobs.length} role{jobs.length === 1 ? "" : "s"} ·{" "}
          <Link href="/#roles" className="font-medium text-[#7107E7] underline-offset-2 hover:underline">
            View on site
          </Link>
        </p>
        <ul className="mt-5 space-y-3">
          {jobs.map((job) => (
            <li
              key={job.ref}
              className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-zinc-400">{job.ref}</p>
                <p className="truncate text-sm font-medium text-zinc-900">{job.title}</p>
                <p className="truncate text-xs text-zinc-500">{job.companyName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/jobs/${job.slug}`}
                  className="text-xs font-semibold text-[#7107E7] underline-offset-2 hover:underline"
                >
                  View
                </Link>
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
          ))}
        </ul>
      </section>
    </div>
  );
}
