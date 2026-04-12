import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getJobApplicationForTenant, getSignedCvDownloadUrl, getTenantIdForApplications } from "@/lib/job-applications";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";

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

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  const tenantId = getTenantIdForApplications();
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
