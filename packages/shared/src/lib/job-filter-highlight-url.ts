import { JOB_SIZE_BANDS, type JobSizeBand } from "@techrecruit/shared/data/job-types";
import type { JobFilterState } from "@techrecruit/shared/lib/job-filters";

/** Parsed from `?fs=…&fr=…` on `/jobs/[slug]` — drives “matched your filters” styling. */
export type JobFilterHighlight = {
  skills: Set<string>;
  regions: Set<string>;
  experienceLevels: Set<string>;
  sizeBands: Set<JobSizeBand>;
  /** When user picked one industry on the listing. */
  industry: string | null;
};

export const EMPTY_JOB_FILTER_HIGHLIGHT: JobFilterHighlight = {
  skills: new Set(),
  regions: new Set(),
  experienceLevels: new Set(),
  sizeBands: new Set(),
  industry: null,
};

function firstParam(v: string | string[] | undefined): string {
  if (v === undefined) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function splitPipeEncoded(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
}

function parseSizeBands(raw: string): Set<JobSizeBand> {
  const out = new Set<JobSizeBand>();
  for (const s of splitPipeEncoded(raw)) {
    if ((JOB_SIZE_BANDS as readonly string[]).includes(s)) {
      out.add(s as JobSizeBand);
    }
  }
  return out;
}

/**
 * Read highlight state from the job page URL (set when opening a role from the filtered listing).
 */
export function parseJobFilterHighlight(params: {
  [key: string]: string | string[] | undefined;
}): JobFilterHighlight {
  const fs = firstParam(params.fs);
  const fr = firstParam(params.fr);
  const fe = firstParam(params.fe);
  const fb = firstParam(params.fb);
  const fi = firstParam(params.fi);

  return {
    skills: new Set(splitPipeEncoded(fs)),
    regions: new Set(splitPipeEncoded(fr)),
    experienceLevels: new Set(splitPipeEncoded(fe)),
    sizeBands: parseSizeBands(fb),
    industry: fi ? (() => {
      try {
        return decodeURIComponent(fi);
      } catch {
        return fi;
      }
    })() : null,
  };
}

function joinEncoded(values: string[]): string {
  return values.map((s) => encodeURIComponent(s)).join("|");
}

/**
 * Build `/jobs/[slug]?fs=…` when the user had filters selected on the vacancy list.
 */
export function buildJobDetailHref(slug: string, state: JobFilterState): string {
  const params = new URLSearchParams();
  if (state.skills.length) params.set("fs", joinEncoded(state.skills));
  if (state.regions.length) params.set("fr", joinEncoded(state.regions));
  if (state.experienceLevels.length) params.set("fe", joinEncoded(state.experienceLevels));
  if (state.sizeBands.length) params.set("fb", joinEncoded(state.sizeBands));
  if (state.industry !== "all") params.set("fi", encodeURIComponent(state.industry));

  const q = params.toString();
  return q ? `/jobs/${slug}?${q}` : `/jobs/${slug}`;
}

export function hasHighlightParams(h: JobFilterHighlight): boolean {
  return (
    h.skills.size > 0 ||
    h.regions.size > 0 ||
    h.experienceLevels.size > 0 ||
    h.sizeBands.size > 0 ||
    Boolean(h.industry)
  );
}

/** Same shape as URL-parsed highlights — for listing cards using live `JobFilterState`. */
export function jobFilterHighlightFromState(state: JobFilterState): JobFilterHighlight {
  return {
    skills: new Set(state.skills),
    regions: new Set(state.regions),
    experienceLevels: new Set(state.experienceLevels),
    sizeBands: new Set(state.sizeBands),
    industry: state.industry === "all" ? null : state.industry,
  };
}

/** Shared with job detail — listing uses slightly smaller `text-[10px]` wrappers inline. */
export const JOB_PILL_EMERALD =
  "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/85";
export const JOB_PILL_ZINC =
  "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200/90";
