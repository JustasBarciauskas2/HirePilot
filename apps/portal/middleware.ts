import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PORTAL_ENTRY_TENANT_COOKIE_NAME,
  PORTAL_TENANT_COOKIE_NAME,
  getPortalHttpOnlyCookieSetOptions,
  getPortalTenantFirebaseClaimName,
  isPortalTenantIdAllowed,
} from "@techrecruit/shared/lib/portal-tenant";

/**
 * If the URL contains `?tenant=` or `?tenantId=` (from a marketing “Recruiter portal” link), we set an HttpOnly cookie
 * and redirect without those params. When `PORTAL_TENANT_FIREBASE_CLAIM` is set, we set `portal-entry-tenant`
 * (which org’s link was used) for sync-tenant to match the user’s `tenantId` claim, and we do not set the session `portal-tenant`
 * cookie from the URL (that comes from `POST /api/portal/auth/sync-tenant` after sign-in).
 */
export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get("tenant") ?? searchParams.get("tenantId");
  const candidate = raw?.trim() ?? "";
  if (!candidate) {
    return NextResponse.next();
  }
  const u = request.nextUrl.clone();
  u.searchParams.delete("tenant");
  u.searchParams.delete("tenantId");

  if (!isPortalTenantIdAllowed(candidate)) {
    return NextResponse.redirect(u);
  }

  if (getPortalTenantFirebaseClaimName()) {
    const res = NextResponse.redirect(u);
    res.cookies.set(PORTAL_ENTRY_TENANT_COOKIE_NAME, candidate, getPortalHttpOnlyCookieSetOptions());
    return res;
  }

  const res = NextResponse.redirect(u);
  res.cookies.set(PORTAL_TENANT_COOKIE_NAME, candidate, getPortalHttpOnlyCookieSetOptions());
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
