import { ArrowBendUpRight, MagnifyingGlass, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./Reveal";

const blocks = [
  {
    eyebrow: "01 — You reach out",
    title: "Tell us what you want next.",
    body: "Share your stack, level, location, and what would make a move worth it. We use that to line you up with open roles—or keep you in mind when the right mandate opens.",
    icon: MagnifyingGlass,
    align: "left" as const,
  },
  {
    eyebrow: "02 — We connect you",
    title: "Introductions to teams that fit.",
    body: "No spam: we only put you forward where there's a real match. You get context on the company, the hiring manager, and how the process will run before you commit time.",
    icon: UsersThree,
    align: "right" as const,
  },
  {
    eyebrow: "03 — Through the offer",
    title: "Support when it counts.",
    body: "Interview prep, feedback loops, and help thinking through comp and start date—so when you get an offer, you can say yes (or no) with confidence.",
    icon: ArrowBendUpRight,
    align: "left" as const,
  },
];

export function ServicesZigZag() {
  return (
    <section id="process" className="relative z-10 border-b border-zinc-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
            Your journey
          </p>
          <h2 className="font-display mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
            How we help you land a <span className="text-[#7107E7]">new role</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-zinc-600">
            A simple path from “I’m looking” to signed offer—whether you found us through a listing or
            cold outreach.
          </p>
        </Reveal>

        <div className="mt-20 flex flex-col gap-20 md:gap-28">
          {blocks.map((b, i) => {
            const Icon = b.icon;
            const isRight = b.align === "right";
            const visual = (
              <div className="rounded-[2rem] bg-zinc-200/50 p-2 ring-1 ring-zinc-950/5">
                <div className="flex min-h-[220px] items-center justify-center rounded-[calc(2rem-0.5rem)] border border-white/80 bg-gradient-to-br from-zinc-100 to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Icon className="h-16 w-16 text-[#7107E7]" weight="duotone" />
                </div>
              </div>
            );
            const copy = (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7107E7]/90">
                  {b.eyebrow}
                </p>
                <h3 className="font-display mt-3 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                  {b.title}
                </h3>
                <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-zinc-600">{b.body}</p>
              </div>
            );
            return (
              <Reveal key={b.eyebrow} delay={i * 0.06}>
                <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
                  {isRight ? (
                    <>
                      {copy}
                      {visual}
                    </>
                  ) : (
                    <>
                      {visual}
                      {copy}
                    </>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
