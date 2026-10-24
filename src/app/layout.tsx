import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Skyline — Room to breathe. Space to become.",
    template: "%s | Skyline Residences",
  },
  description: "Discover considered residences, architectural calm and a more personal perspective on luxury living with Skyline.",
  applicationName: "Skyline Residences",
  openGraph: {
    type: "website",
    siteName: "Skyline Residences",
    title: "Skyline — Room to breathe. Space to become.",
    description: "A considered collection of residences designed around the way you want to live.",
    images: [{ url: "/images/landing/tower-poster.webp", width: 1536, height: 1024, alt: "Skyline's landscaped residential tower at golden hour" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skyline — Room to breathe. Space to become.",
    description: "A considered collection of residences designed around the way you want to live.",
    images: ["/images/landing/tower-poster.webp"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1e9",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
