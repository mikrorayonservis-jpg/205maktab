import { headers } from "next/headers";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ThemeScope } from "@/components/ThemeScope";
import { PUBLIC_THEME_KEY } from "@/lib/theme-keys";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <ThemeScope storageKey={PUBLIC_THEME_KEY} nonce={nonce}>
      <SiteHeader />
      {/* tabIndex=-1: "əsas məzmuna keç" və "yuxarı qayıt" fokusu buraya ötürür */}
      <main id="main" tabIndex={-1} className="outline-none">{children}</main>
      <SiteFooter />
    </ThemeScope>
  );
}
