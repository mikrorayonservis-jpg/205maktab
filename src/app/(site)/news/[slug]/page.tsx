import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Eye, PenLine, Tag } from "lucide-react";
import { incrementViews, publishedArticle, publishedNews } from "@/server/news";
import { publicGallery } from "@/server/content";
import { Breadcrumbs, JsonLd, NewsCard } from "@/components/site/parts";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { renderMarkdown, plainText } from "@/lib/markdown";
import { formatDateLong } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,300}$/.test(slug)) return null;
  return publishedArticle(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load(params);
  if (!a) return { title: "Xəbər tapılmadı" };
  const description = a.seo_description || a.summary || plainText(a.content, 160);
  return {
    title: a.seo_title || a.title,
    description,
    alternates: { canonical: `/news/${a.slug}` },
    openGraph: { type: "article", title: a.title, description, publishedTime: a.published_at, images: a.cover_image ? [{ url: a.cover_image }] : undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load(params);
  if (!a) notFound();
  await incrementViews(a.id).catch(() => undefined);
  const [related, gallery] = await Promise.all([
    publishedNews({ category: a.category_slug ?? undefined, pageSize: 3, excludeId: a.id }),
    a.gallery_id ? publicGallery(Number(a.gallery_id)) : Promise.resolve(null),
  ]);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const meta = [
    ...(a.byline ? [{ Icon: PenLine, label: "Müəllif", value: a.byline }] : []),
    ...(a.category_name ? [{ Icon: Tag, label: "Bölmə", value: <Link href={`/news?category=${a.category_slug}`} className="hover:text-primary">{a.category_name}</Link> }] : []),
    { Icon: Eye, label: "Baxış", value: Number(a.views) + 1 },
  ];
  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: a.title,
          datePublished: String(a.published_at).replace(" ", "T") + "+04:00",
          dateModified: String(a.updated_at).replace(" ", "T") + "+04:00",
          image: a.cover_image ? [`${site}${a.cover_image}`] : undefined,
          author: a.byline ? { "@type": "Person", name: a.byline } : undefined,
          publisher: { "@type": "EducationalOrganization", name: "205 nömrəli tam orta ümumtəhsil məktəbi", logo: { "@type": "ImageObject", url: `${site}/assets/logo/logo-512.webp` } },
          mainEntityOfPage: `${site}/news/${a.slug}`,
        }}
      />
      <header className="border-b border-line bg-surface">
        <div className="container-page max-w-5xl pb-10 pt-8 md:pb-14 md:pt-12">
          <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, { href: "/news", label: "Xəbərlər" }, ...(a.category_name ? [{ href: `/news?category=${a.category_slug}`, label: a.category_name }] : [])]} />
          {a.category_name && (
            <p className="mb-4"><span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-primary">{a.category_name}</span></p>
          )}
          <h1 className="max-w-4xl font-display text-[clamp(1.75rem,1.25rem+2.2vw,2.9rem)] font-extrabold leading-[1.12] tracking-tight">{a.title}</h1>
          {a.summary && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-2 md:text-xl">{a.summary}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-3">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" /><time dateTime={a.published_at}>{formatDateLong(a.published_at)}</time></span>
            {a.byline && <span className="inline-flex items-center gap-1.5"><PenLine className="size-4" aria-hidden="true" />{a.byline}</span>}
            <span className="inline-flex items-center gap-1.5"><Eye className="size-4" aria-hidden="true" /><span className="sr-only">Baxış sayı:</span>{Number(a.views) + 1}</span>
          </div>
        </div>
      </header>

      <div className="container-page max-w-5xl">
        {a.cover_image && (
          <figure className="-mt-px overflow-hidden rounded-b-2xl bg-surface-2 sm:mt-8 sm:rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.cover_image} alt={a.cover_alt || a.title} className="max-h-[38rem] w-full object-cover" />
            {a.cover_alt && <figcaption className="border-x border-b border-line bg-surface px-4 py-2.5 text-sm text-ink-3 sm:rounded-b-2xl">{a.cover_alt}</figcaption>}
          </figure>
        )}
        <div className="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
          <div className="min-w-0">
            <div className="prose-az max-w-[68ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content) }} />
            {gallery && gallery.images.length > 0 && (
              <section className="mt-12 border-t border-line pt-10" aria-labelledby="gal-h">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="gal-h" className="font-display text-xl font-bold">Fotolar</h2>
                  <Link href={`/gallery/${gallery.slug}`} className="text-sm font-semibold text-primary hover:underline">Albomu aç</Link>
                </div>
                <GalleryGrid images={gallery.images} />
              </section>
            )}
            <Link href="/news" className="mt-12 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
              <ArrowLeft className="size-4" aria-hidden="true" /> Bütün xəbərlər
            </Link>
          </div>
          <aside className="hidden lg:block" aria-label="Xəbər haqqında">
            <dl className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-5 border-l-2 border-gold pl-5">
              {meta.map(({ Icon, label, value }) => (
                <div key={label}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3"><Icon className="size-3.5" aria-hidden="true" />{label}</dt>
                  <dd className="mt-1 text-[15px] font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>

      {related.rows.length > 0 && (
        <aside className="border-t border-line bg-surface" aria-labelledby="related-h">
          <div className="container-page section">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <h2 id="related-h" className="t-section">Digər xəbərlər</h2>
              <Link href={a.category_slug ? `/news?category=${a.category_slug}` : "/news"} className="text-[15px] font-semibold text-primary hover:underline">Bu bölmədən daha çox</Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">{related.rows.map((n) => <li key={n.id}><NewsCard item={n} /></li>)}</ul>
          </div>
        </aside>
      )}
    </article>
  );
}
