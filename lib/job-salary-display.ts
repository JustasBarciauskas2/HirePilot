import type { JobDetail } from "@/data/job-types";

const SUPPRESS_SALARY_BOILERPLATE = /^competitive salary and benefits package$/i;

/**
 * Salary line for cards and hero — omits generic API boilerplate so we don’t show empty marketing copy.
 */
export function salaryDisplayLine(job: JobDetail): string {
  const raw = job.salaryHighlight.trim() || job.comp.trim();
  if (SUPPRESS_SALARY_BOILERPLATE.test(raw)) return "";
  return raw;
}
