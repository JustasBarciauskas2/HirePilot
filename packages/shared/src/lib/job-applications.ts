import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore, getFirebaseStorageBucket } from "@techrecruit/shared/lib/firebase-admin";
import {
  JOB_APPLICATIONS_COLLECTION,
  MAX_RECRUITER_COMMENT_CHARS,
  type JobApplicationRecord,
  type JobApplicationStatus,
  type RecruiterApplicationComment,
} from "@techrecruit/shared/lib/job-application-shared";
import { getTenantInstancePayload } from "@techrecruit/shared/lib/tenant-instance";
import { getApplicationPipelineForTenant } from "@techrecruit/shared/lib/portal-tenant-settings";

export {
  JOB_APPLICATIONS_COLLECTION,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_LABELS,
  MAX_RECRUITER_COMMENT_CHARS,
  type JobApplicationRecord,
  type JobApplicationStatus,
  type RecruiterApplicationComment,
  type ApplicationPipelineStatus,
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

const MAX_RECRUITER_COMMENTS_PER_APPLICATION = 100;

function normalizeStatusFromFirestore(v: unknown): JobApplicationStatus {
  if (typeof v !== "string") return "new";
  const s = v.trim();
  return s || "new";
}

function mapRecruiterCommentFromFirestoreEntry(raw: unknown): RecruiterApplicationComment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : null;
  const text = typeof o.text === "string" ? o.text : "";
  const authorUserId = typeof o.authorUserId === "string" && o.authorUserId.trim() ? o.authorUserId.trim() : null;
  const authorName =
    typeof o.authorName === "string" && o.authorName.trim() ? o.authorName.trim() : "Recruiter";
  if (!id || !text.trim() || !authorUserId) return null;
  const ts = o.createdAt as Timestamp | undefined;
  let createdAt = "";
  if (ts && typeof ts.toDate === "function") {
    createdAt = ts.toDate().toISOString();
  } else if (typeof o.createdAt === "string") {
    const p = Date.parse(o.createdAt);
    createdAt = Number.isNaN(p) ? "" : new Date(p).toISOString();
  }
  if (!createdAt) return null;
  const uTs = o.updatedAt as Timestamp | undefined;
  let updatedAt: string | undefined;
  if (uTs && typeof uTs.toDate === "function") {
    updatedAt = uTs.toDate().toISOString();
  } else if (typeof o.updatedAt === "string" && o.updatedAt.trim()) {
    const p = Date.parse(o.updatedAt);
    if (!Number.isNaN(p)) updatedAt = new Date(p).toISOString();
  }
  const c: RecruiterApplicationComment = { id, text, createdAt, authorUserId, authorName };
  if (updatedAt) c.updatedAt = updatedAt;
  return c;
}

function mapRecruiterCommentsFromDoc(d: Record<string, unknown>): RecruiterApplicationComment[] | undefined {
  const arr = d.recruiterComments;
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const out: RecruiterApplicationComment[] = [];
  for (const raw of arr) {
    const c = mapRecruiterCommentFromFirestoreEntry(raw);
    if (c) out.push(c);
  }
  if (out.length === 0) return undefined;
  out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return out;
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
    status: normalizeStatusFromFirestore(d.status),
    createdAt: timestampToIso(d.createdAt as Timestamp | undefined),
    backendPersonId:
      typeof d.backendPersonId === "string" && d.backendPersonId.trim()
        ? d.backendPersonId.trim()
        : undefined,
    webhookCompletedAt: (() => {
      const ts = d.webhookCompletedAt as Timestamp | undefined;
      return ts?.toDate ? ts.toDate().toISOString() : undefined;
    })(),
    recruiterComments: mapRecruiterCommentsFromDoc(d as Record<string, unknown>),
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
): Promise<"ok" | "not_found" | "invalid_status"> {
  const pipeline = await getApplicationPipelineForTenant(tenantId);
  const allowed = new Set(pipeline.map((p) => p.id));
  const st = String(status ?? "").trim();
  if (!allowed.has(st)) return "invalid_status";

  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return "not_found";
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return "not_found";
  await ref.update({ status: st });
  return "ok";
}

/**
 * Appends a recruiter note to the application document. Persists in Firestore (shared across recruiters on the tenant).
 */
export async function addRecruiterCommentForTenant(
  id: string,
  tenantId: string,
  text: string,
  author: { userId: string; name: string },
): Promise<RecruiterApplicationComment | null> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_RECRUITER_COMMENT_CHARS) {
    return null;
  }
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const d = doc.data();
  if (!d || String(d.tenantId) !== tenantId) return null;
  const existing = Array.isArray(d.recruiterComments) ? d.recruiterComments : [];
  if (existing.length >= MAX_RECRUITER_COMMENTS_PER_APPLICATION) {
    return null;
  }
  const commentId = randomUUID();
  const now = Timestamp.now();
  const newEntry = {
    id: commentId,
    text: trimmed,
    createdAt: now,
    authorUserId: author.userId,
    authorName: author.name,
  };
  await ref.update({ recruiterComments: FieldValue.arrayUnion(newEntry) });
  return {
    id: commentId,
    text: trimmed,
    createdAt: now.toDate().toISOString(),
    authorUserId: author.userId,
    authorName: author.name,
  };
}

export type UpdateRecruiterCommentResult =
  | { kind: "ok"; comment: RecruiterApplicationComment }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "invalid" };

export type DeleteRecruiterCommentResult =
  | { kind: "ok" }
  | { kind: "not_found" }
  | { kind: "forbidden" };

type FirestoreCommentRow = {
  id?: unknown;
  text?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  authorUserId?: unknown;
  authorName?: unknown;
};

/**
 * Replaces a note’s text. Only the author (matching Firebase uid) can edit. Uses a transaction to avoid clobbering concurrent updates.
 */
export async function updateRecruiterCommentForTenant(
  applicationId: string,
  tenantId: string,
  commentId: string,
  newText: string,
  requesterUserId: string,
): Promise<UpdateRecruiterCommentResult> {
  const trimmed = newText.trim();
  if (!trimmed || trimmed.length > MAX_RECRUITER_COMMENT_CHARS) {
    return { kind: "invalid" };
  }
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(applicationId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: "not_found" } as const;
    const d = snap.data();
    if (!d || String(d.tenantId) !== tenantId) return { kind: "not_found" } as const;
    const arr = Array.isArray(d.recruiterComments) ? (d.recruiterComments as FirestoreCommentRow[]) : [];
    const match = arr.find(
      (e) => e?.id != null && String(e.id) === commentId,
    ) as FirestoreCommentRow | undefined;
    if (!match) {
      return { kind: "not_found" } as const;
    }
    if (String(match.authorUserId) !== requesterUserId) {
      return { kind: "forbidden" } as const;
    }
    const updatedAt = Timestamp.now();
    const name =
      typeof match.authorName === "string" && match.authorName.trim() ? match.authorName : "Recruiter";
    const next: Record<string, unknown>[] = arr.map((e) => {
      if (e?.id == null || String(e.id) !== commentId) {
        return e as unknown as Record<string, unknown>;
      }
      return {
        id: String(e.id),
        text: trimmed,
        createdAt: e.createdAt,
        authorUserId: String(e.authorUserId),
        authorName: name,
        updatedAt,
      };
    });
    tx.update(ref, { recruiterComments: next });
    const cTs = match.createdAt as Timestamp | undefined;
    const cAt = cTs?.toDate ? cTs.toDate().toISOString() : new Date(0).toISOString();
    return {
      kind: "ok" as const,
      comment: {
        id: commentId,
        text: trimmed,
        createdAt: cAt,
        updatedAt: updatedAt.toDate().toISOString(),
        authorUserId: String(match.authorUserId),
        authorName: name,
      } satisfies RecruiterApplicationComment,
    };
  });
}

/** Deletes a note. Only the author can delete. */
export async function deleteRecruiterCommentForTenant(
  applicationId: string,
  tenantId: string,
  commentId: string,
  requesterUserId: string,
): Promise<DeleteRecruiterCommentResult> {
  const db = getFirebaseAdminFirestore();
  const ref = db.collection(JOB_APPLICATIONS_COLLECTION).doc(applicationId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: "not_found" } as const;
    const d = snap.data();
    if (!d || String(d.tenantId) !== tenantId) return { kind: "not_found" } as const;
    const arr = Array.isArray(d.recruiterComments) ? (d.recruiterComments as FirestoreCommentRow[]) : [];
    const target = arr.find(
      (e) => e?.id != null && String(e.id) === commentId,
    ) as FirestoreCommentRow | undefined;
    if (!target) {
      return { kind: "not_found" } as const;
    }
    if (String(target.authorUserId) !== requesterUserId) {
      return { kind: "forbidden" } as const;
    }
    const next = arr.filter((e) => e?.id == null || String(e.id) !== commentId);
    tx.update(ref, { recruiterComments: next });
    return { kind: "ok" } as const;
  });
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
