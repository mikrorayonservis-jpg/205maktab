import type { Metadata } from "next";
import Link from "next/link";
import { Images, PlayCircle } from "lucide-react";
import { galleryFilters, publicGalleries } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Qalereya", description: "Məktəb tədbirlərindən foto və video albomlar.", alternates: { canonical: "/gallery" } };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ kateqoriya?: string; il?: string; page?: string }> }) {
  const sp = await searchParams;
  const year = sp.il && /^\d{4}$/.test(sp.il) ? Number(sp.il) : undefined;
  const category = sp.kateqoriya?.slice(0, 100) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [filters, data] = await Promise.all([galleryFilters(), publicGalleries({ category, year, page })]);
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { kateqoriya: category, il: year ? String(year) : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return `/gallery${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1.5 text-sm", active ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2");
  return (
    <>
      <PageIntro eyebrow="Media" title="Foto və video qalereya" crumbs={[{ label: "Qalereya" }]}>
        Yetkinlik yaşına çatmayan şagirdlərin təsvirləri yalnız valideyn razılığı olduqda dərc edilir.
      </PageIntro>
      <div className="container-page py-10">
        <div className="mb-8 space-y-3">
          {filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Kateqoriya">
              <Link href={qs({ kateqoriya: undefined, page: undefined })} className={chip(!category)}>Bütün kateqoriyalar</Link>
              {filters.categories.map((c) => <Link key={c} href={qs({ kateqoriya: c, page: undefined })} className={chip(category === c)}>{c}</Link>)}
            </div>
          )}
          {filters.years.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="İl">
              <Link href={qs({ il: undefined, page: undefined })} className={chip(!year)}>Bütün illər</Link>
              {filters.years.map((y) => <Link key={y} href={qs({ il: String(y), page: undefined })} className={chip(year === y)}>{y}</Link>)}
            </div>
          )}
        </div>
        {data.rows.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((g) => (
              <li key={g.id}>
                <Link href={`/gallery/${g.slug}`} className="group block overflow-hidden rounded-lg border border-line bg-surface">
                  <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                    {g.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cover_image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-ink-3"><Images className="size-10" aria-hidden="true" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-display text-lg font-semibold group-hover:text-primary">{g.title_az}</h2>
                    <p className="mt-1 flex flex-wrap gap-3 text-xs text-ink-3">
                      {g.event_date && <span>{formatDate(g.event_date)}</span>}
                      <span className="inline-flex items-center gap-1"><Images className="size-3.5" aria-hidden="true" />{g.image_count} foto</span>
                      {g.video_count > 0 && <span className="inline-flex items-center gap-1"><PlayCircle className="size-3.5" aria-hidden="true" />{g.video_count} video</span>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Albom tapılmadı" icon={<Images className="size-8" />} />
        )}
        <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(p) => qs({ page: String(p) })} />
      </div>
    </>
  );
}
