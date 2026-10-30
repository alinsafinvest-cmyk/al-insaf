// বাংলা: এই root layout-এ পুরো ওয়েবসাইটের metadata, font, language, theme ও translation provider যুক্ত হয়।
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SkipToContent from "@/app/components/SkipToContent";


const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি",
    template: "%s | আল ইনসাফ",
  },
  description:
    "বিশ্বাসে বিনিয়োগ, ইনসাফে সমৃদ্ধি। আল ইনসাফ ইনভেস্টমেন্ট সোসাইটির অফিসিয়াল ওয়েবসাইট।",
  applicationName: "আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি",
  icons: {
    icon: "/WhatsApp%20Image%202026-10-01%20at%208.09.06%20PM.jpeg",
    apple: "/WhatsApp%20Image%202026-10-01%20at%208.09.06%20PM.jpeg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

// বাংলা: এই root component metadata, Bengali font এবং shared theme/language provider দিয়ে page wrap করে।
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bn" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={hindSiliguri.className}>
        <ThemeProvider>
          <LanguageProvider>
            <SkipToContent />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}