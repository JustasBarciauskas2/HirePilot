import { NextRequest } from "next/server";
import { deleteRecruiterCommentForTenant, updateRecruiterCommentForTenant } from "@techrecruit/shared/lib/job-applications";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; commentId: string }> },
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

  const { id, commentId } = await ctx.params;
  if (!id?.trim() || !commentId?.trim()) {
    return Response.json({ error: "Missing application id or comment id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }
  const text = typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;
  if (typeof text !== "string") {
    return Response.json({ error: "Expected { text: string }." }, { status: 400 });
  }

  const result = await updateRecruiterCommentForTenant(
    id,
    portalTenant.tenantId,
    commentId,
    text,
    decoded.uid,
  );
  if (result.kind === "ok") {
    return Response.json({ comment: result.comment });
  }
  if (result.kind === "forbidden") {
    return Response.json({ error: "You can only edit your own notes." }, { status: 403 });
  }
  if (result.kind === "invalid") {
    return Response.json({ error: "Empty or text too long." }, { status: 400 });
  }
  return Response.json({ error: "Not found." }, { status: 404 });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; commentId: string }> },
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

  const { id, commentId } = await ctx.params;
  if (!id?.trim() || !commentId?.trim()) {
    return Response.json({ error: "Missing application id or comment id." }, { status: 400 });
  }

  const result = await deleteRecruiterCommentForTenant(id, portalTenant.tenantId, commentId, decoded.uid);
  if (result.kind === "ok") {
    return Response.json({ ok: true });
  }
  if (result.kind === "forbidden") {
    return Response.json({ error: "You can only delete your own notes." }, { status: 403 });
  }
  return Response.json({ error: "Not found." }, { status: 404 });
}
