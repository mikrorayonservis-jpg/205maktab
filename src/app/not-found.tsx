import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Səhifə tapılmadı</h1>
      <p className="mt-2 max-w-md text-ink-3">Axtardığınız səhifə mövcud deyil, köçürülüb və ya ona baxmaq üçün icazəniz yoxdur.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">Ana səhifə</Link>
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium">Kabinet</Link>
      </div>
    </main>
  );
}
