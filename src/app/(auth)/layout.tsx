import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemeScope } from "@/components/ThemeScope";
import { PUBLIC_THEME_KEY } from "@/lib/theme-keys";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <ThemeScope storageKey={PUBLIC_THEME_KEY} nonce={nonce}>
      <div className="flex min-h-screen flex-col">
        <header className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/assets/logo/logo-128.webp" alt="" width={36} height={36} />
            <span className="font-display font-semibold">205 nömrəli məktəb</span>
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </ThemeScope>
  );
}
