import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { RelatedTools } from "@/components/related-tools";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hvac-flat-rate.jakegenerates.com"),
  title: "HVAC Flat Rate Repair Pricing Calculator | JakeGenerates",
  description: "Calculate a reusable HVAC flat-rate repair price from book time, labor cost, parts, overhead, callback reserve, target margin, member discount, and after-hours pricing.",
  keywords: ["hvac flat rate pricing calculator", "hvac repair pricing calculator", "hvac flat rate formula"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "HVAC Flat Rate Repair Pricing Calculator",
    description: "Set a reusable price-book amount for an individual HVAC repair task.",
    url: "/",
    siteName: "JakeGenerates",
    type: "website",
  },
  robots: { index: true, follow: true }, icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<RelatedTools /><SiteFooter /></body><GoogleAnalytics /></html>;
}
