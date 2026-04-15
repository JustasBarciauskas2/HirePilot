import { PortalShell } from "@/components/portal/PortalShell";
import { getPublicJobsForTenant } from "@techrecruit/shared/lib/public-jobs";
import { resolvePortalTenantForPage } from "@techrecruit/shared/lib/portal-tenant";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tenantId = resolvePortalTenantForPage(sp);
  const jobs = await getPublicJobsForTenant(tenantId);
  return <PortalShell initialJobs={jobs} tenantId={tenantId} />;
}
