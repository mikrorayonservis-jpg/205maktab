import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { EVENT_STATUS, publicEvent, publicGallery } from "@/server/content";
import { Breadcrumbs, JsonLd } from "@/components/site/parts";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { renderMarkdown, plainText } from "@/lib/markdown";
import { MONTHS_AZ, formatDateLong, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const STATUS_TONE: Record<string, string> = {
  planned: "bg-white/12 text-white",
  ongoing: "bg-[#12703f] text-white",
  completed: "bg-white/12 text-white/85",
  cancelled: "bg-[#b42318] text-white",
};

export default async function EventPage({ params }: Props) {
  const e = await load(params);
  if (!e) notFound();
  const gallery = e.gallery_id ? await publicGallery(Number(e.gallery_id)) : null;
  const iso = (v: string) => v.replace(" ", "T") + "+04:00";
  const [, m, d] = e.start_datetime.slice(0, 10).split("-");
  const time = `${formatTime(e.start_datetime)}${e.end_datetime ? ` – ${formatTime(e.end_datetime)}` : ""}`;
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
      <header className="border-b border-line bg-surface">
        <div className="container-page pb-10 pt-8 md:pb-12 md:pt-12">
          <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, { href: "/events", label: "Tədbirlər" }, { label: e.title }]} />
          <p className="eyebrow mb-3">Tədbir</p>
          <h1 className="max-w-4xl font-display text-[clamp(1.75rem,1.25rem+2.2vw,2.75rem)] font-extrabold leading-[1.12] tracking-tight">{e.title}</h1>
        </div>
      </header>
      <div className="container-page grid gap-10 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <aside className="lg:order-2" aria-label="Tədbir məlumatı">
          <div className="overflow-hidden rounded-2xl bg-band text-band-ink lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <div className="flex items-center gap-4 border-b border-white/10 p-5">
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center rounded-xl border-t-[3px] border-gold bg-white/10 py-2.5" aria-hidden="true">
                <span className="font-display text-3xl font-extrabold leading-none">{Number(d)}</span>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-band-muted">{MONTHS_AZ[Number(m) - 1]?.slice(0, 3)}</span>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONE[e.status] ?? STATUS_TONE.planned)}>{EVENT_STATUS[e.status] ?? e.status}</span>
            </div>
            <dl className="space-y-4 p-5 text-[15px]">
              <Row icon={<CalendarDays />} label="Tarix"><time dateTime={e.start_datetime}>{formatDateLong(e.start_datetime)}</time></Row>
              <Row icon={<Clock />} label="Vaxt">{time}</Row>
              {e.location && <Row icon={<MapPin />} label="Məkan">{e.location}</Row>}
              {e.participants && <Row icon={<Users />} label="İştirakçılar"><span className="whitespace-pre-line">{e.participants}</span></Row>}
            </dl>
          </div>
        </aside>
        <div className="min-w-0 lg:order-1">
          {e.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.cover_image} alt="" className="mb-8 max-h-[32rem] w-full rounded-2xl border border-line object-cover" />
          )}
          {e.description ? (
            <div className="prose-az max-w-[68ch]" dangerouslySetInnerHTML={{ __html: renderMarkdown(e.description) }} />
          ) : (
            <p className="text-ink-3">Təsvir əlavə edilməyib.</p>
          )}
          {gallery && gallery.images.length > 0 && (
            <section className="mt-12 border-t border-line pt-10" aria-labelledby="ev-gal-h">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="ev-gal-h" className="font-display text-xl font-bold">Tədbirdən fotolar</h2>
                <Link href={`/gallery/${gallery.slug}`} className="text-sm font-semibold text-primary hover:underline">Albomu aç</Link>
              </div>
              <GalleryGrid images={gallery.images} />
            </section>
          )}
          <Link href="/events" className="mt-12 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Tədbirlər təqvimi
          </Link>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-gold [&_svg]:size-[18px]" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-band-muted">{label}</dt>
        <dd className="mt-0.5 font-medium text-white">{children}</dd>
      </div>
    </div>
  );
}
