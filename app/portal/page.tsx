import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { getAllJobs } from "@/data/jobs";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruiter portal | Meridian Talent",
  description: "Manage job listings for the Meridian Talent demo site.",
};

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await auth0.getSession();
  const jobs = getAllJobs();

  if (!isAuth0Configured()) {
    return (
      <>
        <Nav />
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg rounded-3xl border border-amber-200/90 bg-amber-50/80 p-8 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
            <p className="font-display text-xl font-semibold text-zinc-950">Auth0 not configured</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              Copy <span className="font-mono text-xs">env.example</span> to{" "}
              <span className="font-mono text-xs">.env.local</span> and set{" "}
              <span className="font-mono text-xs">AUTH0_DOMAIN</span>,{" "}
              <span className="font-mono text-xs">AUTH0_CLIENT_ID</span>,{" "}
              <span className="font-mono text-xs">AUTH0_CLIENT_SECRET</span>, and{" "}
              <span className="font-mono text-xs">AUTH0_SECRET</span>. Register callback{" "}
              <span className="font-mono text-xs">http://localhost:3000/auth/callback</span> in the Auth0
              dashboard.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Nav />
        <main className="relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
            <p className="font-display text-xl font-semibold text-zinc-950">Recruiter portal</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Sign in with Auth0 to view vacancies, add new postings from text or a file, and remove listings.
            </p>
            <a
              href="/auth/login?returnTo=/portal"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#7107E7] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.45)] transition hover:bg-[#5b06c2]"
            >
              Log in to portal
            </a>
          </div>
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
          initialJobs={jobs}
          displayName={session.user.name ?? session.user.email ?? "Recruiter"}
        />
      </main>
      <Footer />
    </>
  );
}
