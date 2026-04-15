import { NextRequest } from "next/server";
import { authorizeApplicationsFetch } from "@techrecruit/shared/lib/applications-list-auth";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { mergeScreeningFromBackendTenantApplications } from "@techrecruit/shared/lib/merge-backend-screening";
import { listJobApplicationsForTenant } from "@techrecruit/shared/lib/job-applications";
import { jobApplicationsForClientResponse } from "@techrecruit/shared/lib/job-application-shared";

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
    return Response.json({ applications: jobApplicationsForClientResponse(applications) });
  } catch (e) {
    console.error("[api/tenant/[tenantId]]", e);
    return Response.json({ error: "Could not load applications." }, { status: 500 });
  }
}
