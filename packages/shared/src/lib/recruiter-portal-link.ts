/**
 * Marketing-site footer “Recruiter portal” link — use {@link buildRecruiterPortalFooterHref} and
 * {@link recruiterPortalLinkOpenProps} so href is always a valid absolute URL and external portals
 * open in a new tab (embedded / in-app browsers often no-op on same-tab cross-origin navigation).
 */

export function buildRecruiterPortalFooterHref(): string | null {
  const tenant = process.env.NEXT_PUBLIC_TENANT_ID?.trim();
  const rawBase = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();

  if (rawBase) {
    const base = rawBase.replace(/\/$/, "");
    const withProtocol =
      base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base}`;
    try {
      const u = new URL(withProtocol);
      if (tenant) u.searchParams.set("tenant", tenant);
      return u.href;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const u = new URL("http://localhost:3001");
      if (tenant) u.searchParams.set("tenant", tenant);
      return u.href;
    } catch {
      return null;
    }
  }
  return null;
}

/** Prefer new tab for remote portals; keep same tab for local dev portal. */
export function recruiterPortalLinkOpenProps(href: string): { target?: string; rel?: string } {
  try {
    const { hostname } = new URL(href);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return {};
    }
    return { target: "_blank", rel: "noopener noreferrer" };
  } catch {
    return { target: "_blank", rel: "noopener noreferrer" };
  }
}
