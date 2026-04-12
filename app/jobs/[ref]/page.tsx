import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import { JobDetailView } from "@/components/jobs/JobDetailView";
import { parseJobFilterHighlight } from "@/lib/job-filter-highlight-url";
import { salaryDisplayLine } from "@/lib/job-salary-display";
import { getPublicJobBySlug } from "@/lib/public-jobs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params;
  const job = await getPublicJobBySlug(ref);
  if (!job) {
    return { title: "Role not found | TechRecruit" };
  }
  return {
    title: `${job.title} · ${job.companyName} | TechRecruit`,
    description: `${job.companyName} — ${salaryDisplayLine(job) || job.comp}. ${job.location}. ${job.companyTagline}`,
  };
}

export default async function JobPage({ params, searchParams }: Props) {
  const { ref } = await params;
  const job = await getPublicJobBySlug(ref);
  if (!job) {
    notFound();
  }

  const sp = await searchParams;
  const filterHighlight = parseJobFilterHighlight(sp);

  return (
    <>
      <Nav />
      <main className="relative z-10 flex-1">
        <JobDetailView job={job} filterHighlight={filterHighlight} />
      </main>
      <Footer />
    </>
  );
}
