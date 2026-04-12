import Link from "next/link";
import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Meridian Talent",
  description: "Privacy information for the Meridian Talent demo site.",
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
            This is a demonstration website. We do not run a live recruitment business here. Any contact details,
            roles, and people described are fictional unless stated otherwise.
          </p>
          <p>
            If you use recruiter tools or forms on this demo, treat any data you enter as non-production. For
            questions,{" "}
            <Link href="/#contact" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
              contact us
            </Link>{" "}
            via the details in the footer.
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
