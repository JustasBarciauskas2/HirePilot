import { getBackendJobApplicationWebhookUrl } from "@/lib/backend-url";

export type JobApplicationWebhookPayload = {
  /** Firestore document id — use this as the canonical application id */
  applicationId: string;
  tenantId: string;
  jobRef: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  /** Vacancy UUID from your API when present on the job */
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

/** Parse your API response — supports `{ "id": "..." }`, `{ "personId": "..." }`, or nested `{ "data": { "id": "..." } }`. */
export function parseBackendPersonIdFromJson(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const tryVal = (v: unknown): string | undefined => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return undefined;
  };
  const o = data as Record<string, unknown>;
  const direct =
    tryVal(o.id) ?? tryVal(o.personId) ?? tryVal(o.candidateId) ?? tryVal(o.backendPersonId);
  if (direct) return direct;
  if (o.data && typeof o.data === "object") {
    const inner = o.data as Record<string, unknown>;
    return tryVal(inner.id) ?? tryVal(inner.personId);
  }
  return undefined;
}

export type ForwardJobApplicationResult =
  | { ok: true; skipped: true; backendPersonId?: undefined }
  | { ok: true; skipped?: false; backendPersonId?: string }
  | { ok: false; status?: number; hint?: string };

/**
 * Notifies your Java/backend when set (`BACKEND_JOB_APPLICATION_WEBHOOK_URL` or origin + path).
 * On 2xx with JSON body, reads `id` (or aliases above) and returns it as `backendPersonId`.
 * Failures are logged only — the candidate still gets 200 if Firestore write succeeded.
 */
export async function forwardJobApplicationToBackend(
  payload: JobApplicationWebhookPayload,
): Promise<ForwardJobApplicationResult> {
  const url = getBackendJobApplicationWebhookUrl();
  if (!url) return { ok: true, skipped: true };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        /** Which site / tenant instance sent this (same as `tenantId` in the JSON body). */
        "X-Tenant-Id": payload.tenantId,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, status: res.status, hint: text.slice(0, 400) };
    }
    const ct = res.headers.get("content-type") ?? "";
    let backendPersonId: string | undefined;
    if (ct.includes("json") && text.trim()) {
      try {
        const data = JSON.parse(text) as unknown;
        backendPersonId = parseBackendPersonIdFromJson(data);
      } catch {
        /* ignore non-JSON body */
      }
    }
    return { ok: true, backendPersonId };
  } catch (e) {
    return {
      ok: false,
      hint: e instanceof Error ? e.message : "network error",
    };
  }
}
