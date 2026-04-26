import { NextRequest, NextResponse } from "next/server";
import { MUST_CHANGE_PASSWORD_CLAIM_NAME } from "@techrecruit/shared/lib/portal-admin";
import { getFirebaseAdminAuth } from "@techrecruit/shared/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@techrecruit/shared/lib/verify-firebase-request";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" } as const;

/**
 * Removes `mustChangePassword` from the signed-in user after they update their password on first login.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }

  const auth = getFirebaseAdminAuth();
  const record = await auth.getUser(decoded.uid);
  const prev = { ...(record.customClaims ?? {}) };
  if (prev[MUST_CHANGE_PASSWORD_CLAIM_NAME] !== true) {
    return NextResponse.json({ ok: true, skipped: true }, { headers: noStore });
  }

  const next = { ...prev };
  delete next[MUST_CHANGE_PASSWORD_CLAIM_NAME];
  await auth.setCustomUserClaims(decoded.uid, next);

  return NextResponse.json({ ok: true }, { headers: noStore });
}
