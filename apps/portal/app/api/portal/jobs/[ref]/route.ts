import { deleteVacancyOnBackend } from "@techrecruit/shared/lib/forward-vacancy";
import { resolveVacancyIdForPortalDelete } from "@techrecruit/shared/lib/public-jobs";
import { removeJobByRef } from "@techrecruit/shared/lib/jobs-store";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { VACANCIES_LIST_FETCH_TAG } from "@techrecruit/shared/lib/fetch-tenant-vacancies";
import { revalidateMarketingSite } from "@/lib/revalidate-marketing-site";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

type RouteContext = { params: Promise<{ ref: string }> };

function bearerFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const m = header?.match(/^Bearer\s+(.+)$/i);
  const t = m?.[1]?.trim();
  return t || null;
}

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      {
        error:
          "Server auth not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
      },
      { status: 503 },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portalTenant = getPortalTenantFromRequest(req);
  if (!portalTenant.ok) return portalTenant.response;
  const tenantId = portalTenant.tenantId;

  const p = await ctx.params;
  const ref = p?.ref ?? "";
  if (!ref) {
    return Response.json({ error: "Missing ref" }, { status: 400 });
  }

  const slug = ref.toLowerCase();

  const idToken = bearerFromRequest(req);
  if (process.env.DEBUG_PRINT_ACCESS_TOKEN === "true") {
    console.log("[portal/jobs DELETE] Firebase ID token:", idToken ?? "(null)");
  }

  const fromQuery =
    req.nextUrl.searchParams.get("id")?.trim() ||
    req.nextUrl.searchParams.get("vacancyId")?.trim() ||
    null;
  const vacancyId =
    fromQuery ?? (await resolveVacancyIdForPortalDelete(ref, tenantId)) ?? null;

  const backend = await deleteVacancyOnBackend(ref, idToken, { vacancyId, tenantId });

  const backendOptional =
    process.env.BACKEND_OPTIONAL === "true" || process.env.BACKEND_OPTIONAL === "1";

  if (!backend.ok) {
    if (!backendOptional) {
      const hint = "hint" in backend && typeof backend.hint === "string" ? backend.hint : "";
      const status =
        "status" in backend && typeof backend.status === "number" && backend.status === 400 ? 400 : 502;
      const message =
        status === 400 && "error" in backend && typeof backend.error === "string"
          ? backend.error
          : `Your backend did not delete this vacancy (or could not be reached).${hint ? ` ${hint}` : ""} Or set BACKEND_OPTIONAL=true to remove locally anyway.`;
      return Response.json({ error: message, backend }, { status });
    }
  }

  const removedLocal = removeJobByRef(ref, vacancyId);
  const backendSkipped = backend.ok && "skipped" in backend && backend.skipped === true;

  if (backendSkipped && !removedLocal) {
    return Response.json({ error: "Vacancy not found" }, { status: 404 });
  }

  revalidateTag(VACANCIES_LIST_FETCH_TAG, "max");
  revalidatePath("/");
  await revalidateMarketingSite({ jobSlug: slug });

  return Response.json({ ok: true, backend, removedLocal });
}
