import {
  buildRecruiterPortalFooterHref,
  recruiterPortalLinkOpenProps,
} from "@techrecruit/shared/lib/recruiter-portal-link";
import Link from "next/link";

export function Footer() {
  const portalHref = buildRecruiterPortalFooterHref();
  const portalOpen = portalHref ? recruiterPortalLinkOpenProps(portalHref) : {};
  return (
    <footer className="relative z-10 border-t border-zinc-200/80 bg-zinc-100/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-b border-zinc-200/80 pb-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="font-display text-lg font-semibold tracking-tight text-zinc-950">
              Tech<span className="text-[#7107E7]">Recruit</span>
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
              A technology recruitment agency based in London—we connect engineers, product, and data
              professionals with teams that need their skills across the UK and Europe.
            </p>
            <p className="mt-6 font-mono text-xs text-zinc-500">
              TechRecruit Ltd · Recruitment agency · UK
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 md:col-span-7 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">People</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <span className="font-medium text-zinc-900">Nina Kovac</span>
                  <span className="block text-xs text-zinc-500">Lead recruiter</span>
                </li>
                <li>
                  <span className="font-medium text-zinc-900">Rohan Patel</span>
                  <span className="block text-xs text-zinc-500">Candidate experience</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Direct
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                <li>
                  <a
                    href="mailto:hello@techrecruit.co.uk"
                    className="transition hover:text-[#7107E7]"
                  >
                    hello@techrecruit.co.uk
                  </a>
                </li>
                <li>
                  <a href="mailto:careers@techrecruit.co.uk" className="transition hover:text-[#7107E7]">
                    careers@techrecruit.co.uk
                  </a>
                </li>
                <li className="font-mono text-xs text-zinc-500">+44 20 4587 3200</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Navigate
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                <li>
                  <Link href="/#roles" className="transition hover:text-[#7107E7]">
                    View roles
                  </Link>
                </li>
                <li>
                  <Link href="/#about" className="transition hover:text-[#7107E7]">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" className="transition hover:text-[#7107E7]">
                    Contact
                  </Link>
                </li>
                <li>
                  {portalHref ? (
                    <a
                      href={portalHref}
                      className="transition hover:text-[#7107E7]"
                      {...portalOpen}
                    >
                      Recruiter portal
                    </a>
                  ) : (
                    <span
                      className="text-zinc-400"
                      title="Set NEXT_PUBLIC_PORTAL_URL on this marketing site’s build (your deployed portal origin)."
                    >
                      Recruiter portal
                    </span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-6 text-xs font-medium text-zinc-500">
            <Link href="/privacy" className="transition hover:text-[#7107E7]">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-[#7107E7]">
              Terms
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} TechRecruit Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
