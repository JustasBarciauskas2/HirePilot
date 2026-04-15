import type { JobDetail } from "@techrecruit/shared/data/job-types";
import {
  backendEnvLooksInvalid,
  getBackendVacancyDeleteUrl,
  getBackendVacancyPutUrl,
  getBackendVacancyUrl,
  isBackendVacancyDeleteConfigured,
} from "@techrecruit/shared/lib/backend-url";
import { getTenantInstancePayload, type TenantInstancePayload } from "@techrecruit/shared/lib/tenant-instance";

type ForwardOpts = {
  /** If set, POST to this URL instead of {@link getBackendVacancyUrl}. */
  url?: string | null;
  /** Portal multi-tenant: override tenant in JSON body and DELETE/PUT query. */
  tenant?: TenantInstancePayload;
};

export type VacancyUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type VacancyBackendPayload = {
  user: VacancyUser;
  vacancy: JobDetail;
  /** Always set — use `tenant.id` as partition key in a shared DB (see `getTenantInstancePayload`). */
  tenant: TenantInstancePayload;
};

export type ForwardResult =
  | { ok: true; skipped: true; vacancyId?: undefined }
  | { ok: true; skipped?: false; vacancyId?: string }
  | { ok: false; status?: number; error?: string; hint?: string };

/** Parse your API JSON after a successful POST — we persist this on `JobDetail.id` for DELETE. */
function pickBackendVacancyIdFromJson(obj: Record<string, unknown>): string | undefined {
  if (typeof obj.id === "string" && obj.id.trim()) return obj.id.trim();
  if (typeof obj.vacancyId === "string" && obj.vacancyId.trim()) return obj.vacancyId.trim();
  const job = obj.job;
  if (job && typeof job === "object" && job !== null) {
    const j = job as Record<string, unknown>;
    if (typeof j.id === "string" && j.id.trim()) return j.id.trim();
  }
  const vacancy = obj.vacancy;
  if (vacancy && typeof vacancy === "object" && vacancy !== null) {
    const v = vacancy as Record<string, unknown>;
    if (typeof v.id === "string" && v.id.trim()) return v.id.trim();
  }
  return undefined;
}

async function readVacancyIdFromOkResponse(res: Response): Promise<string | undefined> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return undefined;
  const text = await res.text();
  if (!text.trim()) return undefined;
  try {
    const obj = JSON.parse(text) as unknown;
    if (obj && typeof obj === "object" && obj !== null) {
      return pickBackendVacancyIdFromJson(obj as Record<string, unknown>);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Unwrap Node/undici fetch error chains (often only "fetch failed" at top). */
function describeFetchError(err: unknown, backendUrl: string): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur != null && depth < 6) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else if (typeof cur === "object" && cur !== null && "message" in cur) {
      parts.push(String((cur as { message: unknown }).message));
      break;
    } else {
      parts.push(String(cur));
      break;
    }
    depth++;
  }
  const joined = parts.filter(Boolean).join(" → ");
  const lower = joined.toLowerCase();
  const onCloud = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const targetsLoopback = /localhost|127\.0\.0\.1/i.test(backendUrl);

  if (onCloud && targetsLoopback) {
    return `${joined} — Deployed sites cannot reach localhost on your machine. Set BACKEND_ORIGIN (or BACKEND_URL) to your deployed API HTTPS URL.`;
  }
  if (lower.includes("econnrefused")) {
    return `${joined} — Connection refused: is the API running? Check BACKEND_ORIGIN / port and BACKEND_VACANCY_PATH.`;
  }
  if (lower.includes("enotfound") || lower.includes("getaddrinfo")) {
    return `${joined} — Hostname not found: check BACKEND_HOST / BACKEND_ORIGIN.`;
  }
  if (lower.includes("cert") || lower.includes("ssl") || lower.includes("tls")) {
    return `${joined} — TLS problem: use a valid HTTPS URL for production.`;
  }
  return joined || "fetch failed";
}

/**
 * POST vacancy JSON to the resolved backend URL (see lib/backend-url.ts) with optional Bearer token (Firebase ID token).
 */
export async function forwardVacancyToBackend(
  user: VacancyUser,
  job: JobDetail,
  idToken: string | null,
  opts?: ForwardOpts,
): Promise<ForwardResult> {
  const url = opts?.url !== undefined ? opts.url : getBackendVacancyUrl();
  if (!url) {
    if (backendEnvLooksInvalid()) {
      return {
        ok: false,
        error:
          "Invalid backend URL in environment. Check BACKEND_URL, or BACKEND_ORIGIN + BACKEND_VACANCY_PATH, or BACKEND_HOST + BACKEND_PORT.",
      };
    }
    return { ok: true, skipped: true };
  }

  const tenant = opts?.tenant ?? getTenantInstancePayload();
  const body: VacancyBackendPayload = {
    user: {
      sub: String(user.sub ?? ""),
      email: typeof user.email === "string" ? user.email : undefined,
      name: typeof user.name === "string" ? user.name : undefined,
      picture: typeof user.picture === "string" ? user.picture : undefined,
    },
    vacancy: job,
    tenant,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let hint: string | undefined;
      if (res.status === 401) {
        hint = idToken
          ? "Bearer token was rejected. On your API, validate Firebase ID tokens (issuer, project ID, and JWKS from Google)."
          : "No Firebase ID token was sent. Sign in on the portal; the client sends Authorization: Bearer <idToken>.";
      }
      return { ok: false, status: res.status, error: text.slice(0, 500), hint };
    }
    const vacancyId = await readVacancyIdFromOkResponse(res);
    return vacancyId ? { ok: true, vacancyId } : { ok: true };
  } catch (e) {
    return { ok: false, error: describeFetchError(e, url) };
  }
}

/**
 * PUT vacancy update: URL is `…/vacancy/{vacancyId}?tenantId=…` (see {@link getBackendVacancyPutUrl}).
 * **Body is the vacancy alone** (same shape as `JobDetail` / your `vacancy` DTO), not the POST envelope `{ user, vacancy, tenant }`.
 */
export async function forwardVacancyUpdateToBackend(
  _user: VacancyUser,
  job: JobDetail,
  idToken: string | null,
  opts?: ForwardOpts,
): Promise<ForwardResult> {
  const tenantIdForUrl = opts?.tenant?.id;
  const url =
    opts?.url !== undefined ? opts.url : getBackendVacancyPutUrl(job.id, tenantIdForUrl);
  if (!url) {
    if (backendEnvLooksInvalid()) {
      return {
        ok: false,
        error:
          "Invalid backend URL in environment. Check BACKEND_URL, or BACKEND_ORIGIN + BACKEND_VACANCY_PATH, or BACKEND_HOST + BACKEND_PORT.",
      };
    }
    return { ok: true, skipped: true };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let hint: string | undefined;
      if (res.status === 401) {
        hint = idToken
          ? "Bearer token was rejected. On your API, validate Firebase ID tokens (issuer, project ID, and JWKS from Google)."
          : "No Firebase ID token was sent. Sign in on the portal; the client sends Authorization: Bearer <idToken>.";
      }
      return { ok: false, status: res.status, error: text.slice(0, 500), hint };
    }
    const vacancyId = await readVacancyIdFromOkResponse(res);
    return vacancyId ? { ok: true, vacancyId } : { ok: true };
  } catch (e) {
    return { ok: false, error: describeFetchError(e, url) };
  }
}

export type DeleteVacancyOnBackendOpts = {
  /** Stored `JobDetail.id` (vacancy UUID) — sent as path segment `/api/vacancy/{id}` with `tenantId` query. */
  vacancyId?: string | null;
  /** Portal multi-tenant: `tenantId` query on DELETE. */
  tenantId?: string | null;
};

/**
 * DELETE vacancy on the backend (see `getBackendVacancyDeleteUrl` in lib/backend-url.ts) with optional Bearer token.
 */
export async function deleteVacancyOnBackend(
  ref: string,
  idToken: string | null,
  opts?: DeleteVacancyOnBackendOpts,
): Promise<ForwardResult> {
  const url = getBackendVacancyDeleteUrl(ref, opts?.vacancyId, opts?.tenantId ?? undefined);
  if (!url) {
    if (backendEnvLooksInvalid()) {
      return {
        ok: false,
        error:
          "Invalid backend URL in environment. Check BACKEND_URL, or BACKEND_ORIGIN + BACKEND_VACANCY_PATH, or BACKEND_HOST + BACKEND_PORT.",
      };
    }
    if (isBackendVacancyDeleteConfigured() && !opts?.vacancyId?.trim()) {
      return {
        ok: false,
        status: 400,
        error:
          "Missing vacancy id (UUID). The backend expects DELETE /api/vacancy/{id}?tenantId=… — ensure the listing includes `id` from your API.",
      };
    }
    return { ok: true, skipped: true };
  }

  const headers: Record<string, string> = {};
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let hint: string | undefined;
      if (res.status === 401) {
        hint = idToken
          ? "Bearer token was rejected. On your API, validate Firebase ID tokens (issuer, project ID, and JWKS from Google)."
          : "No Firebase ID token was sent. Sign in on the portal; the client sends Authorization: Bearer <idToken>.";
      }
      return { ok: false, status: res.status, error: text.slice(0, 500), hint };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeFetchError(e, url) };
  }
}
