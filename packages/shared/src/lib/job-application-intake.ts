import "server-only";

import type { JobDetail } from "@techrecruit/shared/data/job-types";
import { sendNewApplicationNotificationEmails } from "@techrecruit/shared/lib/application-notification-email";
import type { CandidateScreeningResult } from "@techrecruit/shared/lib/candidate-screening-result";
import { forwardJobApplicationToBackend } from "@techrecruit/shared/lib/forward-job-application";
import {
  assertCvSizeOk,
  createJobApplicationDoc,
  isAllowedCvMime,
  markJobApplicationWebhookFinished,
  setJobApplicationWebhookResult,
  uploadApplicationCv,
} from "@techrecruit/shared/lib/job-applications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  return raw.trim().slice(0, 40);
}

function rawError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function storageSubmitError(e: unknown): string {
  const raw = rawError(e);
  if (/NOT_FOUND|^\s*5\s+NOT_FOUND/i.test(raw)) {
    return (
      "Firebase Storage: bucket not found or wrong name. In Console → Storage, copy the bucket id from the gs:// URL " +
      "(e.g. your-project-id.firebasestorage.app) and set FIREBASE_STORAGE_BUCKET and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET to that value. " +
      "Restart the dev server after changing .env."
    );
  }
  return raw || "Could not upload the CV.";
}

function firestoreSubmitError(e: unknown, projectId: string): string {
  const raw = rawError(e);
  if (/PERMISSION_DENIED|Cloud Firestore API has not been used|firestore\.googleapis\.com|API has not been used.*disabled/i.test(raw)) {
    return (
      "The Cloud Firestore API is not enabled for this Google Cloud project. " +
      `Open https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${encodeURIComponent(projectId)} ` +
      "and click Enable. Wait 1–2 minutes, then try again. " +
      "After that, in Firebase Console → Firestore → create the database if you have not already."
    );
  }
  if (/NOT_FOUND|^\s*5\s+NOT_FOUND/i.test(raw)) {
    return (
      "Firestore: database missing or not accessible. Open Firebase Console → Firestore → Create database (start in production or test mode). " +
      "Then retry."
    );
  }
  return raw || "Could not save the application.";
}

export type RunAfter = (fn: () => void | Promise<void>) => void;

export type JobApplicationIntakeErrorBody = { error: string; debug?: string };
export type JobApplicationIntakeSuccessBody =
  | { ok: true; id: string; screeningStatus: "pending" }
  | {
      ok: true;
      id: string;
      screeningStatus: "complete";
      backendPersonId?: string;
      screening?: CandidateScreeningResult;
    };

export type JobApplicationIntakeResult =
  | { ok: true; status: 200; body: JobApplicationIntakeSuccessBody }
  | { ok: false; status: number; body: JobApplicationIntakeErrorBody };

/**
 * Full pipeline after validation: upload CV, Firestore doc, optional Resend notification emails, then the same
 * Java job-application webhook as public apply (`forwardJobApplicationToBackend`). Portal manual intake should pass
 * `sendTransactionalEmails: false` to skip Resend and send `notifyEmails=false` on the webhook multipart form when
 * your backend supports it.
 */
export async function runJobApplicationIntake(params: {
  tenantId: string;
  job: JobDetail;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cv: { buffer: Buffer; originalName: string; contentType: string };
  runAfter: RunAfter;
  /**
   * When `false`, skips {@link sendNewApplicationNotificationEmails} and sets `notifyEmails=false` on the backend
   * webhook form. Default `true` (public apply).
   */
  sendTransactionalEmails?: boolean;
}): Promise<JobApplicationIntakeResult> {
  const { tenantId, job, firstName, lastName, email, phone, cv, runAfter } = params;
  const sendTransactionalEmails = params.sendTransactionalEmails !== false;
  const mime = cv.contentType || "application/octet-stream";
  if (!isAllowedCvMime(mime)) {
    return {
      ok: false,
      status: 400,
      body: { error: "CV must be a PDF or Word document (.pdf, .doc, .docx)." },
    };
  }
  let buffer: Buffer;
  try {
    buffer = cv.buffer;
    assertCvSizeOk(buffer.length);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file size.";
    return { ok: false, status: 400, body: { error: msg } };
  }

  let storagePath: string;
  let fileName: string;
  let contentType: string;
  try {
    const uploaded = await uploadApplicationCv({
      tenantId,
      jobRef: job.ref,
      buffer,
      originalName: cv.originalName || "cv.pdf",
      contentType: mime,
    });
    storagePath = uploaded.storagePath;
    fileName = uploaded.fileName;
    contentType = uploaded.contentType;
  } catch (e) {
    console.error("[job-application-intake] storage upload failed", e);
    const err = storageSubmitError(e);
    return {
      ok: false,
      status: 500,
      body: {
        error: err,
        ...(process.env.NODE_ENV === "development" ? { debug: rawError(e) } : {}),
      },
    };
  }

  let id: string;
  try {
    id = await createJobApplicationDoc({
      tenantId,
      jobRef: job.ref,
      jobSlug: job.slug,
      jobTitle: job.title,
      companyName: job.companyName,
      vacancyId: job.id?.trim() ?? null,
      firstName,
      lastName,
      email,
      phone,
      cvStoragePath: storagePath,
      cvFileName: fileName,
      cvContentType: contentType,
    });
  } catch (e) {
    console.error("[job-application-intake] firestore write failed", e);
    const firebaseProjectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      "your-project-id";
    const err = firestoreSubmitError(e, firebaseProjectId);
    return {
      ok: false,
      status: 500,
      body: {
        error: err,
        ...(process.env.NODE_ENV === "development" ? { debug: rawError(e) } : {}),
      },
    };
  }

  if (sendTransactionalEmails) {
    runAfter(() => {
      void sendNewApplicationNotificationEmails({
        applicationId: id,
        tenantId,
        jobRef: job.ref,
        jobSlug: job.slug,
        jobTitle: job.title,
        companyName: job.companyName,
        firstName,
        lastName,
        applicantEmail: email,
        phone,
      }).catch((e) => console.error("[job-application-intake] notification emails", e));
    });
  }

  const webhookPayload = {
    applicationId: id,
    tenantId,
    jobRef: job.ref,
    jobSlug: job.slug,
    jobTitle: job.title,
    companyName: job.companyName,
    vacancyId: job.id?.trim() ?? null,
    firstName,
    lastName,
    email,
    phone,
    cvStoragePath: storagePath,
    cvFileName: fileName,
    cvContentType: contentType,
    ...(sendTransactionalEmails ? {} : { notifyEmails: false as const }),
  };

  const syncWebhook =
    process.env.JOB_APPLICATION_WEBHOOK_SYNC === "true" || process.env.JOB_APPLICATION_WEBHOOK_SYNC === "1";

  async function runWebhookAndPersist(): Promise<void> {
    try {
      const webhook = await forwardJobApplicationToBackend(webhookPayload, buffer);
      if (!webhook.ok) {
        console.error("[job-application-intake] backend webhook failed", webhook.status, webhook.hint);
        return;
      }
      if (webhook.skipped) return;
      await setJobApplicationWebhookResult(id, tenantId, {
        backendPersonId: webhook.backendPersonId,
      });
    } catch (e) {
      console.error("[job-application-intake] backend webhook error", e);
    } finally {
      await markJobApplicationWebhookFinished(id, tenantId);
    }
  }

  if (syncWebhook) {
    let backendPersonId: string | undefined;
    let screening: CandidateScreeningResult | undefined;
    try {
      const webhook = await forwardJobApplicationToBackend(webhookPayload, buffer);
      if (!webhook.ok) {
        console.error("[job-application-intake] backend webhook failed", webhook.status, webhook.hint);
      } else if (!webhook.skipped) {
        backendPersonId = webhook.backendPersonId;
        screening = webhook.screening;
        const saved = await setJobApplicationWebhookResult(id, tenantId, {
          backendPersonId,
        });
        if (!saved) {
          console.error("[job-application-intake] could not persist webhook result on application doc", id);
        }
      }
    } catch (e) {
      console.error("[job-application-intake] backend webhook unexpected error", e);
    } finally {
      await markJobApplicationWebhookFinished(id, tenantId);
    }
    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        id,
        screeningStatus: "complete" as const,
        ...(backendPersonId ? { backendPersonId } : {}),
        ...(screening ? { screening } : {}),
      },
    };
  }

  runAfter(() => {
    void runWebhookAndPersist();
  });

  return {
    ok: true,
    status: 200,
    body: { ok: true, id, screeningStatus: "pending" as const },
  };
}

/**
 * Parse and validate apply-form fields. Used by the public site and the portal manual intake.
 */
export function parseJobApplicationFormFields(formData: FormData): {
  jobSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cv: File;
} | { error: string } {
  const jobSlug = String(formData.get("jobSlug") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const cv = formData.get("cv");

  if (!jobSlug) {
    return { error: "jobSlug is required." };
  }
  if (!firstName || !lastName) {
    return { error: "First name and last name are required." };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { error: "A valid email is required." };
  }
  if (!(cv instanceof File) || cv.size === 0) {
    return { error: "A CV file (PDF or Word) is required." };
  }
  return { jobSlug, firstName, lastName, email, phone, cv };
}
