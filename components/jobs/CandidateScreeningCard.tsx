"use client";

import type { CandidateMatchFitLabel, CandidateScreeningResult } from "@/lib/candidate-screening-result";

const FIT_DISPLAY: Record<
  CandidateMatchFitLabel,
  { label: string; className: string }
> = {
  strong_fit: {
    label: "Strong fit",
    className: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  },
  moderate_fit: {
    label: "Moderate fit",
    className: "bg-amber-100 text-amber-950 ring-amber-200/80",
  },
  weak_fit: {
    label: "Weak fit",
    className: "bg-orange-100 text-orange-950 ring-orange-200/80",
  },
  not_a_fit: {
    label: "Not a strong fit",
    className: "bg-red-100 text-red-900 ring-red-200/80",
  },
};

const RELEVANCE_RING: Record<"high" | "medium" | "low", string> = {
  high: "ring-[#7107E7]/35 bg-[#7107E7]/10 text-[#5b06c2]",
  medium: "ring-zinc-200/90 bg-zinc-100 text-zinc-800",
  low: "ring-zinc-200/60 bg-zinc-50 text-zinc-600",
};

/** AI screening summary — used in the recruiter portal (and optionally elsewhere when `screening` is present). */
export function CandidateScreeningCard({ screening }: { screening: CandidateScreeningResult }) {
  const { match, jobAppliedFor, attributes, candidateName } = screening;
  const max = match.scoreMax ?? 100;
  const fit = FIT_DISPLAY[match.fitLabel] ?? FIT_DISPLAY.moderate_fit;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)] ring-1 ring-zinc-950/5">
      <div className="border-b border-zinc-100 bg-gradient-to-br from-[#7107E7]/[0.06] via-white to-zinc-50/80 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">Application screening</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight text-zinc-950">{candidateName}</p>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{jobAppliedFor.jobTitle}</span>
              <span className="text-zinc-400"> · </span>
              {jobAppliedFor.companyName}
            </p>
            {jobAppliedFor.jobSlug ? (
              <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{jobAppliedFor.jobRef}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${fit.className}`}
            >
              {fit.label}
            </span>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Match score</p>
                <p className="font-display text-3xl font-bold tabular-nums text-[#7107E7]">
                  {Math.round(match.score)}
                  <span className="text-lg font-semibold text-zinc-400">/{max}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Experience</p>
                <p className="font-display text-2xl font-semibold tabular-nums text-zinc-900">
                  {Math.round(match.experienceScore)}
                  <span className="text-base font-medium text-zinc-400">/{max}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        {match.headline ? (
          <p className="mt-3 text-sm font-medium text-zinc-800">{match.headline}</p>
        ) : null}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">Summary</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">{match.summary}</p>
        </div>

        {match.insights.length > 0 ? (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">Insights</p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-zinc-700">
              {match.insights.map((line, i) => (
                <li key={i} className="pl-0.5 marker:text-[#7107E7]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {match.rationale ? (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">Recruiter note</p>
            <p className="mt-1.5 leading-relaxed">{match.rationale}</p>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">Key attributes</p>
          {attributes.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {attributes.skills.map((s, i) => (
                <span
                  key={`${s.name}-${i}`}
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${
                    s.relevance ? RELEVANCE_RING[s.relevance] : "bg-zinc-100 text-zinc-800 ring-zinc-200/90"
                  }`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 space-y-1 text-sm text-zinc-700">
            {attributes.experience ? (
              <p>
                <span className="font-medium text-zinc-900">Experience: </span>
                {attributes.experience}
              </p>
            ) : null}
            {attributes.location ? (
              <p>
                <span className="font-medium text-zinc-900">Location: </span>
                {attributes.location}
              </p>
            ) : null}
          </div>
        </div>

        {screening.meta?.generatedAt ? (
          <p className="text-[10px] text-zinc-400">
            Screening generated {new Date(screening.meta.generatedAt).toLocaleString()}
            {screening.meta.model ? ` · ${screening.meta.model}` : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
