"use client";

import type { JobDetail } from "@/data/jobs";
import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth, signOut } from "firebase/auth";
import Link from "next/link";
import { FileText, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

type BackendSync = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

async function authHeaders(user: User) {
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` } as const;
}

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
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  async function handleDelete(ref: string) {
    if (!confirm(`Delete ${ref}?`)) return;
    setErr(null);
    setOk(null);
    const headers = await authHeaders(user);
    const res = await fetch(`/api/portal/jobs/${encodeURIComponent(ref)}`, {
      method: "DELETE",
      headers: { ...headers },
      credentials: "include",
    });
    if (!res.ok) {
      setErr("Could not delete.");
      return;
    }
    setJobs((list) => list.filter((j) => j.ref !== ref));
    startTransition(() => router.refresh());
    setOk("Removed.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    if (mode === "file") {
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) {
        setErr("Choose a job description file.");
        return;
      }
    } else {
      const desc = String(fd.get("description") ?? "").trim();
      if (!desc) {
        setErr("Add a job description or switch to Upload.");
        return;
      }
    }

    const headers = await authHeaders(user);
    const res = await fetch("/api/portal/jobs", {
      method: "POST",
      body: fd,
      headers: { ...headers },
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      job?: JobDetail;
      backend?: BackendSync;
    };
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not save.");
      return;
    }

    let msg = `Published ${data.job?.ref ?? "role"}.`;
    const b = data.backend;
    if (b && !b.skipped && !b.ok) {
      msg += ` Backend sync failed (${b.status ?? "?"}).`;
    }
    setOk(msg);
    e.currentTarget.reset();
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">Portal</p>
          <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-zinc-950">Vacancies</h1>
          <p className="mt-1 text-xs text-zinc-500">{displayName}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut(getAuth(getApp()))}
          className="text-xs font-medium text-zinc-500 underline-offset-4 transition hover:text-[#7107E7] hover:underline"
        >
          Sign out
        </button>
      </header>

      {err ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900" role="status">
          {ok}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">New listing</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-zinc-950">Add a role</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Fill in the basics, then either paste the description or upload a file — not both.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Role details — always */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-zinc-700">Role details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Title</span>
                <input className={inputClass} name="title" required placeholder="Senior Engineer" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Company</span>
                <input className={inputClass} name="companyName" required placeholder="Acme Labs" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Type</span>
                <input className={inputClass} name="type" required placeholder="Full-time" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Compensation</span>
                <input className={inputClass} name="comp" required placeholder="$140k–$170k" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Location</span>
                <input className={inputClass} name="location" required placeholder="Remote · UK" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Company size</span>
                <select className={`${inputClass} cursor-pointer`} name="sizeBand" defaultValue="101-250">
                  <option value="1-100">1–100</option>
                  <option value="101-250">101–250</option>
                  <option value="201-500">201–500</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-zinc-500">Skills</span>
                <input className={inputClass} name="skillsText" placeholder="Rust, Kubernetes, TypeScript" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-zinc-500">Regions</span>
                <input className={inputClass} name="regionsText" placeholder="United Kingdom, Remote" />
              </label>
            </div>
          </div>

          {/* Mode: description source */}
          <div className="border-t border-zinc-100 pt-8">
            <p className="text-xs font-medium text-zinc-700">Job description</p>
            <p className="mt-1 text-xs text-zinc-500">Choose how you add the full description.</p>

            <div
              className="mt-4 inline-flex rounded-full border border-zinc-200/90 bg-zinc-100/60 p-1"
              role="tablist"
              aria-label="Description source"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "text"}
                onClick={() => setMode("text")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "text"
                    ? "bg-[#7107E7] text-white shadow-[0_4px_14px_-4px_rgba(113,7,231,0.45)]"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileText className="h-4 w-4" weight="duotone" aria-hidden />
                Paste text
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "file"}
                onClick={() => setMode("file")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "file"
                    ? "bg-[#7107E7] text-white shadow-[0_4px_14px_-4px_rgba(113,7,231,0.45)]"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <UploadSimple className="h-4 w-4" weight="duotone" aria-hidden />
                Upload file
              </button>
            </div>

            <div className="mt-6">
              {mode === "text" ? (
                <div className="rounded-2xl border border-[#7107E7]/20 bg-gradient-to-b from-[#7107E7]/[0.06] to-transparent p-1">
                  <label className="block rounded-[14px] bg-white p-4 sm:p-5">
                    <span className="mb-2 block text-xs font-medium text-zinc-700">Full description</span>
                    <textarea
                      className="min-h-[200px] w-full resize-y rounded-xl border border-zinc-200 bg-[#F9F9FB] px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12"
                      name="description"
                      placeholder="Paste the complete job description here. Use blank lines between sections for clearer layout on the public page."
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    id={fileInputId}
                    type="file"
                    name="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="sr-only"
                  />
                  <label
                    htmlFor={fileInputId}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setFileDrag(true);
                    }}
                    onDragLeave={() => setFileDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setFileDrag(false);
                      const f = e.dataTransfer.files[0];
                      const input = fileInputRef.current;
                      if (f && input) {
                        const dt = new DataTransfer();
                        dt.items.add(f);
                        input.files = dt.files;
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
                      fileDrag
                        ? "border-[#7107E7] bg-[#7107E7]/10"
                        : "border-[#7107E7]/30 bg-[#7107E7]/[0.04] hover:border-[#7107E7]/50 hover:bg-[#7107E7]/[0.07]"
                    }`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7107E7]/12 text-[#7107E7]">
                      <UploadSimple className="h-6 w-6" weight="duotone" aria-hidden />
                    </span>
                    <span className="mt-4 font-medium text-zinc-900">Drop a file or click to browse</span>
                    <span className="mt-1 text-sm text-zinc-500">Plain text or Markdown · max 512KB</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-zinc-100 pt-6">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.4)] transition hover:bg-[#5b06c2] disabled:opacity-50"
            >
              {pending ? "Publishing…" : "Publish listing"}
            </button>
          </div>
        </form>
      </section>

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
                  onClick={() => handleDelete(job.ref)}
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
