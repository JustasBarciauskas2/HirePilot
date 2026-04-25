"use client";

import { marketingSiteRootHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";

export function PortalChrome({
  children,
  tenantId,
}: {
  children: React.ReactNode;
  /** Drives the marketing “Back to site” link via `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS[tenantId]` and fallbacks. */
  tenantId: string;
}) {
  const marketing = marketingSiteRootHttpHrefForPortalTenant(tenantId);

  return (
    <>
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center px-4 pt-6">
        <div className="pointer-events-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-full border border-zinc-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display text-lg font-semibold tracking-tight text-zinc-950">
              Recruiter portal
            </span>
          </div>
          {marketing ? (
            <a
              href={marketing}
              className="text-sm font-medium text-zinc-600 transition hover:text-[#7107E7]"
            >
              Back to site
            </a>
          ) : null}
        </div>
      </header>
      {children}
      <footer className="relative z-10 mt-auto border-t border-zinc-200/80 bg-zinc-100/40 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Recruiter portal
      </footer>
    </>
  );
}
