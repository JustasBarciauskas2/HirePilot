import { NextRequest, NextResponse } from "next/server";
import { isPortalAdminFromDecodedToken } from "@techrecruit/shared/lib/portal-admin";
import {
  getPortalTenantFromRequest,
  getPortalTenantFirebaseClaimName,
} from "@techrecruit/shared/lib/portal-tenant";
import {
  getEmailNotificationsEnabledForUid,
  setPortalUserEmailNotifications,
} from "@techrecruit/shared/lib/portal-user-settings";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" } as const;

export async function GET(req: NextRequest): Promise<Response> {
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  const emailNotificationsEnabled = await getEmailNotificationsEnabledForUid(decoded.uid);
  return NextResponse.json(
    {
      email: decoded.email ?? null,
      emailNotificationsEnabled,
      isAdmin: isPortalAdminFromDecodedToken(decoded),
      teamManagementAvailable: Boolean(getPortalTenantFirebaseClaimName()),
    },
    { headers: noStore },
  );
}

export async function PUT(req: NextRequest): Promise<Response> {
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400, headers: noStore });
  }
  const enabled =
    typeof body === "object" &&
    body !== null &&
    "emailNotificationsEnabled" in body &&
    typeof (body as { emailNotificationsEnabled: unknown }).emailNotificationsEnabled === "boolean"
      ? (body as { emailNotificationsEnabled: boolean }).emailNotificationsEnabled
      : null;
  if (enabled === null) {
    return NextResponse.json({ error: "Set emailNotificationsEnabled (boolean)." }, { status: 400, headers: noStore });
  }

  await setPortalUserEmailNotifications({
    uid: decoded.uid,
    tenantId: portalTenant.tenantId,
    enabled,
  });

  return NextResponse.json({ ok: true, emailNotificationsEnabled: enabled }, { headers: noStore });
}
