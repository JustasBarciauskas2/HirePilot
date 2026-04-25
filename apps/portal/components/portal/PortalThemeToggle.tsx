"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { PORTAL_COLOR_SCHEME_STORAGE_KEY } from "@/lib/portal-color-scheme";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

function readStoredMode(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(PORTAL_COLOR_SCHEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function applyToDocument(mode: "light" | "dark") {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
}

type ThemeContextValue = {
  mode: "light" | "dark" | null;
  toggle: () => void;
  ready: boolean;
};

const PortalThemeContext = createContext<ThemeContextValue | null>(null);

export function PortalThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useLayoutEffect(() => {
    const stored = readStoredMode();
    const m =
      stored ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setMode(m);
    applyToDocument(m);
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const m = current ?? "light";
      const next: "light" | "dark" = m === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(PORTAL_COLOR_SCHEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyToDocument(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, toggle, ready: mode !== null } satisfies ThemeContextValue),
    [mode, toggle],
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function usePortalTheme() {
  const v = useContext(PortalThemeContext);
  if (!v) {
    throw new Error("usePortalTheme must be used under PortalThemeProvider");
  }
  return v;
}

export function PortalThemeToggle() {
  const { mode, toggle, ready } = usePortalTheme();

  if (!ready) {
    return <span className="inline-block h-9 w-9 shrink-0 rounded-lg bg-slate-200/50 dark:bg-slate-600/40" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-700 shadow-sm transition hover:border-[#2563EB]/40 hover:text-[#2563EB] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 dark:border-slate-500/30 dark:bg-slate-800/55 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:text-sky-300"
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={mode === "dark"}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" weight="duotone" aria-hidden /> : <Moon className="h-4 w-4" weight="duotone" aria-hidden />}
      <span className="sr-only">{mode === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
