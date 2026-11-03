import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicGallery } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { formatDateLong } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  return /^[a-z0-9-]{1,255}$/.test(slug) ? publicGallery(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load(params);
  if (!g) return { title: "Albom tapılmadı" };
  return { title: g.title_az, description: g.description_az?.slice(0, 160), alternates: { canonical: `/gallery/${g.slug}` } };
}

export default async function AlbumPage({ params }: Props) {
  const g = await load(params);
  if (!g) notFound();
  return (
    <>
      <PageIntro eyebrow={g.category_az ?? "Albom"} title={g.title_az} crumbs={[{ href: "/gallery", label: "Qalereya" }, { label: g.title_az }]}>
        {g.event_date && <p>{formatDateLong(g.event_date)}</p>}
        {g.description_az && <p className="mt-2 whitespace-pre-line">{g.description_az}</p>}
      </PageIntro>
      <div className="container-page space-y-10 py-10">
        {g.images.length > 0 && <GalleryGrid images={g.images} />}
        {g.videos.length > 0 && (
          <section aria-labelledby="videos-h">
            <h2 id="videos-h" className="mb-4 text-xl font-semibold">Videolar</h2>
            <ul className="grid gap-6 md:grid-cols-2">
              {g.videos.map((v) => (
                <li key={v.id}>
                  <div className="aspect-video overflow-hidden rounded-lg border border-line bg-black">
                    <iframe
                      src={v.provider === "youtube" ? `https://www.youtube-nocookie.com/embed/${v.video_id}` : `https://player.vimeo.com/video/${v.video_id}?dnt=1`}
                      title={v.title_az || "Video"}
                      loading="lazy"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="size-full"
                    />
                  </div>
                  {v.title_az && <p className="mt-2 text-sm font-medium">{v.title_az}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!g.images.length && !g.videos.length && <p className="text-ink-3">Albom hələ boşdur.</p>}
      </div>
    </>
  );
}
