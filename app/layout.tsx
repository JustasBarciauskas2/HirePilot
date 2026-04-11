import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
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
  title: "Meridian Talent | Find your next tech role",
  description:
    "Meridian Talent helps job seekers land engineering, product, and data roles. Browse sample openings, learn how we work for candidates, and get in touch—demo site for portfolio use.",
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
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </body>
    </html>
  );
}
