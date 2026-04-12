import { NextRequest } from "next/server";
import { authorizeApplicationsFetch } from "@/lib/applications-list-auth";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { mergeScreeningFromBackendTenantApplications } from "@/lib/merge-backend-screening";
import { listJobApplicationsForTenant } from "@/lib/job-applications";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503 });
  }
  if (!(await authorizeApplicationsFetch(req))) {
    return Response.json(
      {
        error:
          "Unauthorized. Set APPLICATIONS_API_KEY and send X-Applications-Api-Key, or Authorization: Bearer <Firebase ID token>.",
      },
      { status: 401 },
    );
  }

  const { tenantId } = await ctx.params;
  const tid = tenantId?.trim();
  if (!tid) {
    return Response.json({ error: "Missing tenantId." }, { status: 400 });
  }

  try {
    let applications = await listJobApplicationsForTenant(tid);
    applications = await mergeScreeningFromBackendTenantApplications(tid, applications);
    return Response.json({ applications });
  } catch (e) {
    console.error("[api/tenant/[tenantId]]", e);
    return Response.json({ error: "Could not load applications." }, { status: 500 });
  }
}
