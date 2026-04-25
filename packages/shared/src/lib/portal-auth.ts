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
 * @param tenantId — when set, sent as `X-Tenant-Id` so portal APIs scope to that marketing tenant.
 */
export async function portalAuthHeaders(
  user: User,
  tenantId?: string | null,
  options?: PortalAuthHeadersOptions,
): Promise<PortalAuthHeaderResult> {
  const token = await user.getIdToken(options?.forceRefreshToken === true);
  const headers: PortalAuthHeaderResult = { Authorization: `Bearer ${token}` };
  const tid = tenantId?.trim();
  if (tid) {
    headers["X-Tenant-Id"] = tid;
  }
  return headers;
}
