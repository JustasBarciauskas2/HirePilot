import { cache } from "react";
import type { JobDetail } from "@techrecruit/shared/data/job-types";
import { fetchTenantVacanciesResult } from "@techrecruit/shared/lib/fetch-tenant-vacancies";
import { readJobs } from "@techrecruit/shared/lib/jobs-store";

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

/** Same as {@link getPublicJobs} but for an explicit tenant (portal with `?tenant=`). Not cached across tenants in React cache — call per request. */
export async function getPublicJobsForTenant(tenantId: string): Promise<JobDetail[]> {
  const result = await fetchTenantVacanciesResult(tenantId);
  if (result.kind === "unconfigured") return readJobs();
  if (result.kind === "error") return [];
  return result.jobs;
}

export async function getPublicJobBySlug(slug: string): Promise<JobDetail | undefined> {
  const jobs = await getPublicJobs();
  const key = slug.toLowerCase();
  return jobs.find((j) => j.slug.toLowerCase() === key);
}

/**
 * Backend row id for DELETE (path `/api/vacancy/{id}` + query `tenantId`, same UUID as `vacancy.id`).
 * Uses `JobDetail.id` from local `jobs.json` when present; otherwise loads the tenant list API
 * (same source as the portal) and matches by `ref` so root-level `id` from your list JSON is included.
 * If several rows share the same `ref`, the first match in the list wins — prefer unique `ref` per vacancy.
 */
export async function resolveVacancyIdForPortalDelete(ref: string, tenantId?: string): Promise<string | null> {
  const norm = ref.toLowerCase();
  const jobs = tenantId ? await getPublicJobsForTenant(tenantId) : await getPublicJobs();
  const row = jobs.find((j) => j.ref.toLowerCase() === norm);
  return row?.id?.trim() ?? null;
}
