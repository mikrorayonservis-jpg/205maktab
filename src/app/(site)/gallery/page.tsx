import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarRange, Images, LayoutGrid, ShieldCheck } from "lucide-react";
import { galleryFilters, publicGalleries } from "@/server/content";
import { UrlSearch } from "@/components/site/NewsSearch";
import { ChipLink, ChipRow, GalleryCard, PageHero } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Qalereya", description: "Məktəb tədbirlərindən foto və video albomlar.", alternates: { canonical: "/gallery" } };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ kateqoriya?: string; il?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const year = sp.il && /^\d{4}$/.test(sp.il) ? Number(sp.il) : undefined;
  const category = sp.kateqoriya?.slice(0, 100) || undefined;
  const q = sp.q?.replace(/\s+/g, " ").trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const [filters, data] = await Promise.all([galleryFilters(), publicGalleries({ category, year, q, page })]);
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { kateqoriya: category, il: year ? String(year) : undefined, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return `/gallery${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(category || year || q);
  return (
    <>
      <PageHero
        title="Foto və video qalereya"
        crumbs={[{ label: "Qalereya" }]}
        subtitle={
          <p className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden="true" />
            <span>Yetkinlik yaşına çatmayan şagirdlərin təsvirləri yalnız valideyn razılığı olduqda dərc edilir.</span>
          </p>
        }
      />
      <div className="sheet">
        <div className="container-page pb-4 pt-8 md:pt-10">
          <div className="mb-8 grid gap-4 lg:mb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
            <div className="space-y-3">
              {filters.categories.length > 0 && (
                <ChipRow label="Kateqoriya">
                  <ChipLink href={qs({ kateqoriya: undefined, page: undefined })} active={!category}><LayoutGrid className="size-4" aria-hidden="true" />Bütün kateqoriyalar</ChipLink>
                  {filters.categories.map((c) => <ChipLink key={c} href={qs({ kateqoriya: c, page: undefined })} active={category === c}>{c}</ChipLink>)}
                </ChipRow>
              )}
              {filters.years.length > 0 && (
                <ChipRow label="İl">
                  <ChipLink href={qs({ il: undefined, page: undefined })} active={!year}><CalendarRange className="size-4" aria-hidden="true" />Bütün illər</ChipLink>
                  {filters.years.map((y) => <ChipLink key={y} href={qs({ il: String(y), page: undefined })} active={year === y}>{y}</ChipLink>)}
                </ChipRow>
              )}
            </div>
            <Suspense>
              <UrlSearch id="gallery-q" label="Albomlarda axtarış" placeholder="Axtarış edin..." />
            </Suspense>
          </div>
          {filtered && (
            <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface px-4 py-3 text-sm text-ink-2 ring-1 ring-line" aria-live="polite">
              <span className="font-semibold text-ink">{data.total ? `${data.total} albom` : "Albom tapılmadı"}</span>
              {q && <span>— «<span className="font-medium text-ink">{q}</span>»</span>}
              <Link href="/gallery" className="ml-auto font-semibold text-primary hover:underline">Filtrləri sıfırla</Link>
            </p>
          )}
          {data.rows.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {data.rows.map((g, i) => <li key={g.id}><GalleryCard g={g} priority={i < 3} /></li>)}
            </ul>
          ) : (
            <EmptyState title="Albom tapılmadı" icon={<Images />}>{filtered ? "Başqa filtr seçin və ya axtarış sözünü dəyişin." : "Albomlar dərc olunduqdan sonra burada görünəcək."}</EmptyState>
          )}
          <Pagination page={data.page} total={data.total} pageSize={data.pageSize} href={(p) => qs({ page: String(p) })} />
        </div>
      </div>
    </>
  );
}
