import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { BackForwardCacheRefresh } from "@techrecruit/shared/components/BackForwardCacheRefresh";
import { FirebaseAuthProvider } from "@techrecruit/shared/components/FirebaseAuthProvider";
import { PORTAL_COLOR_SCHEME_STORAGE_KEY } from "@/lib/portal-color-scheme";
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
  themeColor: "#F8FAFC",
  appleWebApp: { statusBarStyle: "default" },
};

/** Runs before paint so `html.dark` matches localStorage and Tailwind `dark:` applies without a flash. */
const portalColorSchemeInitScript = `(function(k){try{var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})(${JSON.stringify(PORTAL_COLOR_SCHEME_STORAGE_KEY)})`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: portalColorSchemeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} relative flex min-h-full flex-col scroll-smooth text-[#0F172A] antialiased dark:text-slate-200`}
      >
        <BackForwardCacheRefresh />
        <FirebaseAuthProvider>
          <div className="flex min-h-0 min-h-screen flex-1 flex-col">{children}</div>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
