import {
  parseCandidateScreeningFromBackendPayload,
  type CandidateScreeningResult,
} from "@techrecruit/shared/lib/candidate-screening-result";
import { getBackendJobApplicationWebhookUrl } from "@techrecruit/shared/lib/backend-url";

export type JobApplicationWebhookPayload = {
  /** Firestore document id — use this as the canonical application id */
  applicationId: string;
  tenantId: string;
  jobRef: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  /**
   * Vacancy primary key from your DB (`JobDetail.id`), sent as form field `vacancyId`.
   * Empty string in multipart when the listing has no UUID (use `jobRef` / `jobSlug` as fallback).
   */
  vacancyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Firebase Storage object path (server-only access unless you use Firebase/GCS credentials) */
  cvStoragePath: string;
  cvFileName: string;
  cvContentType: string;
};

/**
 * Multipart field names forwarded to your backend (same endpoint as before).
 * - `file`: CV bytes (PDF/Word), same idea as portal `POST /api/portal/job-document` (`file` + `tenantId`).
 * - Other fields are plain strings (see `appendJobApplicationFormFields`).
 */
export const JOB_APPLICATION_MULTIPART_FILE_FIELD = "file";

export function appendJobApplicationFormFields(form: FormData, payload: JobApplicationWebhookPayload): void {
  form.append("applicationId", payload.applicationId);
  form.append("tenantId", payload.tenantId);
  form.append("jobRef", payload.jobRef);
  form.append("jobSlug", payload.jobSlug);
  form.append("jobTitle", payload.jobTitle);
  form.append("companyName", payload.companyName);
  form.append("vacancyId", payload.vacancyId ?? "");
  form.append("firstName", payload.firstName);
  form.append("lastName", payload.lastName);
  form.append("email", payload.email);
  form.append("phone", payload.phone);
  form.append("cvStoragePath", payload.cvStoragePath);
  form.append("cvFileName", payload.cvFileName);
  form.append("cvContentType", payload.cvContentType);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Reads your persisted applicant id from webhook JSON.
 * Aligns with `com.example.hirepilot.dto.response.JobApplicationResponse`: prefer `backendPersonId`, then `id`
 * (persisted applicant), then `personId` / `candidateId`. Nested `{ "data": { ... } }` is supported.
 */
export function parseBackendPersonIdFromJson(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const tryVal = (v: unknown): string | undefined => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return undefined;
  };
  const o = data as Record<string, unknown>;
  const direct =
    tryVal(o.backendPersonId) ??
    tryVal(o.id) ??
    tryVal(o.personId) ??
    tryVal(o.candidateId);
  if (direct) return direct;
  if (o.data && typeof o.data === "object") {
    const inner = o.data as Record<string, unknown>;
    return (
      tryVal(inner.backendPersonId) ??
      tryVal(inner.id) ??
      tryVal(inner.personId) ??
      tryVal(inner.candidateId)
    );
  }
  return undefined;
}

export type ForwardJobApplicationResult =
  | { ok: true; skipped: true; backendPersonId?: undefined; screening?: undefined }
  | { ok: true; skipped?: false; backendPersonId?: string; screening?: CandidateScreeningResult }
  | { ok: false; status?: number; hint?: string };

export type { CandidateScreeningResult } from "@techrecruit/shared/lib/candidate-screening-result";

/**
 * Notifies your Java/backend when set (`BACKEND_JOB_APPLICATION_WEBHOOK_URL` or origin + path).
 * Sends **multipart/form-data**: CV as `file` (like portal job-document upload) plus text fields (applicationId, tenantId, job*, candidate*, cv*).
 * On 2xx with JSON body, reads `backendPersonId` / `id` (persisted applicant) and optional `screening`
 * (same shape as `data/candidate-screening-response.example.json`). If JSON has `"ok": false`, the forward is treated as failed.
 * Failures are logged only — the candidate still gets 200 if Firestore write succeeded.
 */
export async function forwardJobApplicationToBackend(
  payload: JobApplicationWebhookPayload,
  cvBuffer: Buffer,
): Promise<ForwardJobApplicationResult> {
  const url = getBackendJobApplicationWebhookUrl();
  if (!url) return { ok: true, skipped: true };

  try {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(cvBuffer)], { type: payload.cvContentType || "application/octet-stream" });
    form.append(JOB_APPLICATION_MULTIPART_FILE_FIELD, blob, payload.cvFileName || "cv.pdf");
    appendJobApplicationFormFields(form, payload);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        /** Which site / tenant instance sent this (duplicated on the form as `tenantId`). */
        "X-Tenant-Id": payload.tenantId,
      },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, status: res.status, hint: text.slice(0, 400) };
    }
    const ct = res.headers.get("content-type") ?? "";
    let backendPersonId: string | undefined;
    let screening: CandidateScreeningResult | undefined;
    if (ct.includes("json") && text.trim()) {
      try {
        const data = JSON.parse(text) as unknown;
        if (isRecord(data) && data.ok === false) {
          const hint =
            (typeof data.message === "string" && data.message.trim()) ||
            (typeof data.error === "string" && data.error.trim()) ||
            "backend returned ok: false";
          return { ok: false, hint };
        }
        backendPersonId = parseBackendPersonIdFromJson(data);
        screening = parseCandidateScreeningFromBackendPayload(data);
      } catch {
        /* ignore non-JSON body */
      }
    }
    return { ok: true, backendPersonId, screening };
  } catch (e) {
    return {
      ok: false,
      hint: e instanceof Error ? e.message : "network error",
    };
  }
}
