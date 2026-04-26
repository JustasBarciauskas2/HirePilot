import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { isNonEmptyApplicationStatusId } from "@techrecruit/shared/lib/job-application-shared";
import { updateJobApplicationStatusForTenant } from "@techrecruit/shared/lib/job-applications";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503 });
  }
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }
  const status = typeof body === "object" && body !== null ? (body as { status?: unknown }).status : undefined;
  if (!isNonEmptyApplicationStatusId(status)) {
    return Response.json({ error: "Expected { status: string } with a non-empty pipeline stage id." }, { status: 400 });
  }

  const tenantId = portalTenant.tenantId;
  const result = await updateJobApplicationStatusForTenant(id, tenantId, status.trim());
  if (result === "not_found") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  if (result === "invalid_status") {
    return Response.json(
      { error: "That stage is not in your team pipeline. Update pipeline stages in Applications first." },
      { status: 400 },
    );
  }
  return Response.json({ ok: true });
}
