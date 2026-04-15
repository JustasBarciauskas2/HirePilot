import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue, type DocumentSnapshot, type Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore, getFirebaseStorageBucket } from "@techrecruit/shared/lib/firebase-admin";
import {
  JOB_APPLICATIONS_COLLECTION,
  JOB_APPLICATION_STATUSES,
  type JobApplicationRecord,
  type JobApplicationStatus,
} from "@techrecruit/shared/lib/job-application-shared";
import { getTenantInstancePayload } from "@techrecruit/shared/lib/tenant-instance";

export {
  JOB_APPLICATIONS_COLLECTION,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_LABELS,
  type JobApplicationRecord,
  type JobApplicationStatus,
} from "@techrecruit/shared/lib/job-application-shared";

const MAX_CV_BYTES = 5 * 1024 * 1024;

const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isAllowedCvMime(mime: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  return ALLOWED_CV_TYPES.has(m);
}

export function assertCvSizeOk(size: number): void {
  if (size <= 0) throw new Error("CV file is empty.");
  if (size > MAX_CV_BYTES) throw new Error("CV must be 5MB or smaller.");
}

export function sanitizeCvFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "").trim() || "cv";
  return base.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 160);
}

function timestampToIso(t: Timestamp | undefined): string {
  if (!t?.toDate) return new Date(0).toISOString();
  return t.toDate().toISOString();
}

function isJobApplicationStatus(v: unknown): v is JobApplicationStatus {
  return typeof v === "string" && (JOB_APPLICATION_STATUSES as readonly string[]).includes(v);
}

function docToRecord(doc: DocumentSnapshot): JobApplicationRecord {
  const d = doc.data();
  if (!d) {
    throw new Error("Missing application document data");
  }
  return {
    id: doc.id,
    tenantId: String(d.tenantId ?? ""),
    jobRef: String(d.jobRef ?? ""),
    jobSlug: String(d.jobSlug ?? ""),
    jobTitle: String(d.jobTitle ?? ""),
    companyName: String(d.companyName ?? ""),
    vacancyId:
      typeof d.vacancyId === "string" && d.vacancyId.trim() ? d.vacancyId.trim() : undefined,
    firstName: String(d.firstName ?? ""),
    lastName: String(d.lastName ?? ""),
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    cvStoragePath: String(d.cvStoragePath ?? ""),
    cvFileName: String(d.cvFileName ?? ""),
    cvContentType: String(d.cvContentType ?? ""),
    status: (isJobApplicationStatus(d.status) ? d.status : "new") as JobApplicationStatus,
    createdAt: timestampToIso(d.createdAt as Timestamp | undefined),
    backendPersonId:
      typeof d.backendPersonId === "string" && d.backendPersonId.trim()
        ? d.backendPersonId.trim()
        : undefined,
    webhookCompletedAt: (() => {
      const ts = d.webhookCompletedAt as Timestamp | undefined;
      return ts?.toDate ? ts.toDate().toISOString() : undefined;
    })(),
  };
}

export async function uploadApplicationCv(params: {
  tenantId: string;
  jobRef: string;
  buffer: Buffer;
  originalName: string;
  contentType: string;
}): Promise<{ storagePath: string; fileName: string; contentType: string }> {
  const safeName = sanitizeCvFilename(params.originalName);
  const id = randomUUID();
  const storagePath = `applications/${params.tenantId}/${params.jobRef}/${id}_${safeName}`;
  const bucket = getFirebaseStorageBucket();
  const file = bucket.file(storagePath);
  await file.save(params.buffer, {
    contentType: params.contentType || "application/octet-stream",
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });
  return { storagePath, fileName: safeName, contentType: params.contentType };
}

export async function createJobApplicationDoc(data: {
  tenantId: string;
  jobRef: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  /** Same as `JobDetail.id` when present — used for `/api/vacancy/...` queries. */
  vacancyId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cvStoragePath: string;
  cvFileName: string;
  cvContentType: string;
}): Promise<string> {
  const db = getFirebaseAdminFirestore();
  const { vacancyId: rawVacancyId, ...rest } = data;
  const vacancyId = rawVacancyId?.trim();
  const ref = await db.collection(JOB_APPLICATIONS_COLLECTION).add({
    ...rest,
    ...(vacancyId ? { vacancyId } : {}),
    status: "new" satisfies JobApplicationStatus,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listJobApplicationsForTenant(tenantId: string): Promise<JobApplicationRecord[]> {
  const db = getFirebaseAdminFirestore();
  try {
    const snap = await db
      .collection(JOB_APPLICATIONS_COLLECTION)
      .where("tenantId", "==", tenantId)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    return snap.docs.map((doc) => docToRecord(doc));
  } catch {
    const snap = await db
      .collection(JOB_APPLICATIONS_COLLECTION)
      .where("tenantId", "==", tenantId)
      .limit(500)
      .get();
    const rows = snap.docs.map((doc) => docToRecord(doc));
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }
}

export async function listJobApplicationsForVacancy(
  tenantId: string,
  vacancyId: string,
): Promise<JobApplicationRecord[]> {
  const db = getFirebaseAdminFirestore();
  const vid = vacancyId.trim();
  if (!vid) return [];
  try {
    const snap = await db
      .collection(JOB_APPLICATIONS_COLLECTION)
      .where("tenantId", "==", tenantId)
      .where("vacancyId", "==", vid)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    return snap.docs.map((doc) => docToRecord(doc));
  } catch {
    const snap = await db
      .collection(JOB_APPLICATIONS_COLLECTION)
      .where("tenantId", "==", tenantId)
      .where("vacancyId", "==", vid)
      .limit(500)
      .get();
    const rows = snap.docs.map((doc) => docToRecord(doc));
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }
}

export async function getJobApplicationForTenant(
  id: string,
  tenantId: string,
): Promise<JobApplicationRecord | null> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return null;
  return docToRecord(doc);
}

/** For public screening poll: record + whether deferred webhook has finished (success or skip/fail). */
export async function getJobApplicationWebhookPollState(
  id: string,
  tenantId: string,
): Promise<{ record: JobApplicationRecord; webhookCompletedAt: string | null } | null> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return null;
  const record = docToRecord(doc);
  const ts = d.webhookCompletedAt as Timestamp | undefined;
  const webhookCompletedAt = ts?.toDate ? ts.toDate().toISOString() : null;
  return { record, webhookCompletedAt };
}

export async function markJobApplicationWebhookFinished(applicationId: string, tenantId: string): Promise<void> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(applicationId);
  const doc = await ref.get();
  if (!doc.exists) return;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return;
  await ref.update({ webhookCompletedAt: FieldValue.serverTimestamp() });
}

/** Firestore allows a limited number of documents per `getAll` call — batch to stay under the quota. */
const GET_ALL_CHUNK = 10;

/** Load applications by Firestore document id (same ids your backend webhook receives as `applicationId`). */
export async function getJobApplicationsByIdsForTenant(
  tenantId: string,
  ids: string[],
): Promise<JobApplicationRecord[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const db = getFirebaseAdminFirestore();
  const byId = new Map<string, JobApplicationRecord>();

  for (let i = 0; i < unique.length; i += GET_ALL_CHUNK) {
    const chunk = unique.slice(i, i + GET_ALL_CHUNK);
    const refs = chunk.map((id) => db.collection(JOB_APPLICATIONS_COLLECTION).doc(id));
    const snaps = await db.getAll(...refs);
    for (const doc of snaps) {
      if (!doc.exists) continue;
      const d = doc.data();
      if (!d || String(d.tenantId) !== tenantId) continue;
      try {
        byId.set(doc.id, docToRecord(doc));
      } catch {
        /* skip malformed */
      }
    }
  }

  /** Preserve backend list order — only ids returned by the backend appear, in that order. */
  const ordered: JobApplicationRecord[] = [];
  for (const id of unique) {
    const r = byId.get(id);
    if (r) ordered.push(r);
  }
  return ordered;
}

export async function setBackendPersonIdForApplication(
  applicationFirestoreId: string,
  tenantId: string,
  backendPersonId: string,
): Promise<boolean> {
  return setJobApplicationWebhookResult(applicationFirestoreId, tenantId, { backendPersonId });
}

/** Persists webhook outcome (your backend applicant id) on the application document. Screening is not stored — return it from your tenant applications API (see `mergeScreeningFromBackendTenantApplications`). */
export async function setJobApplicationWebhookResult(
  applicationFirestoreId: string,
  tenantId: string,
  data: {
    backendPersonId?: string;
  },
): Promise<boolean> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(applicationFirestoreId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return false;
  const patch: Record<string, unknown> = {};
  if (data.backendPersonId?.trim()) {
    patch.backendPersonId = data.backendPersonId.trim();
  }
  if (Object.keys(patch).length === 0) return true;
  await ref.update(patch);
  return true;
}

export async function updateJobApplicationStatusForTenant(
  id: string,
  tenantId: string,
  status: JobApplicationStatus,
): Promise<boolean> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return false;
  await ref.update({ status });
  return true;
}

export async function getSignedCvDownloadUrl(storagePath: string, expiresMs: number): Promise<string> {
  const bucket = getFirebaseStorageBucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresMs,
  });
  return url;
}

export function getTenantIdForApplications(): string {
  return getTenantInstancePayload().id;
}
