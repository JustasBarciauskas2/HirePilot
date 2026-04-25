import { PortalShell } from "@/components/portal/PortalShell";
import { getPublicJobsForTenant } from "@techrecruit/shared/lib/public-jobs";
import {
  getPortalTenantFirebaseClaimName,
  PORTAL_ENTRY_TENANT_COOKIE_NAME,
  resolvePortalTenantIdForPage,
} from "@techrecruit/shared/lib/portal-tenant";
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
  const hasEntryTenantCookie = Boolean(
    cookieStore.get(PORTAL_ENTRY_TENANT_COOKIE_NAME)?.value?.trim(),
  );
  /** Production: must use marketing footer `?tenant=`; development: direct / bookmark portal URL is OK. */
  const requireMarketingEntry = claimMode && process.env.NODE_ENV === "production";
  return (
    <PortalShell
      initialJobs={jobs}
      tenantId={tenantId}
      tenantClaimMode={claimMode}
      loginEntryGate={
        requireMarketingEntry
          ? { requireMarketingEntry: true, hasEntryTenantCookie }
          : { requireMarketingEntry: false, hasEntryTenantCookie: true }
      }
    />
  );
}
