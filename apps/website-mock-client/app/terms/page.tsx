import Link from "next/link";
import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | TechRecruit",
  description: "Terms of use for the TechRecruit website.",
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
            TechRecruit Ltd (“we”, “us”) provides this website to advertise roles on behalf of clients and to
            receive enquiries from candidates. Content is provided in good faith but may change without notice.
            Nothing on this site constitutes an offer of employment; offers are made only by employers in line
            with their own processes.
          </p>
          <p>
            By using this site you agree to use it lawfully and not to misrepresent your identity or
            qualifications. Vacancies may be withdrawn or filled at any time. For how we handle personal data,
            see our{" "}
            <Link href="/privacy" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
              Privacy
            </Link>{" "}
            notice.
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
