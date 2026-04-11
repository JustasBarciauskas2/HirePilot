"use client";

import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import type { JobDetail } from "@/data/jobs";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { PortalLogin } from "@/components/portal/PortalLogin";

export function PortalShell({ initialJobs }: { initialJobs: JobDetail[] }) {
  const { user, loading, configured } = useFirebaseAuth();

  if (!configured) {
    return (
      <>
        <Nav />
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
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <p className="mx-auto max-w-2xl text-center text-sm text-zinc-500">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <PortalLogin />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <PortalDashboard
          initialJobs={initialJobs}
          user={user}
          displayName={user.displayName ?? user.email ?? "Recruiter"}
        />
      </main>
      <Footer />
    </>
  );
}
