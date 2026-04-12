import Link from "next/link";
import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Meridian Talent",
  description: "Terms of use for the Meridian Talent demo site.",
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7107E7]">Legal</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Terms</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-600">
          <p>
            This site is provided as a demo mock-up. Content is provided “as is” for illustration only. Nothing
            here constitutes an offer of employment, representation, or professional services.
          </p>
          <p>
            By using this demo you agree not to rely on fictional listings or contact information as
            real-world facts.{" "}
            <Link href="/privacy" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
              Privacy
            </Link>{" "}
            information is described separately.
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
