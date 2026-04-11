import Image from "next/image";
import { Reveal } from "./Reveal";

const principles = [
  {
    title: "You come first in the process",
    body: "Looking for a job is stressful—we answer quickly, explain where you stand, and don’t leave you guessing after an interview.",
  },
  {
    title: "Roles that fit your story",
    body: "We match you to teams and stacks that make sense for your experience, not just keywords on a JD.",
  },
  {
    title: "Support through offer stage",
    body: "From intro calls to compensation conversations, we’re in your corner so you can decide with confidence.",
  },
];

export function BrandStudio() {
  return (
    <section id="about" className="relative z-10 border-b border-zinc-200/80 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="mx-auto w-full max-w-md lg:mx-0">
              <div className="rounded-[2rem] bg-zinc-200/60 p-2 ring-1 ring-zinc-950/5">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[calc(2rem-0.5rem)] border border-white/80 bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <Image
                    src="/team-nina-kovac.png"
                    alt="Nina Kovac, lead recruiter at Meridian Talent"
                    fill
                    className="object-cover object-top"
                    sizes="(min-width: 1024px) 480px, 100vw"
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-950/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    <p className="font-display text-lg font-semibold tracking-tight text-white">
                      Nina Kovac
                    </p>
                    <p className="mt-1 text-sm text-[#E9D5FF]">Lead recruiter · Meridian Talent</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500 lg:text-left">
                Your point of contact when you&apos;re ready to explore what&apos;s next
              </p>
            </div>
          </Reveal>

          <div className="order-1 flex flex-col justify-center lg:order-2">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
                People looking for work
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                We exist to help you find a job you&apos;ll actually want to{" "}
                <span className="text-[#7107E7]">show up for</span>.
              </h2>
            </Reveal>

            <Reveal className="mt-8" delay={0.05}>
              <div className="space-y-5 text-base leading-[1.75] text-zinc-600">
                <p>
                  Meridian Talent partners with tech and product teams who are hiring—but our job is to
                  represent <em>you</em> in the process. Whether you&apos;re actively searching or just
                  curious what&apos;s out there, we get your profile in front of hiring managers who are
                  a genuine fit.
                </p>
                <p>
                  Rohan Patel leads candidate experience: onboarding, interview prep, and follow-ups.
                  Nina Kovac runs search and shortlists. Together they make sure people looking for a
                  role get clarity, respect, and a path to the right offer—not a spray of irrelevant
                  interviews.
                </p>
              </div>
              <p className="mt-8 font-display text-sm font-medium italic text-[#5b06c2]">
                — Meridian Talent
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-16 border-t border-zinc-200/90 pt-14 sm:mt-20 sm:pt-16" delay={0.08}>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7] lg:text-left">
            What you can expect from us
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {principles.map((p, i) => (
              <li
                key={p.title}
                className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-6 shadow-[0_12px_32px_-20px_rgba(24,24,27,0.08)]"
              >
                <span className="font-mono text-xs font-semibold tabular-nums text-[#7107E7]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold tracking-tight text-zinc-950">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{p.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
