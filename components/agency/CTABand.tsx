import Link from "next/link";
import { Reveal } from "./Reveal";

export function CTABand() {
  return (
    <section className="relative z-10 overflow-hidden border-b border-zinc-200/80 bg-zinc-950 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#7107E7]/30 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tighter text-white sm:text-4xl">
              Ready for a role that fits <span className="text-[#C4A6FF]">you</span>?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              Tell us what you&apos;re looking for—stack, level, location—and we&apos;ll see which open
              searches you match. This demo form doesn&apos;t send email; it shows how candidates would
              get in touch on a live site.
            </p>
            <Link
              href="/#contact"
              className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(113,7,231,0.45)] transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5b06c2] active:scale-[0.98]"
            >
              Get matched to roles
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <span className="text-xs" aria-hidden>
                  ↗
                </span>
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
