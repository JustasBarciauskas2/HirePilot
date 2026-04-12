import type { NextRequest } from "next/server";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";

/**
 * List/fetch application APIs accept either:
 * - `X-Applications-Api-Key: <APPLICATIONS_API_KEY>` or `Authorization: Bearer <APPLICATIONS_API_KEY>` (server-to-server), or
 * - `Authorization: Bearer <Firebase ID token>` (same as portal).
 */
export async function authorizeApplicationsFetch(req: NextRequest): Promise<boolean> {
  const expected = process.env.APPLICATIONS_API_KEY?.trim();
  if (expected) {
    const key =
      req.headers.get("x-applications-api-key")?.trim() ||
      /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim();
    if (key === expected) return true;
  }
  return (await getFirebaseUserFromRequest(req)) !== null;
}
