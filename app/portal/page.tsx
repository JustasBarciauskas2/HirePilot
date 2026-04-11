import { PortalShell } from "@/components/portal/PortalShell";
import { getPublicJobs } from "@/lib/public-jobs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruiter portal | Meridian Talent",
  description: "Manage job listings for the Meridian Talent demo site.",
};

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const jobs = await getPublicJobs();
  return <PortalShell initialJobs={jobs} />;
}
