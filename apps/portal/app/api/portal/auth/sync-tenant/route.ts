import { NextRequest, NextResponse } from "next/server";
import { SIGN_IN_INVALID_CREDENTIALS_MESSAGE } from "@techrecruit/shared/lib/auth-error-message";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";
import {
  applyClearPortalEntryAndSessionTenantCookies,
  getPortalHttpOnlyCookieSetOptions,
  getPortalTenantFirebaseClaimName,
  getPortalTenantIdFromDecodedToken,
  isPortalTenantIdAllowed,
  PORTAL_AUTH_ERROR_ENTRY_TENANT_MISMATCH,
  PORTAL_AUTH_ERROR_ENTRY_TENANT_REQUIRED,
  PORTAL_ENTRY_TENANT_COOKIE_NAME,
  PORTAL_TENANT_COOKIE_NAME,
} from "@techrecruit/shared/lib/portal-tenant";

export const runtime = "nodejs";

/**
 * When `PORTAL_TENANT_FIREBASE_CLAIM` is set: (1) the httpOnly `portal-tenant` cookie is aligned with the user’s
 * `tenantId` claim, and (2) the `portal-entry-tenant` cookie (from the marketing `?tenant=` link) must match that
 * claim. In **development** only, missing `portal-entry-tenant` is allowed. Mismatch always rejects the session.
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

  const allowMissingEntry = process.env.NODE_ENV === "development";
  const entry = req.cookies.get(PORTAL_ENTRY_TENANT_COOKIE_NAME)?.value?.trim() ?? "";

  if (entry && tid !== entry) {
    const res = NextResponse.json(
      { error: SIGN_IN_INVALID_CREDENTIALS_MESSAGE, code: PORTAL_AUTH_ERROR_ENTRY_TENANT_MISMATCH },
      { status: 403 },
    );
    applyClearPortalEntryAndSessionTenantCookies(res);
    return res;
  }

  if (!entry && !allowMissingEntry) {
    const res = NextResponse.json(
      { error: SIGN_IN_INVALID_CREDENTIALS_MESSAGE, code: PORTAL_AUTH_ERROR_ENTRY_TENANT_REQUIRED },
      { status: 403 },
    );
    applyClearPortalEntryAndSessionTenantCookies(res);
    return res;
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
