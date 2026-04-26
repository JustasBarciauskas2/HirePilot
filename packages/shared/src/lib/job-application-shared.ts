/**
 * Client-safe types & labels for job applications — do not import Firebase Admin here.
 * Server-only logic lives in `job-applications.ts` and `portal-tenant-settings.ts`.
 */

import type { CandidateScreeningResult } from "@techrecruit/shared/lib/candidate-screening-result";

export const JOB_APPLICATIONS_COLLECTION = "jobApplications";

export const JOB_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type BuiltInJobApplicationStatusId = (typeof JOB_APPLICATION_STATUSES)[number];

/** Stored on each application document — id keys into the tenant pipeline (see {@link ApplicationPipelineStatus}). */
export type JobApplicationStatus = string;

export const JOB_APPLICATION_STATUS_LABELS = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
} as const satisfies Record<BuiltInJobApplicationStatusId, string>;

/** One row in the tenant’s ordered pipeline (labels editable; ids stable for Firestore `status`). */
export type ApplicationPipelineStatus = {
  id: string;
  label: string;
};

export const DEFAULT_APPLICATION_PIPELINE_STATUSES: ApplicationPipelineStatus[] = JOB_APPLICATION_STATUSES.map(
  (id) => ({ id, label: JOB_APPLICATION_STATUS_LABELS[id] }),
);

function humanizeUnknownStatusId(id: string): string {
  const s = id.replace(/_/g, " ").trim();
  if (!s) return id;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display label for a stored status id, using the tenant pipeline when available. */
export function resolveApplicationStatusLabel(
  statusId: string,
  pipeline?: ApplicationPipelineStatus[] | null,
): string {
  const sid = statusId.trim();
  if (!sid) return humanizeUnknownStatusId(statusId);
  const fromPipeline = pipeline?.find((s) => s.id === sid);
  if (fromPipeline) return fromPipeline.label;
  const builtin = JOB_APPLICATION_STATUS_LABELS[sid as BuiltInJobApplicationStatusId];
  if (builtin) return builtin;
  return humanizeUnknownStatusId(sid);
}

/**
 * Generate a unique stage id from a label (new rows in the pipeline editor).
 * Ids must match Firestore validation in `portal-tenant-settings.ts`.
 */
export function slugifyApplicationPipelineId(label: string, existingIds: ReadonlySet<string>): string {
  const raw = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  let base = raw && /^[a-z]/.test(raw) ? raw : raw ? `s_${raw}` : "stage";
  if (!/^[a-z]/.test(base)) base = `s_${base}`;
  let id = base;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}_${n++}`;
  }
  return id;
}

/** Pipeline order first, then legacy/orphan ids from rows (sorted) with resolved labels. */
export function orderedStatusFilterOptions(
  pipeline: ApplicationPipelineStatus[],
  rowStatusIds: Iterable<string>,
): ApplicationPipelineStatus[] {
  const seen = new Set(pipeline.map((p) => p.id));
  const out = [...pipeline];
  const extra: string[] = [];
  for (const raw of rowStatusIds) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    extra.push(id);
  }
  extra.sort((a, b) => a.localeCompare(b));
  for (const id of extra) {
    out.push({ id, label: resolveApplicationStatusLabel(id, pipeline) });
  }
  return out;
}

const STAGE_SWATCHES = [
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-cyan-600",
  "bg-orange-500",
  "bg-indigo-500",
] as const;

/** Deterministic Tailwind color class for analytics bars (works for custom stage ids). */
export function pipelineStageSwatchClass(statusId: string): string {
  let h = 0;
  const s = statusId.trim();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return STAGE_SWATCHES[Math.abs(h) % STAGE_SWATCHES.length]!;
}

/** In-house note on an application; stored on the Firestore job application document. */
export type RecruiterApplicationComment = {
  id: string;
  text: string;
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601, when the text was last edited */
  updatedAt?: string;
  authorUserId: string;
  /** Display name (e.g. email or name from Firebase) */
  authorName: string;
};

export const MAX_RECRUITER_COMMENT_CHARS = 4_000;

export type JobApplicationRecord = {
  id: string;
  tenantId: string;
  /** Vacancy UUID from the job (`JobDetail.id`) when the application was submitted — use for `/api/vacancy/...` queries. */
  vacancyId?: string;
  jobRef: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cvStoragePath: string;
  cvFileName: string;
  cvContentType: string;
  status: JobApplicationStatus;
  /** ISO string for JSON APIs */
  createdAt: string;
  /** Your backend’s persisted applicant id (from webhook JSON `backendPersonId` or `id`). */
  backendPersonId?: string;
  /**
   * Set when the apply webhook / background processing has finished (Firestore).
   * Until then, screening may still be generated — the portal shows a loading state.
   */
  webhookCompletedAt?: string;
  /** Recruiter-only notes, persisted in Firestore. */
  recruiterComments?: RecruiterApplicationComment[];
  /** AI screening from your tenant applications API merge — not stored in Firestore. */
  screening?: CandidateScreeningResult;
};

/** Row returned from portal APIs to the browser — `tenantId` is server-only and omitted from JSON. */
export type JobApplicationRecordClient = Omit<JobApplicationRecord, "tenantId">;

/** True while apply processing may still produce screening (webhook not finished yet). */
export function isScreeningPendingOnRecord(r: JobApplicationRecord | JobApplicationRecordClient): boolean {
  if (r.screening) return false;
  if (r.webhookCompletedAt) return false;
  const created = Date.parse(r.createdAt);
  if (Number.isNaN(created)) return false;
  // Legacy documents without `webhookCompletedAt` — avoid spinning indefinitely.
  if (Date.now() - created > 60 * 60 * 1000) return false;
  return true;
}

export function isNonEmptyApplicationStatusId(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Strip internal tenant scope before JSON responses to the client. */
export function jobApplicationsForClientResponse(
  rows: JobApplicationRecord[],
): JobApplicationRecordClient[] {
  return rows.map(({ tenantId: _tenantId, ...rest }) => rest);
}
