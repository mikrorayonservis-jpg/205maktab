import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, Images, PlayCircle } from "lucide-react";
import { publicGallery } from "@/server/content";
import { Breadcrumbs } from "@/components/site/parts";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { EmptyState } from "@/components/ui/Feedback";
import { formatDateLong } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  return /^[a-z0-9-]{1,255}$/.test(slug) ? publicGallery(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load(params);
  if (!g) return { title: "Albom tapılmadı" };
  return {
    title: g.title_az,
    description: g.description_az?.slice(0, 160) || `${g.title_az} — fotoalbom`,
    alternates: { canonical: `/gallery/${g.slug}` },
    openGraph: { images: g.images[0] ? [{ url: g.images[0].image_url }] : undefined },
  };
}

export default async function AlbumPage({ params }: Props) {
  const g = await load(params);
  if (!g) notFound();
  const cover = g.images[0];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-band text-band-ink" aria-labelledby="album-title">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_100%_0%,rgb(16_82_201/0.45),transparent_60%)]" aria-hidden="true" />
        <div className="container-page grid gap-8 pb-14 pt-7 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end md:pb-20 md:pt-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:pb-24">
          <div className="min-w-0">
            <Breadcrumbs tone="dark" items={[{ href: "/", label: "Ana səhifə" }, { href: "/gallery", label: "Qalereya" }, { label: g.title_az }]} />
            {g.category_az && (
              <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"><Camera className="size-3.5" aria-hidden="true" />{g.category_az}</p>
            )}
            <h1 id="album-title" className="t-page max-w-3xl text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">{g.title_az}</h1>
            <div className="rule-gold mt-4" aria-hidden="true" />
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-band-muted">
              {g.event_date && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" /><time dateTime={g.event_date}>{formatDateLong(g.event_date)}</time></span>}
              <span className="inline-flex items-center gap-1.5"><Images className="size-4" aria-hidden="true" />{g.images.length} foto</span>
              {g.videos.length > 0 && <span className="inline-flex items-center gap-1.5"><PlayCircle className="size-4" aria-hidden="true" />{g.videos.length} video</span>}
            </p>
            {g.description_az && <p className="mt-5 max-w-2xl whitespace-pre-line leading-relaxed text-white/85">{g.description_az}</p>}
          </div>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.image_url} alt="" className="hidden aspect-[4/3] w-full rotate-[1.5deg] rounded-2xl border-4 border-white/90 object-cover shadow-2xl md:block" />
          )}
        </div>
      </section>
      <div className="sheet">
        <div className="container-page space-y-12 pb-4 pt-8 md:pt-10">
          {g.images.length > 0 && (
            <section aria-label="Fotolar">
              <GalleryGrid images={g.images} feature />
            </section>
          )}
          {g.videos.length > 0 && (
            <section aria-labelledby="videos-h">
              <h2 id="videos-h" className="mb-5 font-display text-xl font-bold">Videolar</h2>
              <ul className="grid gap-6 md:grid-cols-2">
                {g.videos.map((v) => (
                  <li key={v.id}>
                    <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-black">
                      <iframe
                        src={v.provider === "youtube" ? `https://www.youtube-nocookie.com/embed/${v.video_id}` : `https://player.vimeo.com/video/${v.video_id}?dnt=1`}
                        title={v.title_az || "Video"}
                        loading="lazy"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="size-full"
                      />
                    </div>
                    {v.title_az && <p className="mt-2.5 text-sm font-semibold">{v.title_az}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!g.images.length && !g.videos.length && <EmptyState title="Albom hələ boşdur" icon={<Images />} />}
          <Link href="/gallery" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Bütün albomlar
          </Link>
        </div>
      </div>
    </>
  );
}
