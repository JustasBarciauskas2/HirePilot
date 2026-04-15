import Link from "next/link";
import { Footer } from "@/components/agency/Footer";
import { Nav } from "@/components/agency/Nav";

export default function JobNotFound() {
  return (
    <>
      <Nav />
      <main className="relative z-10 flex min-h-[60vh] flex-1 flex-col items-center justify-center bg-[#f6f5f2] px-4 py-24 text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-[#7107E7]">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-zinc-950">Role not found</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600">
          This role doesn&apos;t exist anymore. Head back to the listings and pick another role.
        </p>
        <Link
          href="/#roles"
          className="mt-8 rounded-full bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.45)] transition hover:bg-[#5b06c2]"
        >
          View roles
        </Link>
      </main>
      <Footer />
    </>
  );
}
