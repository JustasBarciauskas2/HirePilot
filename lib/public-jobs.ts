import { cache } from "react";
import type { JobDetail } from "@/data/job-types";
import { fetchTenantVacanciesFromBackend } from "@/lib/fetch-tenant-vacancies";
import { readJobs } from "@/lib/jobs-store";

/**
 * Jobs shown on the public site (home + /jobs/[ref]) and portal “Open listings”.
 *
 * When a vacancies list URL is configured (`BACKEND_VACANCIES_LIST_URL` or derived from `BACKEND_URL` → `…/api/vacancies`),
 * we use a successful GET response. If the request fails or returns non-OK HTTP, we fall back to local `data/jobs.json`
 * so the portal is not empty when the API is down.
 *
 * If no list URL is configured, we always use `data/jobs.json`.
 */
export const getPublicJobs = cache(async (): Promise<JobDetail[]> => {
  const remote = await fetchTenantVacanciesFromBackend();
  if (remote !== null) return remote;
  return readJobs();
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
  const local = readJobs().find((j) => j.ref.toLowerCase() === norm);
  if (local?.id?.trim()) return local.id.trim();

  const remote = await fetchTenantVacanciesFromBackend();
  if (remote?.length) {
    const row = remote.find((j) => j.ref.toLowerCase() === norm);
    if (row?.id?.trim()) return row.id.trim();
  }
  return null;
}
