import { NextRequest } from "next/server";
import { getBackendApplicationsPortalListUrl, getBackendTenantApplicationsUrl } from "@/lib/backend-url";
import { fetchBackendFirestoreApplicationIds } from "@/lib/fetch-backend-application-ids";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import {
  getJobApplicationsByIdsForTenant,
  getTenantIdForApplications,
  listJobApplicationsForTenant,
  listJobApplicationsForVacancy,
} from "@/lib/job-applications";
import { mergeScreeningFromBackendTenantApplications } from "@/lib/merge-backend-screening";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";

export const runtime = "nodejs";

/** Always read Firestore at request time — never serve a cached list of applications. */
export const dynamic = "force-dynamic";

const noStoreJson = { "Cache-Control": "private, no-store, must-revalidate" } as const;

export async function GET(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503, headers: noStoreJson });
  }
  if (!(await getFirebaseUserFromRequest(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: noStoreJson });
  }

  try {
    const tenantId = getTenantIdForApplications();
    const vacancyId = req.nextUrl.searchParams.get("vacancyId")?.trim();
    const backendListUrl = getBackendApplicationsPortalListUrl();

    let applications;
    let source: "backend+firestore" | "firestore";

    if (backendListUrl) {
      /** Only applications your backend lists (Firestore document ids); hydrate from Firestore. */
      const ids = await fetchBackendFirestoreApplicationIds(backendListUrl);
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

    const screeningMergeUrl = getBackendTenantApplicationsUrl(tenantId);

    return Response.json(
      {
        applications,
        /** Same scope as `where("tenantId", "==", …)` — check this matches the Firebase project / env you expect. */
        tenantId,
        fetchedAt: new Date().toISOString(),
        /**
         * `backend+firestore`: ids from your Java API (`BACKEND_APPLICATIONS_PORTAL_LIST_*`), rows from Firestore.
         * `firestore`: direct Firestore query (no backend list URL configured).
         */
        source,
        /** Development only: confirms `BACKEND_TENANT_APPLICATIONS_URL` resolved for screening merge. */
        ...(process.env.NODE_ENV === "development"
          ? {
              _debugScreeningMerge: {
                resolvedUrl: screeningMergeUrl,
                envVarSet: Boolean(process.env.BACKEND_TENANT_APPLICATIONS_URL?.trim()),
              },
            }
          : {}),
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
