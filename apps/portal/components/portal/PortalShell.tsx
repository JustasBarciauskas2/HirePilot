"use client";

import { getApp } from "firebase/app";
import { getAuth, signOut, type User } from "firebase/auth";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@techrecruit/shared/components/FirebaseAuthProvider";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import {
  PORTAL_AUTH_ERROR_ENTRY_TENANT_MISMATCH,
  PORTAL_AUTH_ERROR_ENTRY_TENANT_REQUIRED,
} from "@techrecruit/shared/lib/portal-tenant";
import { PortalChrome } from "@/components/portal/PortalChrome";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalLogin } from "@/components/portal/PortalLogin";

function useSyncPortalTenantCookieWithClaim(
  user: User | null,
  tenantClaimMode: boolean,
  bfcacheNonce: number,
  onEntryTenantRejection: () => void,
  onAccessVerified: (ok: boolean, verifiedUid: string | null) => void,
) {
  const router = useRouter();
  useEffect(() => {
    if (!user || !tenantClaimMode) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
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
        if (res.status === 403) {
          const code = data.code ?? "";
          if (code === PORTAL_AUTH_ERROR_ENTRY_TENANT_MISMATCH || code === PORTAL_AUTH_ERROR_ENTRY_TENANT_REQUIRED) {
            await signOut(getAuth(getApp()));
            onEntryTenantRejection();
            onAccessVerified(true, null);
            router.refresh();
            return;
          }
          await signOut(getAuth(getApp()));
          onEntryTenantRejection();
          onAccessVerified(true, null);
          router.refresh();
          return;
        }
        if (!res.ok) {
          await signOut(getAuth(getApp()));
          onEntryTenantRejection();
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
  loginEntryGate,
}: {
  initialJobs: JobDetail[];
  tenantId: string;
  /** When true, the dashboard is shown only after `POST /api/portal/auth/sync-tenant` succeeds (no flash of a logged-in portal on wrong-tenant). */
  tenantClaimMode: boolean;
  loginEntryGate: { requireMarketingEntry: boolean; hasEntryTenantCookie: boolean };
}) {
  const { user, loading, configured } = useFirebaseAuth();
  const [entrySyncFailed, setEntrySyncFailed] = useState(false);
  const [claimAccessOk, setClaimAccessOk] = useState(!tenantClaimMode);
  const [bfcacheNonce, setBfcacheNonce] = useState(0);
  const lastVerifiedClaimUid = useRef<string | null>(null);
  const claimContextRef = useRef({ user: null as User | null, tenantClaimMode: false });
  claimContextRef.current = { user, tenantClaimMode };
  const onEntryTenantRejection = useCallback(() => {
    setEntrySyncFailed(true);
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
    const onBfcacheRestore = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      lastVerifiedClaimUid.current = null;
      const { user: u, tenantClaimMode: tcm } = claimContextRef.current;
      if (u && tcm) setClaimAccessOk(false);
      setBfcacheNonce((n) => n + 1);
    };
    window.addEventListener("pageshow", onBfcacheRestore);
    return () => window.removeEventListener("pageshow", onBfcacheRestore);
  }, []);
  useSyncPortalTenantCookieWithClaim(
    user,
    tenantClaimMode,
    bfcacheNonce,
    onEntryTenantRejection,
    onAccessVerified,
  );

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
          <p className="mx-auto max-w-2xl text-center text-sm text-zinc-500">Loading…</p>
        </main>
      </PortalChrome>
    );
  }

  if (!user) {
    const loginBlockedByMissingEntry =
      loginEntryGate.requireMarketingEntry && !loginEntryGate.hasEntryTenantCookie;
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalLogin
            entrySyncFailed={entrySyncFailed}
            onClearEntrySyncFailed={() => setEntrySyncFailed(false)}
            loginBlockedByMissingEntry={loginBlockedByMissingEntry}
          />
        </main>
      </PortalChrome>
    );
  }

  if (tenantClaimMode && !claimAccessOk) {
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <p className="mx-auto max-w-2xl text-center text-sm text-zinc-500">Signing in…</p>
        </main>
      </PortalChrome>
    );
  }

  return (
    <PortalChrome tenantId={tenantId}>
      <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl py-12 text-center text-sm text-zinc-500">Loading portal…</div>
          }
        >
          <PortalDashboard
            initialJobs={initialJobs}
            tenantId={tenantId}
            user={user}
            displayName={user.displayName ?? user.email ?? "Recruiter"}
          />
        </Suspense>
      </main>
    </PortalChrome>
  );
}
