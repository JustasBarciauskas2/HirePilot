import { PortalShell } from "@/components/portal/PortalShell";
import { getPublicJobs } from "@/lib/public-jobs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruiter portal | TechRecruit",
  description: "Manage job listings and applications for TechRecruit.",
};

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const jobs = await getPublicJobs();
  return <PortalShell initialJobs={jobs} />;
}
