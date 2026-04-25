"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * When the user returns with the back/forward buttons, the page may be loaded from the browser’s bfcache with a
 * stale RSC tree and a stale `fetch` cache. Call `router.refresh()` so the App Router revalidates server state.
 */
export function BackForwardCacheRefresh() {
  const router = useRouter();
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        router.refresh();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);
  return null;
}
