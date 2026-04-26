"use client";

import Image from "next/image";
import { marketingSiteRootHttpHrefForPortalTenant } from "@techrecruit/shared/lib/portal-tenant";

export function PortalChrome({
  children,
  tenantId,
  layout = "default",
}: {
  children: React.ReactNode;
  /** Drives the marketing “Back to site” link via `NEXT_PUBLIC_PORTAL_TENANT_SITE_ORIGINS[tenantId]` and fallbacks. */
  tenantId: string;
  /** `app`: no floating top bar (dashboard provides its own sidebar + header). */
  layout?: "default" | "app";
}) {
  const marketing = marketingSiteRootHttpHrefForPortalTenant(tenantId);

  return (
    <div
      className={layout === "app" ? "flex min-h-screen flex-1 flex-col" : "flex min-h-screen flex-1 flex-col"}
    >
      {layout === "default" ? (
        <header className="pointer-events-none flex shrink-0 justify-center px-3 pt-4 sm:px-4 sm:pt-6">
          <div className="pointer-events-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12),inset_0_0_0_1px_rgba(37,99,235,0.05)] backdrop-blur-md sm:rounded-full sm:px-5 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 sm:h-10 sm:w-10">
                <Image
                  src="/brand-logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                  priority
                  unoptimized
                />
              </span>
              <div className="flex min-w-0 flex-col gap-0">
                <span className="font-display text-sm font-semibold leading-tight tracking-tight text-[#0B1F3A] sm:text-base">
                  Recruiter portal
                </span>
                <span className="hidden font-sans text-[10px] font-medium tracking-[0.18em] text-slate-400 sm:block">
                  HirePilot
                </span>
              </div>
            </div>
            {marketing ? (
              <a
                href={marketing}
                className="shrink-0 text-sm font-medium text-slate-600 transition hover:text-[#2563EB] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
              >
                Back to site
              </a>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

      {layout === "default" ? (
        <footer className="mt-auto shrink-0 border-t border-slate-200/60 py-6 text-center text-xs text-slate-500 sm:py-8 dark:border-slate-500/25 dark:text-slate-400">
          © {new Date().getFullYear()}{" "}
          <span className="font-sans">HirePilot</span>
        </footer>
      ) : null}
    </div>
  );
}
