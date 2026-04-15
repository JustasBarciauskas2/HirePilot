import type { User } from "firebase/auth";

export type PortalAuthHeaderResult = { Authorization: string } & Record<string, string>;

/**
 * @param tenantId — when set, sent as `X-Tenant-Id` so portal APIs scope to that marketing tenant.
 */
export async function portalAuthHeaders(user: User, tenantId?: string | null): Promise<PortalAuthHeaderResult> {
  const token = await user.getIdToken();
  const headers: PortalAuthHeaderResult = { Authorization: `Bearer ${token}` };
  const tid = tenantId?.trim();
  if (tid) {
    headers["X-Tenant-Id"] = tid;
  }
  return headers;
}
