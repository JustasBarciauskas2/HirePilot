import Link from "next/link";
import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | TechRecruit",
  description: "Privacy information for TechRecruit candidates and clients.",
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7107E7]">Legal</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Privacy</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600">
          <p>
            TechRecruit Ltd processes personal data to provide recruitment services: introducing candidates to
            client employers, managing applications, and responding to enquiries. We collect only what we need
            for those purposes, including contact details, CVs, and notes from conversations where relevant.
          </p>
          <p>
            We may share information with prospective employers when you apply or when we put you forward for
            a role. We do not sell your data. You may request access or correction of your data by contacting
            us at{" "}
            <a href="mailto:hello@techrecruit.co.uk" className="font-medium text-[#7107E7] hover:underline">
              hello@techrecruit.co.uk
            </a>
            . For general contact, see the{" "}
            <Link href="/#contact" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
              contact section
            </Link>{" "}
            on our homepage.
          </p>
        </div>
        <p className="mt-10">
          <Link href="/" className="text-sm font-semibold text-[#7107E7] transition hover:text-[#5b06c2]">
            ← Back to home
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
