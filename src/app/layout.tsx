import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Noto_Serif_Display } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getSettings } from "@/server/settings";
import "./globals.css";

// Başlıq şrifti: build zamanı yüklənib saytın özündən verilir (xarici sorğu yoxdur, CSP: font-src 'self').
// latin-ext alt dəsti Azərbaycan hərflərini (ə, ğ, ı, ö, ş, ç, ü) əhatə edir.
const display = Noto_Serif_Display({ subsets: ["latin", "latin-ext"], variable: "--font-display-face", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const site = process.env.SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(site),
    title: { default: s.school_name, template: `%s — ${s.school_short_name}` },
    description: s.seo_default_description,
    applicationName: s.school_short_name,
    openGraph: { siteName: s.school_name, locale: "az_AZ", type: "website", images: [{ url: "/images/og-default.jpg", width: 1200, height: 609 }] },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0c121c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="az" suppressHydrationWarning className={display.variable}>
      <body className="min-h-screen bg-bg text-ink">
        <a href="#main" className="skip-link">Əsas məzmuna keç</a>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
