import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { newsCategories, publishedNews, publishedNewsYears } from "@/server/news";
import { NewsSearch } from "@/components/site/NewsSearch";
import { NewsCard, PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Xəbərlər", description: "Məktəb xəbərləri, rəsmi elanlar, olimpiadalar və şagird nailiyyətləri.", alternates: { canonical: "/news" } };

type SP = Promise<{ category?: string; q?: string; page?: string; year?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = sp.category && /^[a-z0-9-]{1,190}$/.test(sp.category) ? sp.category : undefined;
  const q = sp.q?.replace(/\s+/g, " ").trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const year = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : undefined;
  const [cats, years, data] = await Promise.all([newsCategories(), publishedNewsYears(), publishedNews({ category, q, year, page, pageSize: 12 })]);
  const filtered = Boolean(q || year);
  // Kateqoriya keçidləri axtarış və il filtrini saxlayır
  const catHref = (slug?: string) => {
    const u = new URLSearchParams();
    if (slug) u.set("category", slug);
    if (q) u.set("q", q);
    if (year) u.set("year", String(year));
    const s = u.toString();
    return `/news${s ? `?${s}` : ""}`;
  };
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (category) u.set("category", category);
    if (q) u.set("q", q);
    if (year) u.set("year", String(year));
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/news${s ? `?${s}` : ""}`;
  };
  const active = cats.find((c) => c.slug === category);
  return (
    <>
      <PageIntro eyebrow="Media" title={active ? active.name_az : "Xəbərlər"} crumbs={[{ href: active ? "/news" : undefined, label: "Xəbərlər" }, ...(active ? [{ label: active.name_az }] : [])]} />
      <div className="container-page py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Kateqoriyalar" className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
            <Link href={catHref()} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", !category ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2")}>Hamısı</Link>
            {cats.map((c) => (
              <Link key={c.id} href={catHref(c.slug)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", category === c.slug ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2")}>
                {c.name_az}
              </Link>
            ))}
          </nav>
          <Suspense>
            <NewsSearch years={years} />
          </Suspense>
        </div>
        {filtered && (
          <p className="mb-5 text-sm text-ink-3" aria-live="polite">
            {data.total ? `${data.total} xəbər tapıldı` : "Heç nə tapılmadı"}
            {q && <> — «<span className="font-medium text-ink">{q}</span>»</>}
            {year && <> · {year}</>}
            {" · "}<Link href={category ? `/news?category=${category}` : "/news"} className="text-primary hover:underline">Filtrləri sıfırla</Link>
          </p>
        )}
        {data.rows.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((n) => <li key={n.id}><NewsCard item={n} /></li>)}
          </ul>
        ) : (
          <EmptyState title={filtered ? "Axtarışa uyğun xəbər tapılmadı" : "Bu bölmədə hələ xəbər yoxdur"}>{filtered ? "Başqa söz yazın və ya filtrləri sıfırlayın." : undefined}</EmptyState>
        )}
        <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={href} />
      </div>
    </>
  );
}
