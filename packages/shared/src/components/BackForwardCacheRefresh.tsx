"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/**
 * On back/forward, the user can see a stale RSC tree:
 * - **bfcache** (`event.persisted`): frozen page restored from memory.
 * - **Normal history** (`NavigationTiming.type === "back_forward"`): full navigation without bfcache.
 * In both cases we call `router.refresh()` so the App Router and server data match the current history entry.
 */
export function BackForwardCacheRefresh() {
  const router = useRouter();
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = nav?.type === "back_forward";
      if (e.persisted || isBackForward) {
        startTransition(() => {
          router.refresh();
        });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);
  return null;
}
