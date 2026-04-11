"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

export function Contact() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  return (
    <section id="contact" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
              Get in touch (demo)
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
              Let us <span className="text-[#7107E7]">find roles</span> for you
            </h2>
            <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-600">
              Looking for a job? Drop your details and the kind of role you want. Mention a vacancy ref
              if one of our listings caught your eye. This portfolio build only shows a local success
              state—nothing is emailed.
            </p>
            <p className="mt-6 text-sm text-zinc-600">
              Demo inbox:{" "}
              <a
                href="mailto:hello@meridian-talent.demo"
                className="font-medium text-[#5b06c2] underline decoration-[#7107E7]/35 underline-offset-4 transition hover:text-[#7107E7]"
              >
                hello@meridian-talent.demo
              </a>
            </p>
            <p className="mt-3 font-mono text-sm text-zinc-500">Placeholder · +1 (415) 555-0192</p>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.06}>
            <div className="rounded-[2rem] bg-zinc-200/50 p-2 ring-1 ring-zinc-950/5">
              <form
                className="space-y-5 rounded-[calc(2rem-0.5rem)] border border-white/90 bg-white p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_48px_-28px_rgba(24,24,27,0.1)]"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStatus("sent");
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm font-medium text-zinc-800">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-950 outline-none transition duration-300 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-800">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-950 outline-none transition duration-300 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="roleRef" className="text-sm font-medium text-zinc-800">
                    Role ref (optional)
                  </label>
                  <input
                    id="roleRef"
                    name="roleRef"
                    placeholder="e.g. MT-2026-014 if you’re applying to a specific listing"
                    className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-950 outline-none transition duration-300 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="notes" className="text-sm font-medium text-zinc-800">
                    What are you looking for?
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    placeholder="Your background, target title, location, salary band, timeline…"
                    className="resize-y rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-sm text-zinc-950 outline-none transition duration-300 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15"
                  />
                </div>
                {status === "sent" ? (
                  <p className="text-sm font-medium text-[#5b06c2]" role="status">
                    Thanks—this demo only shows a success state locally.
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#7107E7] py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(113,7,231,0.45)] transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5b06c2] active:scale-[0.98] sm:w-auto sm:px-10"
                >
                  Send (mock)
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
