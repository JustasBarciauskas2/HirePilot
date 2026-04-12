import { Reveal } from "./Reveal";

export function FocusStrip() {
  return (
    <section id="focus" className="relative z-10 border-b border-zinc-200/80 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
              Why work with TechRecruit
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
              Built for <span className="text-[#7107E7]">people job-hunting</span> in tech
            </h2>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-zinc-600">
              You shouldn&apos;t have to guess whether a recruiter is really advocating for you. We
              focus on roles where your skills matter and keep you informed at every step—so you can
              spend energy on interviews, not chasing updates.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {[
              { label: "Markets we cover", value: "US · EU · UK", note: "Remote & hybrid friendly" },
              { label: "Typical seniority", value: "L5+", note: "IC & leadership" },
              { label: "First response aim", value: "48h", note: "After you reach out" },
              { label: "Disciplines", value: "Eng · prod · data", note: "Product-led teams" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={0.05 * i}>
                <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-6 shadow-[0_20px_40px_-24px_rgba(24,24,27,0.08)]">
                  <p className="text-xs font-medium text-zinc-500">{item.label}</p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#7107E7]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{item.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
