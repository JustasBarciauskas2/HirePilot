import type { NextRequest } from "next/server";
import { getTenantInstancePayload } from "@techrecruit/shared/lib/tenant-instance";

/** Default tenant when no `?tenant=` / header (same as marketing `TENANT_ID`). */
export function getDefaultPortalTenantId(): string {
  return getTenantInstancePayload().id;
}

/**
 * Comma-separated tenant ids allowed for this portal deployment.
 * When set, `X-Tenant-Id` and `?tenant=` must be one of these (plus the default id).
 * When unset: default id, keys of `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS`, and in `NODE_ENV` development
 * any reasonable `?tenant=` id (for local multi-site); in production only the former two unless you set this.
 */
export function parsePortalAllowedTenantIds(): string[] | null {
  const raw = process.env.PORTAL_ALLOWED_TENANT_IDS?.trim();
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : null;
}

/** Tenant ids declared as keys of `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS` (implicit allowlist when explicit list is unset). */
function getPortalTenantIdsFromSiteOriginsMap(): string[] | null {
  const raw = process.env.NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS?.trim();
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as unknown;
    if (!map || typeof map !== "object" || Array.isArray(map)) return null;
    const keys = Object.keys(map as Record<string, unknown>).filter((k) => k.trim());
    return keys.length ? keys : null;
  } catch {
    return null;
  }
}

const DEV_TENANT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export function isPortalTenantIdAllowed(tenantId: string): boolean {
  const id = tenantId.trim();
  if (!id) return false;
  const allowed = parsePortalAllowedTenantIds();
  if (allowed) {
    return allowed.includes(id);
  }
  if (id === getDefaultPortalTenantId()) {
    return true;
  }
  const fromOrigins = getPortalTenantIdsFromSiteOriginsMap();
  if (fromOrigins?.includes(id)) {
    return true;
  }
  // Local Next dev: multiple marketing apps share one portal without PORTAL_ALLOWED_TENANT_IDS
  if (process.env.NODE_ENV === "development" && DEV_TENANT_ID_PATTERN.test(id)) {
    return true;
  }
  return false;
}

/**
 * Resolve tenant from portal URL search params (`tenant` or `tenantId`).
 */
export function resolvePortalTenantFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string | null {
  const raw = sp.tenant ?? sp.tenantId;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const tid = typeof v === "string" ? v.trim() : "";
  if (!tid) return null;
  return isPortalTenantIdAllowed(tid) ? tid : null;
}

/**
 * Tenant for the portal home page: `?tenant=` if valid, else default.
 */
export function resolvePortalTenantForPage(
  sp: Record<string, string | string[] | undefined>,
): string {
  const fromUrl = resolvePortalTenantFromSearchParams(sp);
  if (fromUrl) return fromUrl;
  return getDefaultPortalTenantId();
}

export type PortalTenantResult =
  | { ok: true; tenantId: string }
  | { ok: false; response: Response };

/**
 * Portal API routes: prefer `X-Tenant-Id`, validate against allowlist / default.
 */
export function getPortalTenantFromRequest(req: NextRequest): PortalTenantResult {
  const header = req.headers.get("x-tenant-id")?.trim();
  const allowed = parsePortalAllowedTenantIds();

  if (header) {
    if (!isPortalTenantIdAllowed(header)) {
      return {
        ok: false,
        response: Response.json(
          { error: "Tenant is not allowed for this portal deployment." },
          { status: 403 },
        ),
      };
    }
    return { ok: true, tenantId: header };
  }

  if (!allowed) {
    return { ok: true, tenantId: getDefaultPortalTenantId() };
  }

  return {
    ok: false,
    response: Response.json(
      {
        error:
          "Missing X-Tenant-Id. Open the portal from your marketing site (Recruiter portal link) or add ?tenant=… to the URL.",
      },
      { status: 400 },
    ),
  };
}

/**
 * Normalizes a marketing site origin from env (often missing `https://`, e.g. `localhost:3000` or `mysite.netlify.app`).
 * Without a scheme, `portalExternalMarketingHref` would reject the built URL and “View” links would not navigate.
 */
export function normalizeMarketingSiteOriginForPortalLinks(raw: string): string | null {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).origin;
    } catch {
      return null;
    }
  }
  const host = t.replace(/^\/+/, "");
  const looksLocal =
    /^localhost\b/i.test(host) ||
    /^127\.0\.0\.1\b/i.test(host) ||
    /^localhost:\d+/i.test(host) ||
    /^127\.0\.0\.1:\d+/i.test(host);
  const scheme = looksLocal ? "http" : "https";
  try {
    return new URL(`${scheme}://${host}`).origin;
  } catch {
    return null;
  }
}

/** Public job link base for “Copy link” in the portal (per tenant). */
export function getMarketingSiteOriginForTenant(tenantId: string): string | null {
  const raw = process.env.NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS?.trim();
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as unknown;
    if (!map || typeof map !== "object" || Array.isArray(map)) return null;
    const v = (map as Record<string, unknown>)[tenantId];
    if (typeof v !== "string" || !v.trim()) return null;
    return normalizeMarketingSiteOriginForPortalLinks(v.trim()) ?? null;
  } catch {
    return null;
  }
}

/**
 * In this monorepo, marketing runs on :3000, portal on :3001, mock site on :3002. If the portal’s public URL
 * is set but `NEXT_PUBLIC_MARKETING_SITE_URL` is not, infer the main marketing origin so you don’t need a second
 * copy-pasted local URL. Only applies to localhost (production should set `NEXT_PUBLIC_MARKETING_SITE_URL`).
 */
function inferMarketingOriginFromPublicPortalUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (!raw) return null;
  let base = raw.replace(/\/$/, "");
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }
  try {
    const u = new URL(base);
    const host = u.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return null;
    }
    /** This repo’s `apps/portal` dev server uses port 3001; main marketing is 3000 on the same host. */
    if (u.port === "3001") {
      u.port = "3000";
      u.pathname = "";
      u.search = "";
      u.hash = "";
      return u.origin;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * `apps/website-mock-client` in this monorepo (port 3002) is paired with this tenant id in `NEXT_PUBLIC_TENANT_ID`. */
export const MOCK_CLIENT_ACME_TENANT_ID = "mock-client-acme";

/**
 * In development, the mock marketing site is always on :3002 for this tenant — even when the portal also sets
 * `NEXT_PUBLIC_MARKETING_SITE_URL` to the main :3000 app (otherwise `?tenant=mock-client-acme` would open the wrong site).
 * Override in production with `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS` if needed.
 */
function devMonorepoMockClientMarketingOrigin(tenantId: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (tenantId.trim() !== MOCK_CLIENT_ACME_TENANT_ID) return null;
  return "http://localhost:3002";
}

/** Local dev default when no other source applies. */
function devMonorepoMarketingOriginFallback(_tenantId: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  return "http://localhost:3000";
}

/**
 * Where “View on site” / “Back to site” should go.
 *
 * Resolution (first hit wins):
 * 1. `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS` JSON entry for this `tenantId` (optional).
 * 2. **Development only:** `tenantId ===` {@link MOCK_CLIENT_ACME_TENANT_ID} → `http://localhost:3002` (mock second marketing app).
 * 3. `NEXT_PUBLIC_MARKETING_SITE_URL` (usual single production / default local :3000).
 * 4. Local dev: infer from `NEXT_PUBLIC_PORTAL_URL` (localhost:3001 → `http://localhost:3000`).
 * 5. Local dev: `http://localhost:3000`.
 */
export function resolveMarketingSiteOriginForPortalLinks(tenantId: string): string | null {
  const fromMap = getMarketingSiteOriginForTenant(tenantId);
  if (fromMap) return fromMap;
  const mockDev = devMonorepoMockClientMarketingOrigin(tenantId);
  if (mockDev) return mockDev;
  const fromMarketingEnv = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  if (fromMarketingEnv) {
    return normalizeMarketingSiteOriginForPortalLinks(fromMarketingEnv);
  }
  return inferMarketingOriginFromPublicPortalUrl() ?? devMonorepoMarketingOriginFallback(tenantId);
}

/**
 * Build “roles” / homepage anchor URLs from an origin resolved on the **server** (see `app/page.tsx`).
 * Prefer this in client components so links work after `next build && next start` even when `NEXT_PUBLIC_*`
 * was missing at build time (client bundle would otherwise have a stale/empty value).
 */
export function buildMarketingRolesUrlFromOrigin(origin: string | null): string {
  if (!origin) return "#";
  return `${origin.replace(/\/$/, "")}/#roles`;
}

/** Build `/jobs/[slug]` URLs from a server-resolved origin (same rationale as {@link buildMarketingRolesUrlFromOrigin}). */
export function buildPublicJobPageUrlFromOrigin(origin: string | null, slug: string): string {
  const o = origin?.replace(/\/$/, "") ?? "";
  const s = slug.trim();
  if (!s || !o) return "#";
  return `${o}/jobs/${encodeURIComponent(s)}`;
}

/** Homepage roles anchor on the marketing site for this tenant. */
export function getMarketingSiteRolesUrlForTenant(tenantId: string): string {
  const origin = resolveMarketingSiteOriginForPortalLinks(tenantId);
  if (!origin) return "#";
  return `${origin}/#roles`;
}

/**
 * Absolute public job URL on the marketing site — never portal-relative (the portal has no `/jobs/[slug]` page).
 * See {@link resolveMarketingSiteOriginForPortalLinks} for which env vars set the base URL.
 */
export function getPublicJobPageUrlForTenant(tenantId: string, slug: string): string {
  const origin = resolveMarketingSiteOriginForPortalLinks(tenantId);
  const s = slug.trim();
  if (!s || !origin) return "#";
  return `${origin}/jobs/${encodeURIComponent(s)}`;
}

/**
 * Resolves portal-built marketing URLs (`getPublicJobPageUrlForTenant`, `getMarketingSiteRolesUrlForTenant`)
 * to a real absolute URL, or `null` when env is missing (placeholder `#`).
 * Use `<a href={…}>` for non-null — Next.js `<Link href="#">` is treated as in-app navigation and will not open the marketing site.
 */
export function portalExternalMarketingHref(href: string): string | null {
  const h = href.trim();
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  const slash = h.indexOf("/");
  const originPart = slash === -1 ? h : h.slice(0, slash);
  const pathPart = slash === -1 ? "" : h.slice(slash);
  const origin = normalizeMarketingSiteOriginForPortalLinks(originPart);
  if (!origin) return null;
  if (!pathPart) return origin;
  return `${origin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`;
}

/**
 * Absolute public job URL for use in `href` — resolves from {@link getPublicJobPageUrlForTenant} so the link matches
 * the origin from {@link resolveMarketingSiteOriginForPortalLinks} for `tenantId`, not a separately passed origin.
 * Returns `null` when no marketing origin is configured.
 */
export function publicJobPageHttpHrefForPortalTenant(tenantId: string, slug: string): string | null {
  const s = slug.trim();
  if (!s) return null;
  const raw = getPublicJobPageUrlForTenant(tenantId, s);
  if (!raw || raw === "#") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return portalExternalMarketingHref(raw) ?? raw;
  }
  return null;
}

/** Marketing site root (origin only) for “Back to site” and similar — from {@link resolveMarketingSiteOriginForPortalLinks}. */
export function marketingSiteRootHttpHrefForPortalTenant(tenantId: string): string | null {
  const o = resolveMarketingSiteOriginForPortalLinks(tenantId);
  if (!o) return null;
  return portalExternalMarketingHref(o) ?? o;
}

/** `/#roles` on the marketing site for the tenant (open listings on site). */
export function marketingSiteRolesHttpHrefForPortalTenant(tenantId: string): string | null {
  const raw = getMarketingSiteRolesUrlForTenant(tenantId);
  if (!raw || raw === "#") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return portalExternalMarketingHref(raw) ?? raw;
  }
  return null;
}
