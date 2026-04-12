/**
 * Client-safe types & labels for job applications — do not import Firebase Admin here.
 * Server-only logic lives in `job-applications.ts`.
 */

import type { CandidateScreeningResult } from "@/lib/candidate-screening-result";

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
  /** AI screening from your tenant applications API merge — not stored in Firestore. */
  screening?: CandidateScreeningResult;
};

export function isJobApplicationStatusString(v: unknown): v is JobApplicationStatus {
  return typeof v === "string" && (JOB_APPLICATION_STATUSES as readonly string[]).includes(v);
}
