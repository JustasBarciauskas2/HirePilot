import { getTenantInstancePayload } from "@/lib/tenant-instance";

function resolveBackendOriginBase(): string | null {
  const legacy = process.env.BACKEND_URL?.trim();
  if (legacy) {
    try {
      return new URL(legacy).origin;
    } catch {
      return null;
    }
  }

  let origin = process.env.BACKEND_ORIGIN?.trim();
  if (!origin) {
    const host = process.env.BACKEND_HOST?.trim();
    if (host) {
      const port = process.env.BACKEND_PORT?.trim();
      const protocol = (process.env.BACKEND_PROTOCOL?.trim() || "http").replace(/\/$/, "");
      origin = port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
    }
  }
  if (!origin) return null;
  return origin.replace(/\/$/, "");
}

/**
 * Where the Next.js server POSTs vacancy JSON (not the browser — the browser only calls /api/portal/jobs).
 *
 * Priority:
 * 1. BACKEND_URL — full URL (overrides everything), e.g. https://api.example.com/custom/path
 * 2. BACKEND_ORIGIN + BACKEND_VACANCY_PATH — e.g. http://localhost:8080 + /api/vacancy
 * 3. BACKEND_PROTOCOL + BACKEND_HOST + BACKEND_PORT + BACKEND_VACANCY_PATH
 */
export function getBackendVacancyUrl(): string | null {
  const legacy = process.env.BACKEND_URL?.trim();
  if (legacy) {
    try {
      new URL(legacy);
      return legacy;
    } catch {
      return null;
    }
  }

  const base = resolveBackendOriginBase();
  if (!base) return null;

  const rawPath = process.env.BACKEND_VACANCY_PATH?.trim() || "/api/vacancy";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  try {
    return new URL(path, `${base}/`).href;
  } catch {
    return null;
  }
}

/**
 * Where the Next.js server POSTs a job-description file for your API to parse (portal → /api/portal/job-document → backend).
 *
 * Priority:
 * 1. BACKEND_DOCUMENT_URL — full URL, e.g. http://localhost:8080/api/vacancy/document
 * 2. resolveBackendOriginBase() + BACKEND_DOCUMENT_PATH (default /api/vacancy/document)
 */
export function getBackendDocumentUrl(): string | null {
  const full = process.env.BACKEND_DOCUMENT_URL?.trim();
  if (full) {
    try {
      new URL(full);
      return full;
    } catch {
      return null;
    }
  }

  const base = resolveBackendOriginBase();
  if (!base) return null;

  const rawPath = process.env.BACKEND_DOCUMENT_PATH?.trim() || "/api/vacancy/document";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  try {
    return new URL(path, `${base}/`).href;
  } catch {
    return null;
  }
}

/**
 * Public site: GET list of vacancies for a tenant (home page + job routes).
 *
 * 1. `BACKEND_VACANCIES_LIST_URL` — full URL (query `tenantId` is appended unless already present)
 * 2. `resolveBackendOriginBase()` + `BACKEND_VACANCIES_LIST_PATH` (default `/api/vacancies`)
 */
export function getBackendVacanciesListUrl(): string | null {
  const full = process.env.BACKEND_VACANCIES_LIST_URL?.trim();
  if (full) {
    try {
      new URL(full);
      return full;
    } catch {
      return null;
    }
  }

  const base = resolveBackendOriginBase();
  if (!base) return null;

  const rawPath = process.env.BACKEND_VACANCIES_LIST_PATH?.trim() || "/api/vacancies";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  try {
    return new URL(path, `${base}/`).href;
  } catch {
    return null;
  }
}

/** Path segment appended to the vacancy base path for publish (e.g. `/api/vacancy` → `/api/vacancy/publish`). */
function vacancyBasePath(): string {
  const raw = process.env.BACKEND_VACANCY_PATH?.trim() || "/api/vacancy";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function publishPathFromVacancyBase(): string {
  const base = vacancyBasePath().replace(/\/$/, "");
  if (base.endsWith("/publish")) return base;
  return `${base}/publish`;
}

/**
 * Final vacancy publish (after document parse + review).
 *
 * Priority:
 * 1. `BACKEND_VACANCY_PUBLISH_URL` — full URL if set
 * 2. `BACKEND_URL` — same URL with `/publish` appended to the path (…/vacancy → …/vacancy/publish)
 * 3. `BACKEND_ORIGIN` (or host/port) + `BACKEND_VACANCY_PUBLISH_PATH` or derived `{BACKEND_VACANCY_PATH}/publish` (default `/api/vacancy/publish`)
 */
export function getBackendVacancyPublishUrl(): string | null {
  const full = process.env.BACKEND_VACANCY_PUBLISH_URL?.trim();
  if (full) {
    try {
      new URL(full);
      return full;
    } catch {
      return null;
    }
  }

  const legacy = process.env.BACKEND_URL?.trim();
  if (legacy) {
    try {
      const u = new URL(legacy);
      let p = u.pathname.replace(/\/$/, "");
      if (!p) p = "/";
      if (p.endsWith("/publish")) {
        return u.href;
      }
      u.pathname = `${p}/publish`;
      return u.href;
    } catch {
      return null;
    }
  }

  const originBase = resolveBackendOriginBase();
  if (!originBase) return null;

  const explicitPublish = process.env.BACKEND_VACANCY_PUBLISH_PATH?.trim();
  const path = explicitPublish
    ? explicitPublish.startsWith("/")
      ? explicitPublish
      : `/${explicitPublish}`
    : publishPathFromVacancyBase();

  try {
    return new URL(path, `${originBase}/`).href;
  } catch {
    return null;
  }
}

/** True when a backend DELETE can be built (POST base and/or `BACKEND_VACANCY_DELETE_URL`). */
export function isBackendVacancyDeleteConfigured(): boolean {
  if (process.env.BACKEND_VACANCY_DELETE_URL?.trim()) return true;
  return getBackendVacancyUrl() !== null;
}

/**
 * DELETE vacancy on your API (portal → Next server → backend).
 *
 * Matches Spring-style `DELETE /api/vacancy/{id}?tenantId=…` — same base as POST (`getBackendVacancyUrl()`), UUID in the path, tenant only as query.
 *
 * Optional `BACKEND_VACANCY_DELETE_URL` — full template, e.g. `http://localhost:8080/api/vacancy/{id}` (or base URL without `{id}`; the UUID is appended).
 *
 * @param _ref — unused; kept for call-site compatibility.
 * @returns `null` if vacancy UUID is missing or base URL cannot be resolved.
 */
export function getBackendVacancyDeleteUrl(_ref: string, vacancyId?: string | null): string | null {
  const vid = vacancyId?.trim();
  if (!vid) return null;

  const explicit = process.env.BACKEND_VACANCY_DELETE_URL?.trim();
  const tenantId = getTenantInstancePayload().id;
  const baseHref = explicit || getBackendVacancyUrl();
  if (!baseHref) return null;
  try {
    let url: URL;
    if (explicit && explicit.includes("{id}")) {
      url = new URL(explicit.replace(/\{id\}/g, encodeURIComponent(vid)));
    } else {
      const base = baseHref.replace(/\/$/, "");
      url = new URL(`${base}/${encodeURIComponent(vid)}`);
    }
    if (!url.searchParams.has("tenantId")) {
      url.searchParams.set("tenantId", tenantId);
    }
    return url.href;
  } catch {
    return null;
  }
}

/** True if any backend env is set but URL could not be built (misconfiguration). */
export function backendEnvLooksInvalid(): boolean {
  const hasAny =
    Boolean(process.env.BACKEND_URL?.trim()) ||
    Boolean(process.env.BACKEND_ORIGIN?.trim()) ||
    Boolean(process.env.BACKEND_HOST?.trim());
  return hasAny && getBackendVacancyUrl() === null;
}
