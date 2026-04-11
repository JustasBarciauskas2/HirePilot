"use client";

import type { JobDetail } from "@/data/jobs";
import Link from "next/link";
import { Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const labelClass = "block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500";
const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15";
const selectClass = inputClass;

export function PortalDashboard({
  initialJobs,
  displayName,
}: {
  initialJobs: JobDetail[];
  displayName: string;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  async function handleDelete(ref: string) {
    if (!confirm(`Delete vacancy ${ref}? This cannot be undone.`)) return;
    setErr(null);
    setOk(null);
    const res = await fetch(`/api/portal/jobs/${encodeURIComponent(ref)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setErr("Could not delete this vacancy.");
      return;
    }
    setJobs((list) => list.filter((j) => j.ref !== ref));
    startTransition(() => router.refresh());
    setOk(`Removed ${ref}.`);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/portal/jobs", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; job?: JobDetail };
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not add vacancy.");
      return;
    }
    setOk(`Added ${data.job?.ref ?? "new role"}.`);
    e.currentTarget.reset();
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-950">Recruiter portal</h1>
          <p className="mt-1 text-sm text-zinc-600">Signed in as {displayName}</p>
        </div>
        <a
          href="/auth/logout"
          className="inline-flex items-center justify-center self-start rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5 hover:text-[#5b06c2]"
        >
          Log out
        </a>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {ok}
        </p>
      ) : null}

      <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)] sm:p-8">
        <h2 className="font-display text-lg font-semibold text-zinc-950">Add a vacancy</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Paste a job description below and/or upload a <span className="font-mono text-xs">.txt</span> or{" "}
          <span className="font-mono text-xs">.md</span> file. Paragraphs are split into role sections on the public
          page.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="title">
                Job title
              </label>
              <input className={inputClass} id="title" name="title" required placeholder="Senior Product Engineer" />
            </div>
            <div>
              <label className={labelClass} htmlFor="companyName">
                Company
              </label>
              <input className={inputClass} id="companyName" name="companyName" required placeholder="Acme Labs" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="type">
                Employment type
              </label>
              <input className={inputClass} id="type" name="type" required placeholder="Full-time" />
            </div>
            <div>
              <label className={labelClass} htmlFor="comp">
                Compensation
              </label>
              <input className={inputClass} id="comp" name="comp" required placeholder="$160k–$190k + equity" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="location">
                Location
              </label>
              <input className={inputClass} id="location" name="location" required placeholder="Remote · EU" />
            </div>
            <div>
              <label className={labelClass} htmlFor="sizeBand">
                Company size (filter)
              </label>
              <select className={selectClass} id="sizeBand" name="sizeBand" defaultValue="101-250">
                <option value="1-100">1–100</option>
                <option value="101-250">101–250</option>
                <option value="201-500">201–500</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="skillsText">
                Skills (comma-separated)
              </label>
              <input
                className={inputClass}
                id="skillsText"
                name="skillsText"
                placeholder="TypeScript, React, Node"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="regionsText">
                Regions (comma-separated)
              </label>
              <input
                className={inputClass}
                id="regionsText"
                name="regionsText"
                placeholder="United Kingdom, Remote"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="description">
              Job description
            </label>
            <textarea
              className={`${inputClass} min-h-[160px] resize-y`}
              id="description"
              name="description"
              placeholder="Paste the full job description. Use blank lines between sections for best results."
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="file">
                Optional file
            </label>
            <input
              className="mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#7107E7]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#5b06c2] hover:file:bg-[#7107E7]/15"
              id="file"
              name="file"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
            />
            <p className="mt-1 text-xs text-zinc-500">Appended after the text area. Max 512KB.</p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.45)] transition hover:bg-[#5b06c2] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Publish vacancy"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-zinc-950">Current vacancies</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {jobs.length} role{jobs.length === 1 ? "" : "s"} · also listed on the{" "}
          <Link href="/#roles" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
            homepage
          </Link>
        </p>

        <ul className="mt-6 divide-y divide-zinc-200/90 rounded-2xl border border-zinc-200/90 bg-white">
          {jobs.map((job) => (
            <li key={job.ref} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-500">{job.ref}</p>
                <p className="font-medium text-zinc-900">{job.title}</p>
                <p className="text-sm text-zinc-600">{job.companyName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/jobs/${job.slug}`}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(job.ref)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
                >
                  <Trash className="h-4 w-4" aria-hidden />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
