import { NextRequest, NextResponse } from "next/server";
import type { UserRecord } from "firebase-admin/auth";
import {
  isPortalAdminFromDecodedToken,
  MUST_CHANGE_PASSWORD_CLAIM_NAME,
  PORTAL_ADMIN_CLAIM_NAME,
} from "@techrecruit/shared/lib/portal-admin";
import {
  getPortalTenantFirebaseClaimName,
  getPortalTenantFromRequest,
} from "@techrecruit/shared/lib/portal-tenant";
import { getFirebaseAdminAuth } from "@techrecruit/shared/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tenantClaimName(): string | null {
  return getPortalTenantFirebaseClaimName();
}

function userTenantId(u: { customClaims?: object | null }): string | null {
  const name = tenantClaimName();
  if (!name) return null;
  const v = (u.customClaims as Record<string, unknown> | undefined)?.[name];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** List portal users for your tenant. Any signed-in member of the tenant may call this; add/remove remain admin-only. */
export async function GET(req: NextRequest): Promise<Response> {
  const claimName = tenantClaimName();
  if (!claimName) {
    return NextResponse.json(
      {
        error:
          "Team directory requires PORTAL_TENANT_FIREBASE_CLAIM so each account has a tenant id on the ID token.",
      },
      { status: 503, headers: noStore },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  const auth = getFirebaseAdminAuth();
  const users: {
    uid: string;
    email: string | null;
    displayName: string | null;
    portalAdmin: boolean;
  }[] = [];

  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      const tid = userTenantId(u);
      if (tid !== portalTenant.tenantId) continue;
      const claims = u.customClaims as Record<string, unknown> | undefined;
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        portalAdmin: claims?.[PORTAL_ADMIN_CLAIM_NAME] === true,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? "", undefined, { sensitivity: "base" }));

  return NextResponse.json({ users }, { headers: noStore });
}

export async function POST(req: NextRequest): Promise<Response> {
  const claimName = tenantClaimName();
  if (!claimName) {
    return NextResponse.json(
      {
        error:
          "Team management requires PORTAL_TENANT_FIREBASE_CLAIM so new accounts can be assigned to your organization.",
      },
      { status: 503, headers: noStore },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  if (!isPortalAdminFromDecodedToken(decoded)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400, headers: noStore });
  }
  const o = body as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  const password = typeof o.password === "string" ? o.password : "";
  const makeAdmin = o.portalAdmin === true;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400, headers: noStore });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400, headers: noStore });
  }

  const auth = getFirebaseAdminAuth();
  let uid: string;
  try {
    const created = await auth.createUser({ email, password, emailVerified: false });
    uid = created.uid;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create user.";
    if (/already exists/i.test(msg)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409, headers: noStore });
    }
    return NextResponse.json({ error: msg }, { status: 400, headers: noStore });
  }

  const claims: Record<string, unknown> = {
    [claimName]: portalTenant.tenantId,
    [MUST_CHANGE_PASSWORD_CLAIM_NAME]: true,
  };
  if (makeAdmin) claims[PORTAL_ADMIN_CLAIM_NAME] = true;

  try {
    await auth.setCustomUserClaims(uid, claims);
  } catch (e) {
    try {
      await auth.deleteUser(uid);
    } catch {
      /* ignore */
    }
    const msg = e instanceof Error ? e.message : "Could not set tenant on new user.";
    return NextResponse.json({ error: msg }, { status: 500, headers: noStore });
  }

  return NextResponse.json(
    {
      ok: true,
      uid,
      email,
      portalAdmin: makeAdmin,
      message:
        "Share the initial password securely. On first sign-in they must choose a new password before using the portal.",
    },
    { status: 201, headers: noStore },
  );
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const claimName = tenantClaimName();
  if (!claimName) {
    return NextResponse.json(
      { error: "Team management requires PORTAL_TENANT_FIREBASE_CLAIM." },
      { status: 503, headers: noStore },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  if (!isPortalAdminFromDecodedToken(decoded)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  const targetUid = req.nextUrl.searchParams.get("uid")?.trim() ?? "";
  if (!targetUid) {
    return NextResponse.json({ error: "Missing uid query parameter." }, { status: 400, headers: noStore });
  }
  if (targetUid === decoded.uid) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400, headers: noStore });
  }

  const auth = getFirebaseAdminAuth();
  let target: UserRecord;
  try {
    target = await auth.getUser(targetUid);
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404, headers: noStore });
  }
  if (userTenantId(target) !== portalTenant.tenantId) {
    return NextResponse.json({ error: "User is not in your organization." }, { status: 403, headers: noStore });
  }

  try {
    await auth.deleteUser(targetUid);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete user.";
    return NextResponse.json({ error: msg }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}

/** Set a new temporary password for a teammate (same tenant). Mirrors POST create: user must change password on next sign-in. */
export async function PATCH(req: NextRequest): Promise<Response> {
  const claimName = tenantClaimName();
  if (!claimName) {
    return NextResponse.json(
      { error: "Team management requires PORTAL_TENANT_FIREBASE_CLAIM." },
      { status: 503, headers: noStore },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  if (!isPortalAdminFromDecodedToken(decoded)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403, headers: noStore });
  }
  const portalTenant = getPortalTenantFromRequest(req, decoded);
  if (!portalTenant.ok) return portalTenant.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400, headers: noStore });
  }
  const o = body as Record<string, unknown>;
  const targetUid = typeof o.uid === "string" ? o.uid.trim() : "";
  const password = typeof o.password === "string" ? o.password : "";

  if (!targetUid) {
    return NextResponse.json({ error: "Missing uid." }, { status: 400, headers: noStore });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400, headers: noStore });
  }

  const auth = getFirebaseAdminAuth();
  let target: UserRecord;
  try {
    target = await auth.getUser(targetUid);
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404, headers: noStore });
  }
  if (userTenantId(target) !== portalTenant.tenantId) {
    return NextResponse.json({ error: "User is not in your organization." }, { status: 403, headers: noStore });
  }

  try {
    await auth.updateUser(targetUid, { password });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update password.";
    return NextResponse.json({ error: msg }, { status: 400, headers: noStore });
  }

  const prevClaims = { ...(target.customClaims ?? {}) };
  try {
    await auth.setCustomUserClaims(targetUid, {
      ...prevClaims,
      [MUST_CHANGE_PASSWORD_CLAIM_NAME]: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Password was updated but could not require a password change on next login.";
    return NextResponse.json({ error: msg }, { status: 500, headers: noStore });
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Temporary password saved. Share it securely; on next sign-in they must choose a new password before using the portal.",
    },
    { headers: noStore },
  );
}
