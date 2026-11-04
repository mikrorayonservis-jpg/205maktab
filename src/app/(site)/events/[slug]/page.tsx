import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { EVENT_STATUS, publicEvent, publicGallery } from "@/server/content";
import { JsonLd, PageIntro } from "@/components/site/parts";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { Badge } from "@/components/ui/Feedback";
import { renderMarkdown, plainText } from "@/lib/markdown";
import { formatDateLong, formatTime } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  const { slug } = await params;
  return /^[a-z0-9-]{1,300}$/.test(slug) ? publicEvent(slug) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await load(params);
  if (!e) return { title: "Tədbir tapılmadı" };
  return { title: e.title, description: plainText(e.description, 160), alternates: { canonical: `/events/${e.slug}` }, openGraph: { images: e.cover_image ? [{ url: e.cover_image }] : undefined } };
}

export default async function EventPage({ params }: Props) {
  const e = await load(params);
  if (!e) notFound();
  const gallery = e.gallery_id ? await publicGallery(Number(e.gallery_id)) : null;
  const iso = (v: string) => v.replace(" ", "T") + "+04:00";
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.title,
          startDate: iso(e.start_datetime),
          endDate: e.end_datetime ? iso(e.end_datetime) : undefined,
          eventStatus: e.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          location: { "@type": "Place", name: e.location || "205 nömrəli tam orta ümumtəhsil məktəbi", address: "Bakı" },
          description: plainText(e.description, 300),
        }}
      />
      <PageIntro eyebrow="Tədbir" title={e.title} crumbs={[{ href: "/events", label: "Tədbirlər" }, { label: e.title }]} />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {e.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.cover_image} alt="" className="mb-8 w-full rounded-lg border border-line" />
          )}
          {e.description ? <div className="prose-az max-w-[68ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(e.description) }} /> : <p className="text-ink-3">Təsvir əlavə edilməyib.</p>}
          {gallery && gallery.images.length > 0 && (
            <section className="mt-10"><h2 className="mb-4 text-xl font-semibold">Tədbirdən fotolar</h2><GalleryGrid images={gallery.images} /></section>
          )}
        </div>
        <aside className="h-fit space-y-4 rounded-lg border border-line bg-surface p-5 text-sm">
          <Badge tone={e.status === "cancelled" ? "danger" : e.status === "completed" ? "neutral" : "accent"}>{EVENT_STATUS[e.status]}</Badge>
          <p className="flex gap-2"><CalendarDays className="size-4 shrink-0 text-ink-3" aria-hidden="true" /><span>{formatDateLong(e.start_datetime)}, {formatTime(e.start_datetime)}{e.end_datetime && ` – ${formatTime(e.end_datetime)}`}</span></p>
          {e.location && <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-ink-3" aria-hidden="true" />{e.location}</p>}
          {e.participants && <p className="flex gap-2"><Users className="size-4 shrink-0 text-ink-3" aria-hidden="true" /><span className="whitespace-pre-line">{e.participants}</span></p>}
        </aside>
      </div>
    </>
  );
}
