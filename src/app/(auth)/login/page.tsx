import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

/**
 * Telefon: yuxarıda məktəbin binası, üzərinə aşağıdan qalxan ağ vərəq və forma.
 * Desktop: solda yuvarlaq künclü şəkil paneli, sağda forma.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getCurrentUser()) redirect(safeNext);
  return (
    <div className="min-h-[100svh] bg-surface lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="relative h-[38svh] min-h-60 lg:sticky lg:top-0 lg:h-[100svh] lg:p-4">
        <div className="relative h-full overflow-hidden lg:rounded-[28px]">
          <Image
            src="/assets/images/mekteb-bina-1438.webp"
            alt="Rövşən İmanov adına 205 nömrəli məktəbin binası"
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="login-hero-img object-cover"
          />
          {/* Mətnin oxunması üçün neytral qaralma (yalnız şəkil üzərində) */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.38),rgb(0_0_0/0)_40%,rgb(0_0_0/0.45))]" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 lg:p-6">
            <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-full bg-white/90 py-1.5 pl-1.5 pr-4 text-[#172b45] shadow-sm" aria-label="205 nömrəli məktəb — ana səhifə">
              <Image src="/assets/logo/logo-128.webp" alt="" width={32} height={32} className="size-8 shrink-0" />
              <span className="truncate font-display text-sm font-bold">205 nömrəli məktəb</span>
            </Link>
            <ThemeToggle className="shrink-0 bg-white/90 text-[#172b45] shadow-sm hover:bg-white hover:text-[#172b45]" />
          </div>
          <div className="absolute inset-x-0 bottom-0 hidden p-10 text-white lg:block">
            <p className="max-w-md font-display text-3xl font-bold leading-tight">Elektron jurnal və şəxsi kabinet</p>
            <p className="mt-2 max-w-md text-white/85">Şagirdlər, valideynlər, müəllimlər və məktəb rəhbərliyi üçün vahid giriş.</p>
          </div>
        </div>
      </div>

      <main
        id="main"
        className="login-sheet relative -mt-7 min-h-[calc(62svh+1.75rem)] rounded-t-[28px] bg-surface px-6 pb-12 pt-3 shadow-[0_-12px_32px_-20px_rgb(0_0_0/0.35)] lg:mt-0 lg:flex lg:min-h-0 lg:items-center lg:justify-center lg:rounded-none lg:px-12 lg:shadow-none"
      >
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-line-strong lg:hidden" aria-hidden="true" />
          <LoginForm next={safeNext} />
        </div>
      </main>
    </div>
  );
}
