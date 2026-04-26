import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import type { ApplicationPipelineStatus } from "@techrecruit/shared/lib/job-application-shared";
import {
  getApplicationPipelineForTenant,
  setApplicationPipelineForTenant,
} from "@techrecruit/shared/lib/portal-tenant-settings";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import { getPortalTenantFromRequest } from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

const noStoreJson = { "Cache-Control": "no-store" } as const;

function parseStatusesBody(body: unknown): ApplicationPipelineStatus[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { statuses?: unknown }).statuses;
  if (!Array.isArray(raw)) return null;
  const out: ApplicationPipelineStatus[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!id || !label) continue;
    out.push({ id, label });
  }
  return out.length ? out : null;
}

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

  const statuses = await getApplicationPipelineForTenant(portalTenant.tenantId);
  return Response.json({ statuses }, { headers: noStoreJson });
}

export async function PUT(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server not configured." }, { status: 503, headers: noStoreJson });
  }
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: noStoreJson });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400, headers: noStoreJson });
  }

  const statuses = parseStatusesBody(body);
  if (!statuses) {
    return Response.json({ error: "Expected { statuses: [{ id, label }, ...] }." }, { status: 400, headers: noStoreJson });
  }

  const result = await setApplicationPipelineForTenant(portalTenant.tenantId, statuses);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400, headers: noStoreJson });
  }

  const next = await getApplicationPipelineForTenant(portalTenant.tenantId);
  return Response.json({ ok: true, statuses: next }, { headers: noStoreJson });
}
