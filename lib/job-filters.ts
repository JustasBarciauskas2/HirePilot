import type { JobDetail, JobSizeBand } from "@/data/jobs";

export type TypeFilter = "all" | "full-time" | "contract";
export type WorkFilter = "all" | "remote" | "hybrid" | "onsite";
export type SkillsMatchMode = "any" | "all";

export type JobFilterState = {
  q: string;
  type: TypeFilter;
  work: WorkFilter;
  industry: string;
  skills: string[];
  skillsMode: SkillsMatchMode;
  regions: string[];
  sizeBands: JobSizeBand[];
  experienceLevels: string[];
};

/** Infer remote / hybrid / office from copy */
export function getWorkStyle(job: JobDetail): Exclude<WorkFilter, "all"> {
  const l = `${job.location} ${job.locationTag}`.toLowerCase();
  if (l.includes("hybrid")) return "hybrid";
  if (l.includes("remote")) return "remote";
  if (l.includes("onsite") && (l.includes("/wk") || l.includes("week"))) return "hybrid";
  return "onsite";
}

function matchesType(job: JobDetail, type: TypeFilter): boolean {
  if (type === "all") return true;
  const t = job.type.toLowerCase();
  if (type === "full-time") return t.includes("full");
  if (type === "contract") return t.includes("contract");
  return true;
}

function matchesWork(job: JobDetail, work: WorkFilter): boolean {
  if (work === "all") return true;
  return getWorkStyle(job) === work;
}

function matchesIndustry(job: JobDetail, industry: string): boolean {
  if (industry === "all") return true;
  return job.industries.includes(industry);
}

function matchesSkills(
  job: JobDetail,
  selected: string[],
  mode: SkillsMatchMode,
): boolean {
  if (selected.length === 0) return true;
  const names = new Set(job.skills.map((s) => s.name));
  if (mode === "any") {
    return selected.some((s) => names.has(s));
  }
  return selected.every((s) => names.has(s));
}

function matchesRegions(job: JobDetail, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((r) => job.regions.includes(r));
}

function matchesSizeBands(job: JobDetail, selected: JobSizeBand[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(job.sizeBand);
}

function matchesExperienceLevels(job: JobDetail, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(job.experienceLevel);
}

/** Lowercase haystack for search */
export function jobSearchText(job: JobDetail): string {
  return [
    job.ref,
    job.title,
    job.companyName,
    job.clientLine,
    job.location,
    job.locationTag,
    job.comp,
    job.type,
    job.experienceLevel,
    job.sizeBand,
    ...job.regions,
    ...job.skills.map((s) => s.name),
    ...job.industries,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesQuery(job: JobDetail, q: string): boolean {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return true;
  return jobSearchText(job).includes(trimmed);
}

export function filterJobs(jobs: JobDetail[], opts: JobFilterState): JobDetail[] {
  return jobs.filter(
    (job) =>
      matchesQuery(job, opts.q) &&
      matchesType(job, opts.type) &&
      matchesWork(job, opts.work) &&
      matchesIndustry(job, opts.industry) &&
      matchesSkills(job, opts.skills, opts.skillsMode) &&
      matchesRegions(job, opts.regions) &&
      matchesSizeBands(job, opts.sizeBands) &&
      matchesExperienceLevels(job, opts.experienceLevels),
  );
}

export function uniqueIndustries(jobs: JobDetail[]): string[] {
  return [...new Set(jobs.flatMap((j) => j.industries))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function uniqueSkills(jobs: JobDetail[]): string[] {
  return [...new Set(jobs.flatMap((j) => j.skills.map((s) => s.name)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function uniqueRegions(jobs: JobDetail[]): string[] {
  return [...new Set(jobs.flatMap((j) => j.regions))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function uniqueExperienceLevels(jobs: JobDetail[]): string[] {
  return [...new Set(jobs.map((j) => j.experienceLevel))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export const SIZE_BAND_LABELS: Record<JobSizeBand, string> = {
  "1-100": "1–100 employees",
  "101-250": "101–250 employees",
  "201-500": "201–500 employees",
};

export function hasActiveAdvancedFilters(
  opts: Pick<JobFilterState, "skills" | "regions" | "sizeBands" | "experienceLevels">,
): boolean {
  return (
    opts.skills.length > 0 ||
    opts.regions.length > 0 ||
    opts.sizeBands.length > 0 ||
    opts.experienceLevels.length > 0
  );
}

export function hasAnyFilter(opts: JobFilterState): boolean {
  return (
    opts.q.trim() !== "" ||
    opts.type !== "all" ||
    opts.work !== "all" ||
    opts.industry !== "all" ||
    hasActiveAdvancedFilters(opts)
  );
}
