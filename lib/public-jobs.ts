import { cache } from "react";
import type { JobDetail } from "@/data/job-types";
import { fetchTenantVacanciesResult } from "@/lib/fetch-tenant-vacancies";
import { readJobs } from "@/lib/jobs-store";

/**
 * Jobs shown on the public site (home + /jobs/[ref]) and portal “Open listings”.
 *
 * When a vacancies list URL is configured and the GET **succeeds**, we show **only** that response (no merge with `jobs.json`).
 * When the GET **fails**, we show **no** vacancies.
 * If no list URL is configured, we use `data/jobs.json` only.
 */
export const getPublicJobs = cache(async (): Promise<JobDetail[]> => {
  const result = await fetchTenantVacanciesResult();
  if (result.kind === "unconfigured") return readJobs();
  if (result.kind === "error") return [];
  return result.jobs;
});

export async function getPublicJobBySlug(slug: string): Promise<JobDetail | undefined> {
  const jobs = await getPublicJobs();
  const key = slug.toLowerCase();
  return jobs.find((j) => j.slug === key);
}

/**
 * Backend row id for DELETE (path `/api/vacancy/{id}` + query `tenantId`, same UUID as `vacancy.id`).
 * Uses `JobDetail.id` from local `jobs.json` when present; otherwise loads the tenant list API
 * (same source as the portal) and matches by `ref` so root-level `id` from your list JSON is included.
 * If several rows share the same `ref`, the first match in the list wins — prefer unique `ref` per vacancy.
 */
export async function resolveVacancyIdForPortalDelete(ref: string): Promise<string | null> {
  const norm = ref.toLowerCase();
  const jobs = await getPublicJobs();
  const row = jobs.find((j) => j.ref.toLowerCase() === norm);
  return row?.id?.trim() ?? null;
}
