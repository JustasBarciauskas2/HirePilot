import { BentoProof } from "@/components/agency/BentoProof";
import { BrandStudio } from "@/components/agency/BrandStudio";
import { Contact } from "@/components/agency/Contact";
import { CTABand } from "@/components/agency/CTABand";
import { FocusStrip } from "@/components/agency/FocusStrip";
import { Footer } from "@/components/agency/Footer";
import { Hero } from "@/components/agency/Hero";
import { JobVacancies } from "@/components/agency/JobVacancies";
import { MarqueeRoles } from "@/components/agency/MarqueeRoles";
import { Nav } from "@/components/agency/Nav";
import { ServicesZigZag } from "@/components/agency/ServicesZigZag";
import { Testimonials } from "@/components/agency/Testimonials";
import { getAllJobs } from "@/data/jobs";

export const dynamic = "force-dynamic";

export default function Home() {
  const jobs = getAllJobs();
  return (
    <>
      <Nav />
      <main className="relative z-10 flex-1">
        <Hero />
        <MarqueeRoles />
        <JobVacancies jobs={jobs} />
        <BrandStudio />
        <FocusStrip />
        <ServicesZigZag />
        <BentoProof />
        <Testimonials />
        <CTABand />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
