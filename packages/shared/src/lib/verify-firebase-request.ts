import type { DecodedIdToken } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@techrecruit/shared/lib/firebase-admin";

export async function getFirebaseUserFromRequest(
  req: NextRequest,
): Promise<DecodedIdToken | null> {
  const header = req.headers.get("authorization");
  if (!header) {
    if (process.env.NODE_ENV === "development" && process.env.DEBUG_FIREBASE_TOKEN_ERRORS === "true") {
      console.warn("[portal] GET/POST: missing Authorization header (client must send Bearer ID token).");
    }
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) return null;

  const debug =
    process.env.DEBUG_PRINT_ACCESS_TOKEN === "true" ||
    process.env.DEBUG_FIREBASE_TOKEN_ERRORS === "true";

  try {
    return await getFirebaseAdminAuth().verifyIdToken(token);
  } catch (e) {
    if (debug) {
      console.error("[firebase] verifyIdToken failed:", e);
    }
    return null;
  }
}
