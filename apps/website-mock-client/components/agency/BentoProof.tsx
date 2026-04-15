import { Reveal } from "./Reveal";

export function BentoProof() {
  return (
    <section id="proof" className="relative z-10 border-b border-zinc-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
            What candidates see
          </p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
            Numbers we aim for when you&apos;re <span className="text-[#7107E7]">looking for work</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500">
            Targets we work towards for active candidates—timing and satisfaction vary by market and role.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          <Reveal className="md:col-span-7" delay={0.05}>
            <div className="h-full rounded-[2.5rem] border border-zinc-200/90 bg-white p-8 shadow-[0_24px_48px_-28px_rgba(24,24,27,0.12)] sm:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Demo · time to first intro
              </p>
              <p className="font-display mt-4 text-4xl font-semibold tracking-tighter text-[#7107E7] sm:text-5xl">
                9.6 days
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
                How quickly qualified candidates usually hear from us with a concrete introduction—not a
                generic &ldquo;we&apos;ll keep your CV on file.&rdquo;
              </p>
              <div className="mt-8 h-px w-full bg-gradient-to-r from-[#7107E7]/35 via-zinc-200 to-transparent" />
              <p className="mt-4 font-mono text-xs text-zinc-500">
                Rolling 12-month agency average
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:col-span-5 md:grid-rows-2 md:gap-5">
            <Reveal delay={0.08}>
              <div className="rounded-[2rem] border border-zinc-200/90 bg-zinc-100/60 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <p className="text-xs font-medium text-zinc-500">Live roles on the board</p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-zinc-950">
                  6
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  Matches the vacancies you can browse above—more come and go every week.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-[2rem] border border-[#7107E7]/25 bg-[#1a0529] p-7 text-white shadow-[0_20px_40px_-22px_rgba(113,7,231,0.35)]">
                <p className="text-xs font-medium text-[#C4A6FF]">Illustrative offer satisfaction</p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">88%</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Candidates who accepted an offer we supported through negotiation and said they would
                  recommend TechRecruit to a peer.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
