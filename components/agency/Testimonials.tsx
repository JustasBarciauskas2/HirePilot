import Image from "next/image";
import { Reveal } from "./Reveal";

const quotes = [
  {
    text: "I was job-hunting for months on my own. Meridian only sent me two companies—but both were dead-on for my stack and seniority. I signed with the second.",
    name: "Alex Chen",
    role: "Senior backend engineer",
    company: "Now at a fintech (sample quote)",
    seed: "alex-chen-portrait",
  },
  {
    text: "They actually read my portfolio and prepped me for the system-design round. Felt like they were recruiting for me, not just filling a req.",
    name: "Jordan Mills",
    role: "Product designer",
    company: "Placed via Meridian (fictional)",
    seed: "jordan-mills-portrait",
  },
];

export function Testimonials() {
  return (
    <section className="relative z-10 border-b border-zinc-200/80 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
            From people we&apos;ve placed
          </p>
          <h2 className="font-display mt-3 max-w-lg text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
            Job seekers who found their <span className="text-[#7107E7]">next step</span> with us
          </h2>
          <p className="mt-3 max-w-xl text-sm text-zinc-500">
            Sample quotes for this mock site—swap in real names, photos, and companies when you ship.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-10">
          {quotes.map((q, i) => (
            <Reveal key={q.name} delay={0.06 * i}>
              <figure className="flex h-full flex-col rounded-[2rem] border border-zinc-200/90 bg-zinc-50/50 p-2 ring-1 ring-zinc-950/5">
                <div className="flex flex-1 flex-col rounded-[calc(2rem-0.5rem)] border border-white/80 bg-white p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <blockquote className="flex-1 text-base leading-relaxed text-zinc-700">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-4 border-t border-zinc-100 pt-6">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-[#7107E7]/25">
                      <Image
                        src={`https://picsum.photos/seed/${q.seed}/96/96`}
                        alt=""
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold text-[#1A1A1A]">
                        {(() => {
                          const idx = q.name.lastIndexOf(" ");
                          if (idx < 0) return q.name;
                          return (
                            <>
                              {q.name.slice(0, idx)}{" "}
                              <span className="text-[#7107E7]">{q.name.slice(idx + 1)}</span>
                            </>
                          );
                        })()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {q.role}, {q.company}
                      </p>
                    </div>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
