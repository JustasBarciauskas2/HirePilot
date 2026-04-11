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

  const base = origin.replace(/\/$/, "");
  const rawPath = process.env.BACKEND_VACANCY_PATH?.trim() || "/api/vacancy";
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  try {
    return new URL(path, `${base}/`).href;
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
