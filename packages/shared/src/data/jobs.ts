export type {
  FundingRound,
  JobDetail,
  JobSizeBand,
  JobSkill,
} from "./job-types";
export { JOB_SIZE_BANDS, JOB_SIZE_BAND_LABELS, jobBase } from "./job-types";
export { seedJobs } from "./seed-jobs";
export { getPublicJobs, getPublicJobBySlug } from "@techrecruit/shared/lib/public-jobs";

import type { JobDetail } from "./job-types";
import { readJobs } from "@techrecruit/shared/lib/jobs-store";

export function getAllJobs(): JobDetail[] {
  return readJobs();
}

export function getJobBySlug(slug: string): JobDetail | undefined {
  const key = slug.toLowerCase();
  return getAllJobs().find((j) => j.slug === key);
}

export function getAllJobSlugs(): string[] {
  return getAllJobs().map((j) => j.slug);
}
