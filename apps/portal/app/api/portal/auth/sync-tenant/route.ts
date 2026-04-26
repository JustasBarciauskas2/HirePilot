import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import {
  getPortalHttpOnlyCookieSetOptions,
  getPortalTenantFirebaseClaimName,
  getPortalTenantIdFromDecodedToken,
  isPortalTenantIdAllowed,
  PORTAL_ENTRY_TENANT_COOKIE_NAME,
  PORTAL_TENANT_COOKIE_NAME,
} from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

/**
 * When `PORTAL_TENANT_FIREBASE_CLAIM` is set: align httpOnly `portal-tenant` and `portal-entry-tenant` with the
 * signed-in user’s tenant id **from the ID token**. Marketing-site entry cookies are not required — any stale or
 * missing entry cookie is overwritten so direct portal URLs and bookmarks work.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const claimName = getPortalTenantFirebaseClaimName();
  if (!claimName) {
    return NextResponse.json({ changed: false, skipped: true });
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tid = getPortalTenantIdFromDecodedToken(decoded);
  if (!tid) {
    return NextResponse.json(
      { error: "No tenant claim on this account. Set custom claims to match PORTAL_TENANT_FIREBASE_CLAIM." },
      { status: 403 },
    );
  }
  if (!isPortalTenantIdAllowed(tid)) {
    return NextResponse.json({ error: "Tenant is not allowed for this portal deployment." }, { status: 403 });
  }

  const current = req.cookies.get(PORTAL_TENANT_COOKIE_NAME)?.value?.trim() ?? "";
  const currentEntry = req.cookies.get(PORTAL_ENTRY_TENANT_COOKIE_NAME)?.value?.trim() ?? "";
  if (current === tid && currentEntry === tid) {
    return NextResponse.json({ changed: false, tenantId: tid });
  }

  const res = NextResponse.json({ changed: true, tenantId: tid });
  res.cookies.set(PORTAL_TENANT_COOKIE_NAME, tid, getPortalHttpOnlyCookieSetOptions());
  res.cookies.set(PORTAL_ENTRY_TENANT_COOKIE_NAME, tid, getPortalHttpOnlyCookieSetOptions());
  return res;
}
