import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { getJobApplicationForTenant, getSignedCvDownloadUrl } from "@techrecruit/shared/lib/job-applications";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

const URL_TTL_MS = 15 * 60 * 1000;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503 });
  }
  if (!(await getFirebaseUserFromRequest(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portalTenant = getPortalTenantFromRequest(req);
  if (!portalTenant.ok) return portalTenant.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  const tenantId = portalTenant.tenantId;
  const app = await getJobApplicationForTenant(id, tenantId);
  if (!app) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const url = await getSignedCvDownloadUrl(app.cvStoragePath, URL_TTL_MS);
    return Response.json({ url, fileName: app.cvFileName, expiresInMs: URL_TTL_MS });
  } catch (e) {
    console.error("[portal/applications/cv]", e);
    return Response.json({ error: "Could not create download link." }, { status: 500 });
  }
}
