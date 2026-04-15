import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteLabel =
  process.env.NEXT_PUBLIC_SITE_LABEL?.trim() || "ACME Careers (mock client #2)";

export const metadata: Metadata = {
  title: `${siteLabel} | Second client instance`,
  description:
    "Mock marketing site for a separate tenant + shared portal. Same codebase pattern as apps/website with its own .env.local.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-[#F9F9FB] text-[#1A1A1A]">
        <div
          role="status"
          className="sticky top-0 z-50 border-b border-teal-700/20 bg-teal-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm"
        >
          <span className="opacity-95">Mock client site</span>
          <span className="mx-2 opacity-60" aria-hidden>
            ·
          </span>
          <span>{siteLabel}</span>
        </div>
        {children}
      </body>
    </html>
  );
}
