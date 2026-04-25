import { getBackendDocumentUrl } from "@techrecruit/shared/lib/backend-url";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { NextRequest } from "next/server";

function bearerFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const m = header?.match(/^Bearer\s+(.+)$/i);
  const t = m?.[1]?.trim();
  return t || null;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      { error: "Server auth not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* service account env vars." },
      { status: 503 },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Expected a non-empty file field named \"file\"." }, { status: 400 });
  }

  const max = 5 * 1024 * 1024;
  if (file.size > max) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const url = getBackendDocumentUrl();
  if (!url) {
    return Response.json(
      {
        error:
          "Document processing URL not configured. Set BACKEND_DOCUMENT_URL, or BACKEND_ORIGIN (or BACKEND_URL) with BACKEND_DOCUMENT_PATH.",
      },
      { status: 503 },
    );
  }

  const token = bearerFromRequest(req);
  const out = new FormData();
  out.append("file", file, file.name);
  out.append("tenantId", portalTenant.tenantId);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: out,
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return Response.json({
      ok: res.ok,
      backendStatus: res.status,
      backend: parsed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
