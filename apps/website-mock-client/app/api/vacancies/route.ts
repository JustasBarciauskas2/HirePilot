import { fetchTenantVacanciesResult } from "@techrecruit/shared/lib/fetch-tenant-vacancies";
import { readJobs } from "@techrecruit/shared/lib/jobs-store";
import { getBackendVacanciesListUrl } from "@techrecruit/shared/lib/backend-url";

/**
 * Same data the home page uses: backend list only when configured and GET succeeds; else local-only when unconfigured.
 * Does not expose tenant id or backend URLs (debug only in server logs / env).
 */
export async function GET(): Promise<Response> {
  const configured = getBackendVacanciesListUrl() !== null;
  const result = await fetchTenantVacanciesResult();
  if (result.kind === "ok") {
    return Response.json({
      source: "backend" as const,
      configured,
      jobs: result.jobs,
    });
  }
  if (result.kind === "error") {
    return Response.json({
      source: "backend" as const,
      configured,
      listFetchFailed: true,
      jobs: [] as const,
    });
  }
  return Response.json({
    source: "local" as const,
    configured,
    jobs: readJobs(),
  });
}
