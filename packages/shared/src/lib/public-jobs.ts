import { cache } from "react";
import type { JobDetail } from "@techrecruit/shared/data/job-types";
import { fetchTenantVacanciesResult } from "@techrecruit/shared/lib/fetch-tenant-vacancies";
import { readJobs } from "@techrecruit/shared/lib/jobs-store";
import { getTenantInstancePayload } from "@techrecruit/shared/lib/tenant-instance";

/**
 * Jobs shown on the public site (home + /jobs/[ref]) and portal “Open listings”.
 *
 * When a vacancies list URL is configured and the GET **succeeds**, the list is the primary source for listings.
 * When the GET **fails**, we show **no** vacancies.
 * If no list URL is configured, we use `data/jobs.json` only (see {@link readJobsFileRowsForTenant}).
 *
 * **Detail pages:** {@link getPublicJobBySlug} also checks `data/jobs.json` when the slug is missing from the API
 * list so a role the portal just wrote locally still opens (backend list can lag behind publish).
 */
export const getPublicJobs = cache(async (): Promise<JobDetail[]> => {
  const id = getTenantInstancePayload().id;
  const result = await fetchTenantVacanciesResult();
  if (result.kind === "unconfigured") return readJobsFileRowsForTenant(id);
  if (result.kind === "error") return [];
  return filterListRowsByTenantId(result.jobs, id);
});

/**
 * `data/jobs.json` is shared; filter rows for the current tenant. Rows with no `tenantId` only appear for the
 * deployment’s default instance id (see `TENANT_ID` / {@link getTenantInstancePayload}).
 */
export function readJobsFileRowsForTenant(tenantId: string): JobDetail[] {
  const all = readJobs();
  const defaultId = getTenantInstancePayload().id;
  return all.filter((j) => {
    const t = j.tenantId?.trim();
    if (t) return t === tenantId;
    return tenantId === defaultId;
  });
}

/** When a list API returns `tenantId` on each row, drop rows that don’t match (defence in depth). */
function filterListRowsByTenantId(jobs: JobDetail[], tenantId: string): JobDetail[] {
  return jobs.filter((j) => {
    const t = j.tenantId?.trim();
    if (!t) return true;
    return t === tenantId;
  });
}

/** Same as {@link getPublicJobs} but for an explicit tenant (portal with `?tenant=`). Not cached across tenants in React cache — call per request. */
export async function getPublicJobsForTenant(tenantId: string): Promise<JobDetail[]> {
  const result = await fetchTenantVacanciesResult(tenantId);
  if (result.kind === "unconfigured") return readJobsFileRowsForTenant(tenantId);
  if (result.kind === "error") return [];
  return filterListRowsByTenantId(result.jobs, tenantId);
}

export async function getPublicJobBySlug(slug: string): Promise<JobDetail | undefined> {
  const jobs = await getPublicJobs();
  const key = slug.toLowerCase();
  const fromList = jobs.find((j) => j.slug.toLowerCase() === key);
  if (fromList) return fromList;
  const fromFile = readJobsFileRowsForTenant(getTenantInstancePayload().id);
  const bySlug = fromFile.find((j) => j.slug.toLowerCase() === key);
  if (bySlug) return bySlug;
  return fromFile.find((j) => j.ref.toLowerCase() === key);
}

/**
 * Resolve a listing by URL slug or by `ref` (same fallbacks as {@link getPublicJobBySlug}) for a specific tenant —
 * used by the recruiter portal when adding an applicant manually.
 */
export async function getPublicJobBySlugForTenant(
  tenantId: string,
  slug: string,
): Promise<JobDetail | undefined> {
  const jobs = await getPublicJobsForTenant(tenantId);
  const key = slug.toLowerCase();
  const fromList = jobs.find((j) => j.slug.toLowerCase() === key);
  if (fromList) return fromList;
  const fromFile = readJobsFileRowsForTenant(tenantId);
  const bySlug = fromFile.find((j) => j.slug.toLowerCase() === key);
  if (bySlug) return bySlug;
  return fromFile.find((j) => j.ref.toLowerCase() === key);
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
