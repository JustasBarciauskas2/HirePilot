import { fetchTenantVacanciesResult, getResolvedVacanciesListUrl } from "@/lib/fetch-tenant-vacancies";
import { readJobs } from "@/lib/jobs-store";
import { getBackendVacanciesListUrl } from "@/lib/backend-url";
import { getTenantInstancePayload } from "@/lib/tenant-instance";

/**
 * Same data the home page uses: backend list only when configured and GET succeeds; else local-only when unconfigured.
 */
export async function GET(): Promise<Response> {
  const configured = getBackendVacanciesListUrl() !== null;
  const tenant = getTenantInstancePayload();
  const listUrl = getResolvedVacanciesListUrl();
  const result = await fetchTenantVacanciesResult();
  if (result.kind === "ok") {
    return Response.json({
      source: "backend" as const,
      configured,
      tenantId: tenant.id,
      listUrl,
      jobs: result.jobs,
    });
  }
  if (result.kind === "error") {
    return Response.json({
      source: "backend" as const,
      configured,
      tenantId: tenant.id,
      listUrl,
      listFetchFailed: true,
      jobs: [] as const,
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
