import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
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
          publisher: { "@type": "EducationalOrganization", name: "205 nömrəli tam orta məktəb", logo: { "@type": "ImageObject", url: `${site}/assets/logo/logo-512.webp` } },
          mainEntityOfPage: `${site}/news/${a.slug}`,
        }}
      />
      <header className="border-b border-line bg-surface">
        <div className="container-page max-w-4xl py-10">
          <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, { href: "/news", label: "Xəbərlər" }, ...(a.category_name ? [{ href: `/news?category=${a.category_slug}`, label: a.category_name }] : [])]} />
          <h1 className="text-3xl font-semibold leading-tight md:text-[2.6rem]">{a.title}</h1>
          {a.summary && <p className="mt-4 text-lg leading-relaxed text-ink-2">{a.summary}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
            <time dateTime={a.published_at}>{formatDateLong(a.published_at)}</time>
            {a.byline && <span>Müəllif: <span className="text-ink-2">{a.byline}</span></span>}
            <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden="true" /> {Number(a.views) + 1}</span>
          </div>
        </div>
      </header>
      <div className="container-page max-w-4xl py-10">
        {a.cover_image && (
          <figure className="mb-8 overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.cover_image} alt={a.cover_alt || a.title} className="w-full" />
            {a.cover_alt && <figcaption className="bg-surface px-4 py-2 text-sm text-ink-3">{a.cover_alt}</figcaption>}
          </figure>
        )}
        <div className="prose-az mx-auto max-w-[68ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content) }} />
        {gallery && gallery.images.length > 0 && (
          <section className="mt-12" aria-labelledby="gal-h">
            <h2 id="gal-h" className="mb-4 text-xl font-semibold">Fotolar</h2>
            <GalleryGrid images={gallery.images} />
          </section>
        )}
      </div>
      {related.rows.length > 0 && (
        <aside className="border-t border-line bg-surface" aria-labelledby="related-h">
          <div className="container-page py-12">
            <h2 id="related-h" className="mb-6 text-2xl font-semibold">Digər xəbərlər</h2>
            <ul className="grid gap-6 md:grid-cols-3">{related.rows.map((n) => <li key={n.id}><NewsCard item={n} /></li>)}</ul>
          </div>
        </aside>
      )}
    </article>
  );
}
