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
      {
        error:
          "No organization (tenant) on this account. An admin must set your Firebase custom claim to match PORTAL_TENANT_FIREBASE_CLAIM (e.g. tenantId), then sign in again. For local dev you can unset PORTAL_TENANT_FIREBASE_CLAIM to use cookies only.",
      },
      { status: 403 },
    );
  }
  if (!isPortalTenantIdAllowed(tid)) {
    return NextResponse.json(
      {
        error:
          "Your account’s organization id is not allowed on this portal. Add it to PORTAL_ALLOWED_TENANT_IDS, or ensure it matches this deployment’s default tenant (often NEXT_PUBLIC_TENANT_ID).",
      },
      { status: 403 },
    );
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
