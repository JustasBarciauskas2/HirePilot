import { PortalShell } from "@/components/portal/PortalShell";
import { getPublicJobsForTenant } from "@techrecruit/shared/lib/public-jobs";
import { getPortalTenantFirebaseClaimName, resolvePortalTenantIdForPage } from "@techrecruit/shared/lib/portal-tenant";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const tenantId = resolvePortalTenantIdForPage(sp, cookieStore);
  const jobs = await getPublicJobsForTenant(tenantId);
  const claimMode = Boolean(getPortalTenantFirebaseClaimName());
  return (
    <PortalShell
      initialJobs={jobs}
      tenantId={tenantId}
      tenantClaimMode={claimMode}
    />
  );
}
