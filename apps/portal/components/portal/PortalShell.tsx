"use client";

import { getApp } from "firebase/app";
import { getAuth, signOut, type User } from "firebase/auth";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@techrecruit/shared/components/FirebaseAuthProvider";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import { PORTAL_ENTRY_SYNC_FAILED_MESSAGE } from "@techrecruit/shared/lib/auth-error-message";
import { PortalChrome } from "@/components/portal/PortalChrome";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalLogin } from "@/components/portal/PortalLogin";
import { PortalThemeProvider } from "@/components/portal/PortalThemeToggle";
import { applyPortalColorSchemeToDocument, getResolvedPortalColorScheme } from "@/lib/portal-color-scheme";

function PortalInterstitial({ title, message }: { title: string; message?: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 px-8 py-10 text-center shadow-[0_16px_48px_-20px_rgba(15,23,42,0.12)]">
      <div
        className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#2563EB]"
        aria-hidden
      />
      <p className="font-display text-sm font-semibold text-[#0B1F3A]">{title}</p>
      {message ? <p className="mt-1 text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}

function useSyncPortalTenantCookieWithClaim(
  user: User | null,
  tenantClaimMode: boolean,
  bfcacheNonce: number,
  onEntryTenantRejection: (detail?: string) => void,
  onAccessVerified: (ok: boolean, verifiedUid: string | null) => void,
) {
  const router = useRouter();
  useEffect(() => {
    if (!user || !tenantClaimMode) return;
    let cancelled = false;
    (async () => {
      try {
        /** Force refresh so custom claims set after account creation are present on first portal sign-in. */
        const token = await user.getIdToken(true);
        const res = await fetch("/api/portal/auth/sync-tenant", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as {
          changed?: boolean;
          skipped?: boolean;
          error?: string;
          code?: string;
        };
        if (cancelled) return;
        const serverMsg = typeof data.error === "string" && data.error.trim() ? data.error.trim() : undefined;
        if (res.status === 403) {
          await signOut(getAuth(getApp()));
          onEntryTenantRejection(serverMsg);
          onAccessVerified(true, null);
          router.refresh();
          return;
        }
        if (!res.ok) {
          await signOut(getAuth(getApp()));
          onEntryTenantRejection(serverMsg);
          onAccessVerified(true, null);
          router.refresh();
          return;
        }
        onAccessVerified(true, user.uid);
        if (res.ok && data.changed === true) {
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          try {
            await signOut(getAuth(getApp()));
          } catch {
            /* ignore */
          }
          onEntryTenantRejection();
          onAccessVerified(true, null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, user?.uid, tenantClaimMode, bfcacheNonce, router, onEntryTenantRejection, onAccessVerified]);
}

export function PortalShell({
  initialJobs,
  tenantId,
  tenantClaimMode,
}: {
  initialJobs: JobDetail[];
  tenantId: string;
  /** When true, the dashboard is shown only after `POST /api/portal/auth/sync-tenant` succeeds (no flash of a logged-in portal on wrong-tenant). */
  tenantClaimMode: boolean;
}) {
  const { user, loading, configured } = useFirebaseAuth();
  const [entrySyncError, setEntrySyncError] = useState<string | null>(null);
  const [claimAccessOk, setClaimAccessOk] = useState(!tenantClaimMode);
  const [bfcacheNonce, setBfcacheNonce] = useState(0);
  const lastVerifiedClaimUid = useRef<string | null>(null);
  const claimContextRef = useRef({ user: null as User | null, tenantClaimMode: false });
  claimContextRef.current = { user, tenantClaimMode };
  const onEntryTenantRejection = useCallback((detail?: string) => {
    setEntrySyncError(detail?.trim() || PORTAL_ENTRY_SYNC_FAILED_MESSAGE);
  }, []);
  const onAccessVerified = useCallback((ok: boolean, verifiedUid: string | null) => {
    if (ok && verifiedUid) lastVerifiedClaimUid.current = verifiedUid;
    setClaimAccessOk(ok);
  }, []);
  useLayoutEffect(() => {
    if (!user) {
      lastVerifiedClaimUid.current = null;
      setClaimAccessOk(true);
      return;
    }
    if (!tenantClaimMode) {
      setClaimAccessOk(true);
      return;
    }
    if (lastVerifiedClaimUid.current !== user.uid) {
      setClaimAccessOk(false);
    }
  }, [user, user?.uid, tenantClaimMode]);
  useEffect(() => {
    const onHistoryShow = (e: PageTransitionEvent) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = e.persisted || nav?.type === "back_forward";
      if (!isBackForward) return;
      // Re-run tenant sync, but do not block the dashboard on "Signing you in…" — the same user/session is
      // restored; clearing claim state here raced with router.refresh() and could leave the UI stuck until
      // a manual refresh. Cookie sync still runs via bfcacheNonce; 403 from the API signs out as before.
      setBfcacheNonce((n) => n + 1);
    };
    window.addEventListener("pageshow", onHistoryShow);
    return () => window.removeEventListener("pageshow", onHistoryShow);
  }, []);
  useSyncPortalTenantCookieWithClaim(
    user,
    tenantClaimMode,
    bfcacheNonce,
    onEntryTenantRejection,
    onAccessVerified,
  );

  /** Login, loading, and pre-dashboard states use a light page background; restore saved theme in the app shell. */
  const isAppShell = configured && !loading && Boolean(user) && (!tenantClaimMode || claimAccessOk);
  useLayoutEffect(() => {
    if (isAppShell) {
      applyPortalColorSchemeToDocument(getResolvedPortalColorScheme());
    } else {
      applyPortalColorSchemeToDocument("light");
    }
  }, [isAppShell]);

  if (!configured) {
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg rounded-3xl border border-amber-200/90 bg-amber-50/80 p-8 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
            <p className="font-display text-xl font-semibold text-zinc-950">Firebase not configured</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              Copy <span className="font-mono text-xs">env.example</span> to{" "}
              <span className="font-mono text-xs">.env.local</span> and set the{" "}
              <span className="font-mono text-xs">NEXT_PUBLIC_FIREBASE_*</span> keys from your Firebase project
              (Project settings → Your apps). For API routes, add a service account via{" "}
              <span className="font-mono text-xs">GOOGLE_APPLICATION_CREDENTIALS</span> pointing at your
              downloaded service account JSON, or{" "}
              <span className="font-mono text-xs">FIREBASE_SERVICE_ACCOUNT_JSON</span> / separate{" "}
              <span className="font-mono text-xs">FIREBASE_PROJECT_ID</span> +{" "}
              <span className="font-mono text-xs">FIREBASE_CLIENT_EMAIL</span> +{" "}
              <span className="font-mono text-xs">FIREBASE_PRIVATE_KEY</span>.
            </p>
          </div>
        </main>
      </PortalChrome>
    );
  }

  if (loading) {
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalInterstitial title="Loading…" message="Preparing your workspace" />
        </main>
      </PortalChrome>
    );
  }

  if (!user) {
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalLogin
            entrySyncErrorMessage={entrySyncError}
            onClearEntrySyncFailed={() => setEntrySyncError(null)}
          />
        </main>
      </PortalChrome>
    );
  }

  if (tenantClaimMode && !claimAccessOk) {
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalInterstitial title="Signing you in…" message="Verifying your organization" />
        </main>
      </PortalChrome>
    );
  }

  return (
    <PortalChrome tenantId={tenantId} layout="app">
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-16">
              <p className="text-sm font-medium text-slate-500">Loading portal…</p>
            </div>
          }
        >
          <PortalThemeProvider>
            <PortalDashboard
              initialJobs={initialJobs}
              tenantId={tenantId}
              user={user}
              displayName={user.displayName ?? user.email ?? "Recruiter"}
              teamDirectoryEnabled={tenantClaimMode}
            />
          </PortalThemeProvider>
        </Suspense>
      </main>
    </PortalChrome>
  );
}
