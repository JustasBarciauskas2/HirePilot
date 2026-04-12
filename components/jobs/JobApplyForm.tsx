"use client";

import type { JobDetail } from "@/data/jobs";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { useState } from "react";

export function JobApplyForm({ job }: { job: JobDetail }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) {
      setErr("Please attach your CV (PDF or Word).");
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("jobSlug", job.slug);
      fd.set("firstName", firstName.trim());
      fd.set("lastName", lastName.trim());
      fd.set("email", email.trim());
      fd.set("phone", phone.trim());
      fd.set("cv", file);

      const res = await fetch("/api/job-applications", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
        return;
      }
      setDone(true);
    } catch {
      setErr("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-5 py-6 text-sm text-emerald-950 shadow-sm ring-1 ring-emerald-200/60">
        <p className="font-semibold">Application received</p>
        <p className="mt-2 leading-relaxed text-emerald-900/90">
          Thanks — we&apos;ve received your details for <span className="font-medium">{job.title}</span> at{" "}
          {job.companyName}. If your profile is a fit, someone will be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {err ? (
        <p className="rounded-xl border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {err}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700">First name</span>
          <input
            required
            autoComplete="given-name"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-200/80 transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Sam"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700">Last name</span>
          <input
            required
            autoComplete="family-name"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Rivera"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-zinc-700">Email</span>
        <input
          required
          type="email"
          autoComplete="email"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.name@email.com"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-zinc-700">Phone (optional)</span>
        <input
          type="tel"
          autoComplete="tel"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/40 focus:ring-2 focus:ring-[#7107E7]/12"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +44 …"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-zinc-700">CV</span>
        <input
          required
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#7107E7]/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#5b06c2]"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="mt-1 block text-xs text-zinc-500">PDF or Word · max 5MB</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7107E7] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.35)] transition hover:bg-[#5b06c2] disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          "Submitting…"
        ) : (
          <>
            <PaperPlaneRight className="h-4 w-4" weight="bold" aria-hidden />
            Submit application
          </>
        )}
      </button>
    </form>
  );
}
