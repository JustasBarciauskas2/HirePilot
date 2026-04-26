import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@techrecruit/shared/lib/firebase-admin";

export const PORTAL_USER_SETTINGS_COLLECTION = "portalUserSettings";

export type PortalUserSettings = {
  tenantId: string;
  emailNotificationsEnabled: boolean;
};

export async function getPortalUserSettingsDoc(uid: string): Promise<PortalUserSettings | null> {
  const id = uid.trim();
  if (!id) return null;
  const db = getFirebaseAdminFirestore();
  const snap = await db.collection(PORTAL_USER_SETTINGS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data() as Record<string, unknown> | undefined;
  if (!d) return null;
  const tenantId = typeof d.tenantId === "string" ? d.tenantId.trim() : "";
  const emailNotificationsEnabled = d.emailNotificationsEnabled !== false;
  if (!tenantId) return null;
  return { tenantId, emailNotificationsEnabled };
}

/**
 * Whether this user wants recruiter-facing application emails (when their address is in
 * `RECRUITER_APPLICATION_NOTIFY_EMAIL`). Defaults to true when unset.
 */
export async function getEmailNotificationsEnabledForUid(uid: string): Promise<boolean> {
  const doc = await getPortalUserSettingsDoc(uid);
  if (!doc) return true;
  return doc.emailNotificationsEnabled !== false;
}

export async function setPortalUserEmailNotifications(params: {
  uid: string;
  tenantId: string;
  enabled: boolean;
}): Promise<void> {
  const uid = params.uid.trim();
  const tenantId = params.tenantId.trim();
  if (!uid || !tenantId) throw new Error("Missing uid or tenantId.");

  const db = getFirebaseAdminFirestore();
  await db.collection(PORTAL_USER_SETTINGS_COLLECTION).doc(uid).set(
    {
      tenantId,
      emailNotificationsEnabled: params.enabled,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Drops recruiter notify addresses tied to Firebase users who turned off email notifications.
 * Addresses with no Firebase user are kept (e.g. shared inboxes not registered in Auth).
 */
export async function filterRecruiterEmailsByNotificationPreference(emails: string[]): Promise<string[]> {
  const auth = getFirebaseAdminAuth();
  const out: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    try {
      const user = await auth.getUserByEmail(email);
      const enabled = await getEmailNotificationsEnabledForUid(user.uid);
      if (!enabled) continue;
    } catch {
      /* no Auth user — keep */
    }
    out.push(raw.trim());
  }
  return out;
}
