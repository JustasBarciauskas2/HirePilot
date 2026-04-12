/**
 * Client-safe types & labels for job applications — do not import Firebase Admin here.
 * Server-only logic lives in `job-applications.ts`.
 */

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
  /** Your Java/API person id when the apply webhook returned one (field `id` in JSON, etc.). */
  backendPersonId?: string;
};

export function isJobApplicationStatusString(v: unknown): v is JobApplicationStatus {
  return typeof v === "string" && (JOB_APPLICATION_STATUSES as readonly string[]).includes(v);
}
