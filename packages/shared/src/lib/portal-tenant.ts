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

/** Public job link base for “Copy link” in the portal (per tenant). */
export function getMarketingSiteOriginForTenant(tenantId: string): string | null {
  const raw = process.env.NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS?.trim();
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as unknown;
    if (!map || typeof map !== "object" || Array.isArray(map)) return null;
    const v = (map as Record<string, unknown>)[tenantId];
    return typeof v === "string" && v.trim() ? v.trim().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

/**
 * When env is unset, local monorepo defaults so portal “View” / “Back to site” are not `href="#"`.
 * Override with `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS` or `NEXT_PUBLIC_MARKETING_SITE_URL` on the portal.
 */
function devMonorepoMarketingOriginFallback(tenantId: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  const id = tenantId.trim();
  if (id === "mock-client-acme") return "http://localhost:3002";
  if (id === "testing") return "http://localhost:3000";
  return null;
}

/** Marketing site origin for links from the portal: tenant map, then `NEXT_PUBLIC_MARKETING_SITE_URL`. */
export function resolveMarketingSiteOriginForPortalLinks(tenantId: string): string | null {
  const fromMap = getMarketingSiteOriginForTenant(tenantId);
  if (fromMap) return fromMap;
  const raw = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return devMonorepoMarketingOriginFallback(tenantId);
}

/** Homepage roles anchor on the marketing site for this tenant. */
export function getMarketingSiteRolesUrlForTenant(tenantId: string): string {
  const origin = resolveMarketingSiteOriginForPortalLinks(tenantId);
  if (!origin) return "#";
  return `${origin}/#roles`;
}

/**
 * Absolute public job URL on the marketing site — never portal-relative (the portal has no `/jobs/[slug]` page).
 * Configure `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS` and/or `NEXT_PUBLIC_MARKETING_SITE_URL` on the portal app.
 */
export function getPublicJobPageUrlForTenant(tenantId: string, slug: string): string {
  const origin = resolveMarketingSiteOriginForPortalLinks(tenantId);
  const s = slug.trim();
  if (!s || !origin) return "#";
  return `${origin}/jobs/${encodeURIComponent(s)}`;
}
