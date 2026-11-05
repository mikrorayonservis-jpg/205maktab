import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Newspaper } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[80vh] items-center bg-bg py-16">
      <div className="container-page flex flex-col items-center text-center">
        <Image src="/assets/logo/logo-128.webp" alt="" width={72} height={72} className="size-[4.5rem] object-contain" />
        <p className="mt-8 font-display text-7xl font-extrabold tracking-tight text-band dark:text-ink md:text-8xl">404</p>
        <div className="rule-gold mt-5" aria-hidden="true" />
        <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">Səhifə tapılmadı</h1>
        <p className="mt-3 max-w-md text-ink-2">Axtardığınız səhifə mövcud deyil, köçürülüb və ya ona baxmaq üçün icazəniz yoxdur.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-5 text-[15px] font-semibold text-navy-ink hover:bg-navy-hover">
            <ArrowLeft className="size-4" aria-hidden="true" /> Ana səhifə
          </Link>
          <Link href="/news" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-[15px] font-semibold hover:border-primary hover:text-primary">
            <Newspaper className="size-4" aria-hidden="true" /> Xəbərlər
          </Link>
          <Link href="/dashboard" className="inline-flex h-12 items-center rounded-xl px-3 text-[15px] font-semibold text-primary hover:underline">Kabinet</Link>
        </div>
      </div>
    </main>
  );
}
