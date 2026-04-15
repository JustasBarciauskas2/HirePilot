/**
 * Client-safe types & labels for job applications — do not import Firebase Admin here.
 * Server-only logic lives in `job-applications.ts`.
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

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export const JOB_APPLICATION_STATUS_LABELS: Record<JobApplicationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

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

export function isJobApplicationStatusString(v: unknown): v is JobApplicationStatus {
  return typeof v === "string" && (JOB_APPLICATION_STATUSES as readonly string[]).includes(v);
}

/** Strip internal tenant scope before JSON responses to the client. */
export function jobApplicationsForClientResponse(
  rows: JobApplicationRecord[],
): JobApplicationRecordClient[] {
  return rows.map(({ tenantId: _tenantId, ...rest }) => rest);
}
