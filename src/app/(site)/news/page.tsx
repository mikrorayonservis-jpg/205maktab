import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LayoutGrid, Newspaper } from "lucide-react";
import { newsCategories, publishedNews, publishedNewsYears } from "@/server/news";
import { NewsSearch } from "@/components/site/NewsSearch";
import { ChipLink, ChipRow, NewsCard, PageHero } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";

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
      <PageHero
        title={active ? active.name_az : "Xəbərlər"}
        subtitle="“Təhsilimiz – gələcəyimizdir!”"
        crumbs={[{ href: active ? "/news" : undefined, label: "Xəbərlər" }, ...(active ? [{ label: active.name_az }] : [])]}
      />
      <div className="sheet">
        <div className="container-page pb-4 pt-8 md:pt-10">
          <div id="axtaris" className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <ChipRow label="Kateqoriyalar" className="min-w-0">
              <ChipLink href={catHref()} active={!category}><LayoutGrid className="size-4" aria-hidden="true" />Hamısı</ChipLink>
              {cats.map((c) => (
                <ChipLink key={c.id} href={catHref(c.slug)} active={category === c.slug}>{c.name_az}</ChipLink>
              ))}
            </ChipRow>
            <Suspense>
              <NewsSearch years={years} />
            </Suspense>
          </div>
          {filtered && (
            <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface px-4 py-3 text-sm text-ink-2 ring-1 ring-line" aria-live="polite">
              <span className="font-semibold text-ink">{data.total ? `${data.total} xəbər tapıldı` : "Heç nə tapılmadı"}</span>
              {q && <span>— «<span className="font-medium text-ink">{q}</span>»</span>}
              {year && <span>· {year}</span>}
              <Link href={category ? `/news?category=${category}` : "/news"} className="ml-auto font-semibold text-primary hover:underline">Filtrləri sıfırla</Link>
            </p>
          )}
          {data.rows.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {data.rows.map((n) => <li key={n.id}><NewsCard item={n} /></li>)}
            </ul>
          ) : (
            <EmptyState title={filtered ? "Axtarışa uyğun xəbər tapılmadı" : "Bu bölmədə hələ xəbər yoxdur"} icon={<Newspaper />}>
              {filtered ? "Başqa söz yazın və ya filtrləri sıfırlayın." : undefined}
            </EmptyState>
          )}
          <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={href} />
        </div>
      </div>
    </>
  );
}
