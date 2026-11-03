import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { newsCategories, publishedNews } from "@/server/news";
import { NewsCard, PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Xəbərlər", description: "Məktəb xəbərləri, rəsmi elanlar, olimpiadalar və şagird nailiyyətləri.", alternates: { canonical: "/news" } };

type SP = Promise<{ category?: string; q?: string; page?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = sp.category && /^[a-z0-9-]{1,190}$/.test(sp.category) ? sp.category : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const [cats, data] = await Promise.all([newsCategories(), publishedNews({ category, q, page, pageSize: 12 })]);
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (category) u.set("category", category);
    if (q) u.set("q", q);
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
          <nav aria-label="Kateqoriyalar" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Link href="/news" className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", !category ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2")}>Hamısı</Link>
            {cats.map((c) => (
              <Link key={c.id} href={`/news?category=${c.slug}`} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", category === c.slug ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2")}>
                {c.name_az}
              </Link>
            ))}
          </nav>
          <form action="/news" role="search" className="relative w-full lg:w-72">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="news-q" className="sr-only">Xəbərlərdə axtar</label>
            <input id="news-q" name="q" defaultValue={q} placeholder="Xəbərlərdə axtar..." className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          </form>
        </div>
        {data.rows.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((n) => <li key={n.id}><NewsCard item={n} /></li>)}
          </ul>
        ) : (
          <EmptyState title={q ? "Axtarışa uyğun xəbər tapılmadı" : "Bu bölmədə hələ xəbər yoxdur"} />
        )}
        <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={href} />
      </div>
    </>
  );
}
