import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getSettings } from "@/server/settings";
import "./globals.css";

// Şriftlər build zamanı yüklənib saytın özündən verilir (xarici sorğu yoxdur, CSP: font-src 'self').
// latin-ext alt dəsti Azərbaycan hərflərini (Ə ə, Ğ ğ, İ ı, Ş ş, Ç ç, Ö ö, Ü ü) əhatə edir.
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body-face", display: "swap" });
const heading = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-heading-face", display: "swap", weight: ["500", "600", "700", "800"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const site = process.env.SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(site),
    title: { default: s.school_name, template: `%s — ${s.school_short_name}` },
    description: s.seo_default_description,
    applicationName: s.school_short_name,
    openGraph: { siteName: s.school_name, locale: "az_AZ", type: "website", images: [{ url: "/assets/images/og-default.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07111f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" suppressHydrationWarning className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-screen bg-bg text-ink">
        <a href="#main" className="skip-link">Əsas məzmuna keç</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
