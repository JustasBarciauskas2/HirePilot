import type { JobDetail } from "@/data/job-types";
import { backendEnvLooksInvalid, getBackendVacancyUrl } from "@/lib/backend-url";

export type VacancyUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type VacancyBackendPayload = {
  user: VacancyUser;
  vacancy: JobDetail;
};

export type ForwardResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped?: false }
  | { ok: false; status?: number; error?: string; hint?: string };

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
): Promise<ForwardResult> {
  const url = getBackendVacancyUrl();
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

  const body: VacancyBackendPayload = {
    user: {
      sub: String(user.sub ?? ""),
      email: typeof user.email === "string" ? user.email : undefined,
      name: typeof user.name === "string" ? user.name : undefined,
      picture: typeof user.picture === "string" ? user.picture : undefined,
    },
    vacancy: job,
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
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeFetchError(e, url) };
  }
}
