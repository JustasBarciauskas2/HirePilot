import {
  fetchTenantVacanciesFromBackend,
  getResolvedVacanciesListUrl,
} from "@/lib/fetch-tenant-vacancies";
import { readJobs } from "@/lib/jobs-store";
import { getBackendVacanciesListUrl } from "@/lib/backend-url";
import { getTenantInstancePayload } from "@/lib/tenant-instance";

/**
 * Same data the home page uses: GET from your backend when configured (only that response; no local merge), else local jobs.json.
 * Call from the browser to verify wiring: `/api/vacancies` (no tenant param needed — server adds it).
 * Response includes `tenantId` and `listUrl` so you can confirm they match your backend.
 */
export async function GET(): Promise<Response> {
  const configured = getBackendVacanciesListUrl() !== null;
  const tenant = getTenantInstancePayload();
  const listUrl = getResolvedVacanciesListUrl();
  const remote = await fetchTenantVacanciesFromBackend();
  if (remote !== null) {
    return Response.json({
      source: "backend" as const,
      configured,
      tenantId: tenant.id,
      listUrl,
      jobs: remote,
    });
  }
  return Response.json({
    source: "local" as const,
    configured,
    tenantId: tenant.id,
    listUrl,
    jobs: readJobs(),
  });
}
