import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { BackForwardCacheRefresh } from "@techrecruit/shared/components/BackForwardCacheRefresh";
import { FirebaseAuthProvider } from "@techrecruit/shared/components/FirebaseAuthProvider";
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

export const metadata: Metadata = {
  title: "Recruiter portal | TechRecruit",
  description: "Manage job listings and applications.",
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
        <BackForwardCacheRefresh />
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}
