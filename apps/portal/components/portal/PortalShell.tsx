"use client";

import { Suspense } from "react";
import { useFirebaseAuth } from "@techrecruit/shared/components/FirebaseAuthProvider";
import type { JobDetail } from "@techrecruit/shared/data/jobs";
import { PortalChrome } from "@/components/portal/PortalChrome";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalLogin } from "@/components/portal/PortalLogin";

export function PortalShell({
  initialJobs,
  tenantId,
}: {
  initialJobs: JobDetail[];
  tenantId: string;
}) {
  const { user, loading, configured } = useFirebaseAuth();

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
    return (
      <PortalChrome tenantId={tenantId}>
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalLogin />
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
