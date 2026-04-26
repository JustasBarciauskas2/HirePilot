import { after, NextRequest } from "next/server";
import { getBackendApplicationsPortalListUrl } from "@techrecruit/shared/lib/backend-url";
import { fetchBackendFirestoreApplicationIds } from "@techrecruit/shared/lib/fetch-backend-application-ids";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import {
  parseJobApplicationFormFields,
  runJobApplicationIntake,
} from "@techrecruit/shared/lib/job-application-intake";
import {
  getJobApplicationsByIdsForTenant,
  listJobApplicationsForTenant,
  listJobApplicationsForVacancy,
} from "@techrecruit/shared/lib/job-applications";
import { mergeScreeningFromBackendTenantApplications } from "@techrecruit/shared/lib/merge-backend-screening";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";
import { getPublicJobBySlugForTenant } from "@techrecruit/shared/lib/public-jobs";
import { jobApplicationsForClientResponse } from "@techrecruit/shared/lib/job-application-shared";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";

export const runtime = "nodejs";

/** Always read Firestore at request time — never serve a cached list of applications. */
export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, must-revalidate" } as const;

export async function GET(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503, headers: noStoreJson });
  }
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: noStoreJson });
  }

  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  try {
    const tenantId = portalTenant.tenantId;
    const vacancyId = req.nextUrl.searchParams.get("vacancyId")?.trim();
    const backendListUrl = getBackendApplicationsPortalListUrl();

    let applications;
    let source: "backend+firestore" | "firestore";

    if (backendListUrl) {
      /** Only applications your backend lists (Firestore document ids); hydrate from Firestore. */
      const ids = await fetchBackendFirestoreApplicationIds(backendListUrl, tenantId);
      let rows = await getJobApplicationsByIdsForTenant(tenantId, ids);
      if (vacancyId) {
        rows = rows.filter((r) => {
          if (r.vacancyId?.trim() === vacancyId) return true;
          return false;
        });
      }
      applications = rows;
      source = "backend+firestore";
    } else if (vacancyId) {
      applications = await listJobApplicationsForVacancy(tenantId, vacancyId);
      source = "firestore";
    } else {
      applications = await listJobApplicationsForTenant(tenantId);
      source = "firestore";
    }

    applications = await mergeScreeningFromBackendTenantApplications(tenantId, applications);

    return Response.json(
      {
        applications: jobApplicationsForClientResponse(applications),
        fetchedAt: new Date().toISOString(),
        /**
         * `backend+firestore`: ids from your Java API (`BACKEND_APPLICATIONS_PORTAL_LIST_*`), rows from Firestore.
         * `firestore`: direct Firestore query (no backend list URL configured).
         */
        source,
      },
      { headers: noStoreJson },
    );
  } catch (e) {
    console.error("[portal/applications]", e);
    const detail = e instanceof Error ? e.message.slice(0, 800) : "Unknown error";
    return Response.json(
      {
        error: "Could not load applications.",
        detail,
      },
      { status: 500, headers: noStoreJson },
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503, headers: noStoreJson });
  }
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: noStoreJson });
  }

  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400, headers: noStoreJson });
  }

  const parsed = parseJobApplicationFormFields(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400, headers: noStoreJson });
  }

  const { jobSlug, firstName, lastName, email, phone, cv } = parsed;
  const mime = cv.type || "application/octet-stream";
  const tenantId = portalTenant.tenantId;

  const job = await getPublicJobBySlugForTenant(tenantId, jobSlug);
  if (!job) {
    return Response.json(
      {
        error:
          "This vacancy is not open for applications, or the slug/reference does not match your tenant’s listings.",
      },
      { status: 404, headers: noStoreJson },
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await cv.arrayBuffer());
  } catch {
    return Response.json({ error: "Could not read the uploaded file." }, { status: 400, headers: noStoreJson });
  }

  const result = await runJobApplicationIntake({
    tenantId,
    job,
    firstName,
    lastName,
    email,
    phone,
    cv: { buffer, originalName: cv.name || "cv.pdf", contentType: mime },
    runAfter: after,
  });

  if (!result.ok) {
    return Response.json(result.body, { status: result.status, headers: noStoreJson });
  }
  return Response.json(result.body, { status: result.status, headers: noStoreJson });
}
