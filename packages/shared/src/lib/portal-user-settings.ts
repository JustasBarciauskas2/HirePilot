import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@techrecruit/shared/lib/firebase-admin";

export const PORTAL_USER_SETTINGS_COLLECTION = "portalUserSettings";

const NOTIFY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PortalUserSettings = {
  tenantId: string;
  emailNotificationsEnabled: boolean;
  /** If set, new-application recruiter emails go here instead of the Auth sign-in email. */
  applicationNotificationEmail: string | null;
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
  const rawOverride = typeof d.applicationNotificationEmail === "string" ? d.applicationNotificationEmail.trim() : "";
  const applicationNotificationEmail =
    rawOverride && NOTIFY_EMAIL_RE.test(rawOverride) ? rawOverride.toLowerCase() : null;
  if (!tenantId) return null;
  return { tenantId, emailNotificationsEnabled, applicationNotificationEmail };
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

export type UpdatePortalUserNotificationSettingsParams = {
  uid: string;
  tenantId: string;
  emailNotificationsEnabled?: boolean;
  /** Pass `null` or `""` (via API) to clear and fall back to sign-in email. Omit to leave unchanged. */
  applicationNotificationEmail?: string | null;
};

export async function updatePortalUserNotificationSettings(
  params: UpdatePortalUserNotificationSettingsParams,
): Promise<void> {
  const uid = params.uid.trim();
  const tenantId = params.tenantId.trim();
  if (!uid || !tenantId) throw new Error("Missing uid or tenantId.");
  if (params.emailNotificationsEnabled === undefined && params.applicationNotificationEmail === undefined) {
    throw new Error("No notification fields to update.");
  }

  const patch: Record<string, unknown> = {
    tenantId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (params.emailNotificationsEnabled !== undefined) {
    patch.emailNotificationsEnabled = params.emailNotificationsEnabled;
  }

  if (params.applicationNotificationEmail !== undefined) {
    const e = params.applicationNotificationEmail?.trim() ?? "";
    if (e === "") {
      patch.applicationNotificationEmail = FieldValue.delete();
    } else if (!NOTIFY_EMAIL_RE.test(e)) {
      throw new Error("Invalid notification email.");
    } else {
      patch.applicationNotificationEmail = e.toLowerCase();
    }
  }

  const db = getFirebaseAdminFirestore();
  await db.collection(PORTAL_USER_SETTINGS_COLLECTION).doc(uid).set(patch, { merge: true });
}

/**
 * Resolves env recruiter list: drops users who disabled notifications; for others uses
 * `applicationNotificationEmail` when set, otherwise Firebase Auth email; non-Auth addresses unchanged. Deduped.
 */
export async function resolveRecruiterApplicationNotifyRecipients(emails: string[]): Promise<string[]> {
  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminFirestore();
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of emails) {
    const lookup = raw.trim().toLowerCase();
    if (!lookup) continue;
    try {
      const user = await auth.getUserByEmail(lookup);
      const snap = await db.collection(PORTAL_USER_SETTINGS_COLLECTION).doc(user.uid).get();
      const d = snap.data() as Record<string, unknown> | undefined;
      const enabled = d?.emailNotificationsEnabled !== false;
      if (!enabled) continue;

      const rawOverride =
        typeof d?.applicationNotificationEmail === "string" ? d.applicationNotificationEmail.trim() : "";
      const override =
        rawOverride && NOTIFY_EMAIL_RE.test(rawOverride) ? rawOverride.toLowerCase() : null;
      const authEmail = user.email?.trim().toLowerCase() ?? "";
      const dest = (override ?? (authEmail || raw.trim())).toLowerCase();
      if (!dest || !NOTIFY_EMAIL_RE.test(dest)) continue;
      if (seen.has(dest)) continue;
      seen.add(dest);
      out.push(dest);
    } catch {
      if (!seen.has(lookup)) {
        seen.add(lookup);
        out.push(raw.trim());
      }
    }
  }
  return out;
}
