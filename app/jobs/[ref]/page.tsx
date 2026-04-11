import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import { JobDetailView } from "@/components/jobs/JobDetailView";
import { getJobBySlug } from "@/data/jobs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ref } = await params;
  const job = getJobBySlug(ref);
  if (!job) {
    return { title: "Role not found | Meridian Talent" };
  }
  return {
    title: `${job.title} · ${job.companyName} | Meridian Talent`,
    description: `${job.companyName} — ${job.comp}. ${job.location}. ${job.companyTagline}`,
  };
}

export default async function JobPage({ params }: Props) {
  const { ref } = await params;
  const job = getJobBySlug(ref);
  if (!job) {
    notFound();
  }

  return (
    <>
      <Nav />
      <main className="relative z-10 flex-1">
        <JobDetailView job={job} />
      </main>
      <Footer />
    </>
  );
}
