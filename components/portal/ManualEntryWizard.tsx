"use client";

import type { JobDetail } from "@/data/jobs";
import { JOB_SIZE_BANDS, JOB_SIZE_BAND_LABELS } from "@/data/job-types";
import type { User } from "firebase/auth";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { portalAuthHeaders } from "@/lib/portal-auth";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

type BackendSync = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
};

type Props = {
  user: User;
  onBack: () => void;
};

export function ManualEntryWizard({ user, onBack }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [publishPending, setPublishPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [type, setType] = useState("");
  const [comp, setComp] = useState("");
  const [location, setLocation] = useState("");
  const [sizeBand, setSizeBand] = useState("51-200");
  const [skillsText, setSkillsText] = useState("");
  const [regionsText, setRegionsText] = useState("");
  const [salaryHighlight, setSalaryHighlight] = useState("");
  const [equityNote, setEquityNote] = useState("");
  const [clientLine, setClientLine] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [companyTagline, setCompanyTagline] = useState("");
  const [industriesText, setIndustriesText] = useState("");

  useEffect(() => {
    if (ok) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [ok]);

  function next() {
    setErr(null);
    if (step === 1 && !description.trim()) {
      setErr("Add a full job description.");
      return;
    }
    if (step === 2) {
      if (!title.trim() || !companyName.trim() || !type.trim() || !comp.trim() || !location.trim()) {
        setErr("Fill in title, company, type, compensation, and location.");
        return;
      }
    }
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  }

  function back() {
    setErr(null);
    if (step === 1) onBack();
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  async function publish() {
    setErr(null);
    setOk(null);
    setPublishPending(true);
    try {
      const fd = new FormData();
      fd.set("description", description.trim());
      fd.set("title", title.trim());
      fd.set("companyName", companyName.trim());
      fd.set("type", type.trim());
      fd.set("comp", comp.trim());
      fd.set("location", location.trim());
      fd.set("sizeBand", sizeBand);
      fd.set("skillsText", skillsText);
      fd.set("regionsText", regionsText);
      fd.set("salaryHighlight", salaryHighlight);
      fd.set("equityNote", equityNote);
      fd.set("clientLine", clientLine);
      fd.set("locationTag", locationTag);
      fd.set("companySize", companySize);
      fd.set("experienceLevel", experienceLevel);
      fd.set("companyTagline", companyTagline);
      fd.set("industriesText", industriesText);

      const headers = await portalAuthHeaders(user);
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
        msg += ` Your company’s systems didn’t update (${b.status ?? "?"}).`;
      }
      setOk(msg);
      await router.refresh();
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.08)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-[#7107E7]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {step === 1 ? "Back" : "Previous step"}
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          Manual entry · Step {step} of 3
        </p>
      </div>

      <h2 className="mt-4 font-display text-lg font-semibold text-zinc-950">Add a role yourself</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {step === 1 && "Paste the full job description."}
        {step === 2 && "Fill in the basics. They’ll appear on the listing when you publish."}
        {step === 3 && "Optional extras — leave blank and we’ll use sensible defaults."}
      </p>

      {err ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900" role="status">
          {ok}
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        {step === 1 && (
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-zinc-700">Full description</span>
            <textarea
              className="min-h-[280px] w-full resize-y rounded-xl border border-zinc-200 bg-[#F9F9FB] px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the complete job description. Use blank lines between sections for clearer layout on the public page."
            />
          </label>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Title</span>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Company</span>
              <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Labs" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Type</span>
              <input className={inputClass} value={type} onChange={(e) => setType(e.target.value)} placeholder="Full-time" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Compensation</span>
              <input className={inputClass} value={comp} onChange={(e) => setComp(e.target.value)} placeholder="$140k–$170k" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Location</span>
              <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote · UK" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Company size (band)</span>
              <select className={`${inputClass} cursor-pointer`} value={sizeBand} onChange={(e) => setSizeBand(e.target.value)}>
                {JOB_SIZE_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {JOB_SIZE_BAND_LABELS[b]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-zinc-500">Skills</span>
              <input className={inputClass} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="Rust, Kubernetes, TypeScript" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-zinc-500">Regions</span>
              <input className={inputClass} value={regionsText} onChange={(e) => setRegionsText(e.target.value)} placeholder="United Kingdom, Remote" />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Salary highlight</span>
              <input className={inputClass} value={salaryHighlight} onChange={(e) => setSalaryHighlight(e.target.value)} placeholder="$150k base" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Equity note</span>
              <input className={inputClass} value={equityNote} onChange={(e) => setEquityNote(e.target.value)} placeholder="Equity package TBD" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Location tag</span>
              <input className={inputClass} value={locationTag} onChange={(e) => setLocationTag(e.target.value)} placeholder="UK · Remote" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Company size (label)</span>
              <input className={inputClass} value={companySize} onChange={(e) => setCompanySize(e.target.value)} placeholder="51–200 employees" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-zinc-500">Client line</span>
              <input className={inputClass} value={clientLine} onChange={(e) => setClientLine(e.target.value)} placeholder="Posted for Acme · Series B" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-zinc-500">Company tagline</span>
              <input className={inputClass} value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} placeholder="Infrastructure for modern teams" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Experience level</span>
              <input className={inputClass} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} placeholder="Senior" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-zinc-500">Industries</span>
              <input className={inputClass} value={industriesText} onChange={(e) => setIndustriesText(e.target.value)} placeholder="SaaS, Developer tools" />
            </label>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-6">
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.4)] transition hover:bg-[#5b06c2]"
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={publishPending}
            onClick={() => void publish()}
            className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.4)] transition hover:bg-[#5b06c2] disabled:opacity-50"
          >
            {publishPending ? "Publishing…" : "Publish listing"}
          </button>
        )}
      </div>
    </section>
  );
}
