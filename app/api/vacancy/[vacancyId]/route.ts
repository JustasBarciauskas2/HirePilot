import { NextRequest } from "next/server";
import { authorizeApplicationsFetch } from "@/lib/applications-list-auth";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { listJobApplicationsForVacancy } from "@/lib/job-applications";

export const runtime = "nodejs";

/**
 * GET /api/vacancy/{vacancyId}?tenantId=...
 * `vacancyId` is the job UUID (`JobDetail.id`), not the human ref (e.g. MT-2026-053).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ vacancyId: string }> },
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

  const { vacancyId } = await ctx.params;
  const vid = vacancyId?.trim();
  const tenantId = req.nextUrl.searchParams.get("tenantId")?.trim();

  if (!vid) {
    return Response.json({ error: "Missing vacancyId." }, { status: 400 });
  }
  if (!tenantId) {
    return Response.json(
      {
        error:
          "Query parameter tenantId is required (e.g. ?tenantId=your-tenant-id). Vacancy id is scoped per tenant.",
      },
      { status: 400 },
    );
  }

  try {
    const applications = await listJobApplicationsForVacancy(tenantId, vid);
    return Response.json({ applications });
  } catch (e) {
    console.error("[api/vacancy/[vacancyId]]", e);
    return Response.json({ error: "Could not load applications." }, { status: 500 });
  }
}
