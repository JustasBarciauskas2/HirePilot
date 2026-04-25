import { NextRequest } from "next/server";
import { addRecruiterCommentForTenant } from "@techrecruit/shared/lib/job-applications";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

function authorLabelFromToken(decoded: { uid: string; email?: string; name?: string }): string {
  const email = typeof decoded.email === "string" && decoded.email.trim() ? decoded.email.trim() : "";
  const name = typeof decoded.name === "string" && decoded.name.trim() ? decoded.name.trim() : "";
  if (name) return name;
  if (email) return email;
  return decoded.uid;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
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
  const text = typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;
  if (typeof text !== "string") {
    return Response.json({ error: "Expected { text: string }." }, { status: 400 });
  }

  const comment = await addRecruiterCommentForTenant(id, portalTenant.tenantId, text, {
    userId: decoded.uid,
    name: authorLabelFromToken(decoded),
  });
  if (!comment) {
    return Response.json(
      {
        error: "Could not add note.",
        detail: "Application not found, empty or too long text, or note limit reached.",
      },
      { status: 400 },
    );
  }
  return Response.json({ comment });
}
