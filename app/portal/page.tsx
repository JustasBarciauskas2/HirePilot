import { PortalShell } from "@/components/portal/PortalShell";
import { getAllJobs } from "@/data/jobs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruiter portal | Meridian Talent",
  description: "Manage job listings for the Meridian Talent demo site.",
};

export const dynamic = "force-dynamic";

export default function PortalPage() {
  const jobs = getAllJobs();
  return <PortalShell initialJobs={jobs} />;
}
