"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const links = [
  { href: "/#roles", label: "Open roles" },
  { href: "/#about", label: "About" },
  { href: "/#focus", label: "Why Meridian" },
  { href: "/#process", label: "Process" },
  { href: "/#contact", label: "Contact" },
];

const SCROLL_BRAND_HIDE_PX = 8;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [showBrand, setShowBrand] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setShowBrand(window.scrollY < SCROLL_BRAND_HIDE_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center px-4 pt-6">
        <div className="pointer-events-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link
            href="/"
            className={`font-display justify-self-start text-lg font-semibold tracking-tight text-zinc-950 transition duration-300 ease-out hover:text-[#7107E7] ${
              showBrand ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-1 opacity-0"
            }`}
            tabIndex={showBrand ? undefined : -1}
          >
            Meridian
          </Link>
          <nav className="hidden items-center gap-1 justify-self-center rounded-full border border-white/40 bg-white/70 p-1.5 shadow-[0_12px_40px_-12px_rgba(24,24,27,0.15)] ring-1 ring-zinc-950/5 backdrop-blur-xl md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#7107E7]/8 hover:text-[#4c0599]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/#roles"
              className="group relative ml-1 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#7107E7] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.45)] transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#5b06c2] active:scale-[0.98]"
            >
              View roles
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <span className="text-xs" aria-hidden>
                  ↗
                </span>
              </span>
            </Link>
          </nav>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center justify-self-end rounded-full border border-zinc-200 bg-white/90 text-zinc-950 shadow-sm backdrop-blur md:hidden"
          >
            {open ? <X className="h-5 w-5" weight="bold" /> : <List className="h-5 w-5" weight="bold" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-30 bg-zinc-50/95 backdrop-blur-2xl md:hidden"
          >
            <nav className="flex min-h-[100dvh] flex-col gap-2 px-8 pb-12 pt-28">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{
                    delay: 0.04 + i * 0.035,
                    type: "spring",
                    stiffness: 200,
                    damping: 28,
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 font-display text-3xl font-semibold tracking-tight text-zinc-950 transition hover:text-[#7107E7]"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
