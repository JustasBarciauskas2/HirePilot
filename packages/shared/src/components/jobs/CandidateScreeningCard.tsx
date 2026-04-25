"use client";

import type {
  CandidateMatchFitLabel,
  CandidateScreeningResult,
  CandidateScreeningSkillAttribute,
} from "@techrecruit/shared/lib/candidate-screening-result";

/** High / medium / low relevance pills first (most highlighted), then unspecified. */
function sortSkillsByRelevanceHighlight(skills: CandidateScreeningSkillAttribute[]): CandidateScreeningSkillAttribute[] {
  const order = { high: 0, medium: 1, low: 2 } as const;
  return [...skills].sort((a, b) => {
    const ra = a.relevance != null ? (order[a.relevance] ?? 3) : 3;
    const rb = b.relevance != null ? (order[b.relevance] ?? 3) : 3;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

const FIT_DISPLAY: Record<
  CandidateMatchFitLabel,
  { label: string; className: string }
> = {
  strong_fit: {
    label: "Strong fit",
    className:
      "bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-700/50",
  },
  moderate_fit: {
    label: "Moderate fit",
    className:
      "bg-amber-100 text-amber-950 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-700/45",
  },
  weak_fit: {
    label: "Weak fit",
    className:
      "bg-orange-100 text-orange-950 ring-orange-200/80 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800/50",
  },
  not_a_fit: {
    label: "Not a strong fit",
    className: "bg-red-100 text-red-900 ring-red-200/80 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-800/50",
  },
};

const RELEVANCE_RING: Record<"high" | "medium" | "low", string> = {
  high: "ring-[#7107E7]/35 bg-[#7107E7]/10 text-[#5b06c2] dark:ring-violet-500/45 dark:bg-violet-950/50 dark:text-violet-200",
  medium: "ring-zinc-200/90 bg-zinc-100 text-zinc-800 dark:ring-slate-500/40 dark:bg-slate-800/80 dark:text-slate-200",
  low: "ring-zinc-200/60 bg-zinc-50 text-zinc-600 dark:ring-slate-600/50 dark:bg-slate-800/50 dark:text-slate-400",
};

type CandidateScreeningCardProps = {
  screening: CandidateScreeningResult;
  /** When set (e.g. portal), shows a footer control so recruiters can collapse without scrolling back to the row. */
  onClose?: () => void;
};

/** AI screening summary — used in the recruiter portal (and optionally elsewhere when `screening` is present). */
export function CandidateScreeningCard({ screening, onClose }: CandidateScreeningCardProps) {
  const { match, jobAppliedFor, attributes, candidateName } = screening;
  const name = candidateName?.trim();
  const max = match.scoreMax ?? 100;
  const fit = FIT_DISPLAY[match.fitLabel] ?? FIT_DISPLAY.moderate_fit;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)] ring-1 ring-zinc-950/5 dark:border-slate-500/35 dark:bg-[#1a2332] dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-slate-950/30">
      <div className="border-b border-zinc-100 bg-gradient-to-br from-[#7107E7]/[0.06] via-white to-zinc-50/80 px-5 py-4 dark:border-slate-500/25 dark:from-violet-950/30 dark:via-slate-800/90 dark:to-slate-900/70 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
          Application screening
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {name ? (
              <>
                <p className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-slate-50">
                  {name}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
                  <span className="font-medium text-zinc-800 dark:text-slate-100">{jobAppliedFor.jobTitle}</span>
                  <span className="text-zinc-400 dark:text-slate-500"> · </span>
                  {jobAppliedFor.companyName}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-slate-300">
                <span className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-slate-50">
                  {jobAppliedFor.jobTitle}
                </span>
                <span className="text-zinc-400 dark:text-slate-500"> · </span>
                {jobAppliedFor.companyName}
              </p>
            )}
            {jobAppliedFor.jobSlug ? (
              <p className="mt-0.5 font-mono text-[10px] text-zinc-400 dark:text-slate-500">{jobAppliedFor.jobRef}</p>
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
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                  Match score
                </p>
                <p className="font-display text-3xl font-bold tabular-nums text-[#7107E7] dark:text-violet-300">
                  {Math.round(match.score)}
                  <span className="text-lg font-semibold text-zinc-400 dark:text-slate-500">/{max}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                  Experience
                </p>
                <p className="font-display text-2xl font-semibold tabular-nums text-zinc-900 dark:text-slate-100">
                  {Math.round(match.experienceScore)}
                  <span className="text-base font-medium text-zinc-400 dark:text-slate-500">/{max}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        {match.headline ? (
          <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-slate-200">{match.headline}</p>
        ) : null}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-slate-500">
            Summary
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-slate-300">{match.summary}</p>
        </div>

        {match.insights.length > 0 ? (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-slate-500">
              Insights
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-zinc-700 dark:text-slate-300">
              {match.insights.map((line, i) => (
                <li
                  key={i}
                  className="pl-0.5 marker:text-[#7107E7] dark:marker:text-violet-400"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {match.rationale ? (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-300">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-slate-500">
              Recruiter note
            </p>
            <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-slate-500">
              A short paragraph summarising overall strengths and weaknesses for this role.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-800 dark:text-slate-200">{match.rationale}</p>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-slate-500">
            Key attributes
          </p>
          {attributes.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {sortSkillsByRelevanceHighlight(attributes.skills).map((s, i) => (
                <span
                  key={`${s.name}-${i}`}
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${
                    s.relevance
                      ? RELEVANCE_RING[s.relevance]
                      : "bg-zinc-100 text-zinc-800 ring-zinc-200/90 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600/50"
                  }`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-slate-300">
            {attributes.experience ? (
              <p>
                <span className="font-medium text-zinc-900 dark:text-slate-100">Experience: </span>
                {attributes.experience}
              </p>
            ) : null}
            {attributes.location ? (
              <p>
                <span className="font-medium text-zinc-900 dark:text-slate-100">Location: </span>
                {attributes.location}
              </p>
            ) : null}
          </div>
        </div>

        {screening.meta?.generatedAt ? (
          <p className="text-[10px] text-zinc-400 dark:text-slate-500">
            Screening generated {new Date(screening.meta.generatedAt).toLocaleString()}
            {screening.meta.model ? ` · ${screening.meta.model}` : null}
          </p>
        ) : null}
      </div>

      {onClose ? (
        <div className="border-t border-zinc-200/90 bg-zinc-50/95 px-5 py-3 dark:border-slate-500/30 dark:bg-slate-900/50 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[#7107E7]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#5b06c2] shadow-sm transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/[0.06] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#7107E7]/35 dark:border-violet-500/35 dark:bg-slate-800/90 dark:text-violet-200 dark:shadow-none dark:hover:border-violet-400/50 dark:hover:bg-violet-950/30 dark:focus-visible:ring-violet-500/40"
          >
            Hide screening
          </button>
        </div>
      ) : null}
    </div>
  );
}
