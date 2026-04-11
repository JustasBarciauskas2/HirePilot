"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";

const ROTATING_ROLE_LABELS = [
  "FRONTEND & MOBILE",
  "BACKEND & PLATFORM",
  "PRODUCT & DESIGN",
  "DATA & ML",
  "DEVOPS & SRE",
  "SECURITY ENGINEERING",
] as const;

const ROLE_CYCLE_MS = 3200;

/** Fixed slot width so the pill doesn’t resize as labels change (fits longest line). */
const ROLE_SLOT_CLASS = "w-[14.5rem] sm:w-[15rem]";

function HeroRoleRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % ROTATING_ROLE_LABELS.length);
    }, ROLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className={`relative inline-flex h-[1.35em] shrink-0 items-center justify-center overflow-hidden align-middle ${ROLE_SLOT_CLASS}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={ROTATING_ROLE_LABELS[index]}
          initial={{ y: "-110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "110%", opacity: 0 }}
          transition={{
            duration: 0.42,
            ease: [0.32, 0.72, 0, 1],
          }}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
        >
          {ROTATING_ROLE_LABELS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative z-10 flex min-h-[100dvh] flex-col overflow-hidden border-b border-zinc-200/60 bg-[#F9F9FB]">
      <div className="pointer-events-none absolute inset-0">
        <video
          className="hero-video-bg hero-video-mask absolute inset-0 h-full w-full scale-[1.02] object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        >
          <source src="/hero-background.mp4" type="video/mp4" />
        </video>
        <div className="hero-vignette-overlay absolute inset-0" aria-hidden />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-4 pb-20 pt-24 text-center sm:px-6 sm:pb-24 sm:pt-28 md:px-8">
        <div className="mx-auto flex w-full max-w-[42rem] flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 26 }}
            className="inline-flex items-center gap-1.5 rounded-md border border-violet-200/90 bg-violet-50/90 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-violet-700 shadow-sm backdrop-blur-sm"
          >
            <span className="text-violet-500">For job seekers</span>
            <span className="h-3 w-px shrink-0 bg-violet-200" aria-hidden />
            <HeroRoleRotator />
            <CaretRight className="h-3.5 w-3.5 shrink-0 text-violet-500" weight="bold" aria-hidden />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.04 }}
            className="mt-8 max-w-[22rem] text-balance text-4xl font-extrabold leading-[1.15] tracking-[-0.03em] text-[#1A1A1A] sm:max-w-none sm:text-5xl sm:leading-[1.12] sm:tracking-[-0.035em] md:text-6xl md:leading-[1.08] md:tracking-[-0.04em]"
          >
            Find, Match, and Land
            <br />
            <span className="text-zinc-700">the Right Role</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.1 }}
            className="mt-7 max-w-xl rounded-xl border border-white/80 bg-white/75 px-4 py-2.5 text-base font-medium leading-snug text-zinc-900 shadow-[0_8px_32px_-16px_rgba(24,24,27,0.12)] backdrop-blur-md sm:mt-8 sm:px-5 sm:py-3 sm:text-lg sm:leading-relaxed"
          >
            One recruiter. One process. Roles that fit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.14 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <Link
              href="/#roles"
              className="group inline-flex items-center gap-3 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(24,24,27,0.45)] transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-zinc-800 active:scale-[0.98]"
            >
              See roles we&apos;re filling
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <span className="text-xs" aria-hidden>
                  ↗
                </span>
              </span>
            </Link>
            <Link
              href="/#process"
              className="rounded-full border border-zinc-300/90 bg-white/80 px-6 py-3 text-sm font-semibold text-[#1A1A1A] shadow-sm backdrop-blur-sm transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-zinc-400 active:scale-[0.98]"
            >
              How we help candidates
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.2 }}
            className="mt-8 max-w-md text-xs leading-relaxed text-zinc-500"
          >
            <Link
              href="/#about"
              className="underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-800"
            >
              About Meridian
            </Link>
            <span className="mx-2 text-zinc-300" aria-hidden>
              ·
            </span>
            <Link href="/#roles" className="underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-800">
              Open roles
            </Link>
          </motion.p>
        </div>
      </div>
    </section>
  );
}
