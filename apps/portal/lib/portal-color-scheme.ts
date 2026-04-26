/**
 * localStorage key for recruiter portal light/dark preference.
 * Must match the inline script in `app/layout.tsx` (zero flash before React hydrates).
 */
export const PORTAL_COLOR_SCHEME_STORAGE_KEY = "recruiter-portal-color-scheme";

/** Resolved preference: stored value only; new users default to light (no OS theme follow). */
export function getResolvedPortalColorScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(PORTAL_COLOR_SCHEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "light";
}

export function applyPortalColorSchemeToDocument(mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
}
