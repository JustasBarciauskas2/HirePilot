import { NextRequest, NextResponse } from "next/server";
import { isPortalAdminFromDecodedToken } from "@techrecruit/shared/lib/portal-admin";
import {
  getPortalTenantFromRequest,
  getPortalTenantFirebaseClaimName,
} from "@techrecruit/shared/lib/portal-tenant";
import {
  getEmailNotificationsEnabledForUid,
  getPortalUserSettingsDoc,
  updatePortalUserNotificationSettings,
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
  const doc = await getPortalUserSettingsDoc(decoded.uid);
  const applicationNotificationEmail = doc?.applicationNotificationEmail ?? null;

  return NextResponse.json(
    {
      email: decoded.email ?? null,
      emailNotificationsEnabled,
      applicationNotificationEmail,
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400, headers: noStore });
  }
  const o = body as Record<string, unknown>;

  const hasEnabled = "emailNotificationsEnabled" in o && typeof o.emailNotificationsEnabled === "boolean";
  const hasNotifyEmail = "applicationNotificationEmail" in o;

  if (!hasEnabled && !hasNotifyEmail) {
    return NextResponse.json(
      { error: "Provide emailNotificationsEnabled (boolean) and/or applicationNotificationEmail (string or null)." },
      { status: 400, headers: noStore },
    );
  }

  let applicationNotificationEmail: string | null | undefined;
  if (hasNotifyEmail) {
    const v = o.applicationNotificationEmail;
    if (v === null) applicationNotificationEmail = null;
    else if (typeof v === "string") applicationNotificationEmail = v.trim() === "" ? null : v.trim();
    else {
      return NextResponse.json(
        { error: "applicationNotificationEmail must be a string, empty string, or null." },
        { status: 400, headers: noStore },
      );
    }
  }

  try {
    await updatePortalUserNotificationSettings({
      uid: decoded.uid,
      tenantId: portalTenant.tenantId,
      ...(hasEnabled ? { emailNotificationsEnabled: o.emailNotificationsEnabled as boolean } : {}),
      ...(hasNotifyEmail ? { applicationNotificationEmail } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save settings.";
    return NextResponse.json({ error: msg }, { status: 400, headers: noStore });
  }

  const emailNotificationsEnabled = await getEmailNotificationsEnabledForUid(decoded.uid);
  const doc = await getPortalUserSettingsDoc(decoded.uid);

  return NextResponse.json(
    {
      ok: true,
      emailNotificationsEnabled,
      applicationNotificationEmail: doc?.applicationNotificationEmail ?? null,
    },
    { headers: noStore },
  );
}
