import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-zinc-200/80 bg-zinc-100/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-b border-zinc-200/80 pb-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="font-display text-lg font-semibold tracking-tight text-zinc-950">
              Meridi<span className="text-[#7107E7]">an</span>
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
              A recruitment agency for people looking for their next tech role—we connect job seekers
              with teams that need their skills. This site is a mock: listings and stories are fictional.
            </p>
            <p className="mt-6 font-mono text-xs text-zinc-500">
              Meridian Talent (demo) · Not a registered employer
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 md:col-span-7 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">People</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <span className="font-medium text-zinc-900">Nina Kovac</span>
                  <span className="block text-xs text-zinc-500">Lead recruiter (fictional)</span>
                </li>
                <li>
                  <span className="font-medium text-zinc-900">Rohan Patel</span>
                  <span className="block text-xs text-zinc-500">Candidate experience (fictional)</span>
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
                    href="mailto:hello@meridian-talent.demo"
                    className="transition hover:text-[#7107E7]"
                  >
                    hello@meridian-talent.demo
                  </a>
                </li>
                <li>
                  <a href="mailto:careers@meridian-talent.demo" className="transition hover:text-[#7107E7]">
                    careers@meridian-talent.demo
                  </a>
                </li>
                <li className="font-mono text-xs text-zinc-500">+1 (415) 555-0192</li>
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
                  <Link href="/portal" className="transition hover:text-[#7107E7]">
                    Recruiter portal
                  </Link>
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
            © {new Date().getFullYear()} Meridian Talent mockup. All rights reserved for demo use.
          </p>
        </div>
      </div>
    </footer>
  );
}
