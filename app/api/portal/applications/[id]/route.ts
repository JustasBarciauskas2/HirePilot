import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { isJobApplicationStatusString } from "@/lib/job-application-shared";
import { updateJobApplicationStatusForTenant, getTenantIdForApplications } from "@/lib/job-applications";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";

export const runtime = "nodejs";

export async function PATCH(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }
  const status = typeof body === "object" && body !== null ? (body as { status?: unknown }).status : undefined;
  if (!isJobApplicationStatusString(status)) {
    return Response.json({ error: "Expected { status: one of new|reviewing|shortlisted|rejected|hired }." }, { status: 400 });
  }

  const tenantId = getTenantIdForApplications();
  const ok = await updateJobApplicationStatusForTenant(id, tenantId, status);
  if (!ok) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
