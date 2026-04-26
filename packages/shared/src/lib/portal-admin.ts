import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Firebase Auth custom claim for portal administrators (team management).
 * Set with Admin SDK, e.g. `setCustomUserClaims(uid, { tenantId: "…", portalAdmin: true })`.
 */
export const PORTAL_ADMIN_CLAIM_NAME = "portalAdmin" as const;

/** Set when an admin creates the account with a temporary password; cleared after first password change. */
export const MUST_CHANGE_PASSWORD_CLAIM_NAME = "mustChangePassword" as const;

export function isPortalAdminFromDecodedToken(decoded: DecodedIdToken): boolean {
  const v = (decoded as unknown as Record<string, unknown>)[PORTAL_ADMIN_CLAIM_NAME];
  return v === true;
}

export function mustChangePasswordFromDecodedToken(decoded: DecodedIdToken): boolean {
  const v = (decoded as unknown as Record<string, unknown>)[MUST_CHANGE_PASSWORD_CLAIM_NAME];
  return v === true;
}
