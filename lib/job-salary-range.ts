import type { JobDetail } from "@/data/job-types";
import { salaryDisplayLine } from "@/lib/job-salary-display";

const GENERIC_BOILERPLATE =
  /competitive salary|discussed at offer|package discussed|tbd|DOE|dependent on experience/i;

/**
 * Best-effort parse of a free-text comp line into min/max **thousands** (e.g. 80 = £80k).
 * Used by the portal form and job filters.
 */
export function parseSalaryRangeStringToK(raw: string): { min: number; max: number } | null {
  const trimmed = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!trimmed || GENERIC_BOILERPLATE.test(trimmed)) return null;

  const nums: number[] = [];

  // "£80-90k", "80-90k" (hyphen or en dash before trailing k)
  const rangeEndK = trimmed.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (rangeEndK) {
    nums.push(parseFloat(rangeEndK[1]), parseFloat(rangeEndK[2]));
    return band(nums);
  }

  // "$175k–$205k", "£130k - £155k", single "$190k"
  const kPairs = [...trimmed.matchAll(/(\d+(?:\.\d+)?)\s*k\b/gi)];
  for (const m of kPairs) {
    nums.push(parseFloat(m[1]));
  }

  // "1.2m" → 1200k
  const mMatches = [...trimmed.matchAll(/(\d+(?:\.\d+)?)\s*m\b/gi)];
  for (const m of mMatches) {
    nums.push(parseFloat(m[1]) * 1000);
  }

  if (nums.length === 0) return null;
  return band(nums);
}

/**
 * Best-effort parse of salary into a numeric range in **thousands** (e.g. 80 = £80k / $80k).
 * Uses the hero pill line when present, then merges numbers from the full comp line so ranges like
 * "$175k–$205k" in `comp` aren’t lost when `salaryHighlight` is a single anchor.
 */
export function parseSalaryRangeKFromJob(job: JobDetail): { min: number; max: number } | null {
  const a = job.salaryMinK;
  const b = job.salaryMaxK;
  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const fromPill = parseSalaryRangeStringToK(salaryDisplayLine(job));
  const fromComp = parseSalaryRangeStringToK(job.comp.trim());
  if (!fromPill && !fromComp) return null;
  if (!fromPill) return fromComp;
  if (!fromComp) return fromPill;
  return band([fromPill.min, fromPill.max, fromComp.min, fromComp.max]);
}

function band(values: number[]): { min: number; max: number } {
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Slider step in thousands — filter UI snaps to this increment. */
export const SALARY_RANGE_STEP_K = 5;

function snapFloorStep(n: number, step: number): number {
  return Math.floor(n / step) * step;
}

function snapCeilStep(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

/** Keep min/max within domain and at least `step` apart when the domain allows. */
export function clampSalaryWindow(
  minK: number,
  maxK: number,
  domain: { min: number; max: number },
  step = SALARY_RANGE_STEP_K,
): { minK: number; maxK: number } {
  const lo = domain.min;
  const hi = domain.max;
  let a = Math.max(lo, Math.min(minK, hi));
  let b = Math.max(lo, Math.min(maxK, hi));
  if (hi - lo < step) {
    return { minK: lo, maxK: hi };
  }
  if (b < a + step) {
    b = Math.min(hi, a + step);
  }
  if (a > b - step) {
    a = Math.max(lo, b - step);
  }
  return { minK: a, maxK: b };
}

/**
 * Slider bounds from current listings: (smallest pay figure − 20k) through (largest + 20k), snapped to {@link SALARY_RANGE_STEP_K}.
 */
export function computeSalaryDomainK(jobs: JobDetail[]): { min: number; max: number } {
  const step = SALARY_RANGE_STEP_K;
  const ranges = jobs.map(parseSalaryRangeKFromJob).filter((x): x is NonNullable<typeof x> => x !== null);
  if (ranges.length === 0) {
    return { min: snapFloorStep(40, step), max: snapCeilStep(300, step) };
  }
  const all = ranges.flatMap((r) => [r.min, r.max]);
  const lowest = Math.min(...all);
  const highest = Math.max(...all);
  const min = Math.max(0, snapFloorStep(lowest - 20, step));
  let max = snapCeilStep(highest + 20, step);
  if (max <= min) max = min + step * 2;
  return { min, max };
}

/**
 * When the slider covers the full domain, all roles pass.
 * When narrowed, only roles with a parseable pay band that **overlaps** the window match (so the filter actually changes the list).
 */
export function jobMatchesSalaryRangeK(
  job: JobDetail,
  filterMinK: number,
  filterMaxK: number,
  domain: { min: number; max: number },
): boolean {
  const noSalaryFilter = filterMinK <= domain.min && filterMaxK >= domain.max;
  if (noSalaryFilter) return true;

  const parsed = parseSalaryRangeKFromJob(job);
  if (!parsed) return false;

  const { min: jMin, max: jMax } = parsed;
  return jMin <= filterMaxK && jMax >= filterMinK;
}
