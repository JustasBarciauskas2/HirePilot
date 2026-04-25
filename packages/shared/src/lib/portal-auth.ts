import type { User } from "firebase/auth";

export type PortalAuthHeaderResult = { Authorization: string } & Record<string, string>;

export type PortalAuthHeadersOptions = {
  /**
   * When true, forces a new ID token from Firebase (slower). Use after a 401 to recover from a
   * stale client-side token cache, or for sensitive calls.
   */
  forceRefreshToken?: boolean;
};

/**
 * Tenant is **not** sent in headers — APIs read the httpOnly `portal-tenant` cookie (set by middleware from the
 * marketing “Recruiter portal” link) or Firebase custom claim when `PORTAL_TENANT_FIREBASE_CLAIM` is set.
 * Use `credentials: "include"` on `fetch` so the cookie is sent.
 */
export async function portalAuthHeaders(
  user: User,
  options?: PortalAuthHeadersOptions,
): Promise<PortalAuthHeaderResult> {
  const token = await user.getIdToken(options?.forceRefreshToken === true);
  return { Authorization: `Bearer ${token}` };
}
