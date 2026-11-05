import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Camera, ChevronRight, Clock, Home, Images, MapPin, PlayCircle } from "lucide-react";
import { formatDate, formatDateLong, formatTime, MONTHS_AZ, WEEKDAYS_AZ, isoWeekday } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { PublicNews } from "@/server/news";
import type { PublicEvent } from "@/server/content";

/* ─────────────────────────── Bölmə başlığı ─────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  id,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-10", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className={cn("eyebrow mb-3", dark && "text-gold")}>{eyebrow}</p>}
        <h2 id={id} className={cn("t-section", dark ? "text-band-ink" : "text-ink")}>{title}</h2>
        {description && <div className={cn("mt-3 text-[1.0625rem] leading-relaxed", dark ? "text-band-muted" : "text-ink-2")}>{description}</div>}
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold",
            dark ? "text-band-ink hover:text-gold" : "text-primary hover:text-primary-hover"
          )}
        >
          {linkLabel ?? "Hamısı"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────── Naviqasiya zənciri ─────────────────────────── */

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items, tone = "light" }: { items: Crumb[]; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <nav aria-label="Naviqasiya zənciri" className={cn("mb-5 text-sm", dark ? "text-band-muted" : "text-ink-3")}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />}
            {it.href ? (
              <Link href={it.href} className={cn("inline-flex items-center gap-1.5 hover:underline", dark ? "hover:text-band-ink" : "hover:text-primary")}>
                {i === 0 && <Home className="size-3.5 shrink-0" aria-hidden="true" />}
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className={cn("line-clamp-1 font-medium", dark ? "text-band-ink" : "text-ink-2")}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const HOME_CRUMB: Crumb = { href: "/", label: "Ana səhifə" };

/* ─────────────────────────── Səhifə başlıqları ───────────────────────────
   PageHero: əsas bölmələr üçün (məktəb binasının real fotosu + tünd göy örtük).
   PageIntro: daxili/ikinci dərəcəli səhifələr üçün sakit, açıq fonlu başlıq. */

export function PageHero({
  title,
  subtitle,
  crumbs,
  children,
  compact = false,
  imagePosition = "50% 64%",
}: {
  title: string;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  children?: ReactNode;
  compact?: boolean;
  imagePosition?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-band text-band-ink" aria-labelledby="page-title">
      <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[66%]">
        <Image
          src="/assets/images/mekteb-bina-1438.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover"
          style={{ objectPosition: imagePosition }}
        />
      </div>
      <div className="hero-veil absolute inset-0 -z-10" aria-hidden="true" />
      <div className={cn("container-page pt-7 md:pt-10", compact ? "pb-12 md:pb-16 lg:pb-20" : "pb-14 md:pb-20 lg:pb-24")}>
        {crumbs && <Breadcrumbs tone="dark" items={[HOME_CRUMB, ...crumbs]} />}
        <h1 id="page-title" className="t-page max-w-3xl text-band-ink">{title}</h1>
        <div className="rule-gold mt-4 md:mt-5" aria-hidden="true" />
        {subtitle && <div className="mt-4 max-w-xl text-base leading-relaxed text-band-muted md:text-lg">{subtitle}</div>}
        {children}
      </div>
    </section>
  );
}

export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page py-8 md:py-12">
        {crumbs && <Breadcrumbs items={[HOME_CRUMB, ...crumbs]} />}
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="t-page max-w-4xl text-[clamp(1.75rem,1.3rem+1.9vw,2.6rem)]">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Şəkil yeri tutucusu ─────────────────────────── */

/** Şəkli olmayan material üçün sakit yer tutucu: məktəbin loqosu (təsadüfi foto yox). */
export function ImagePlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-soft to-surface-2", className)}>
      <Image src="/assets/logo/logo-128.webp" alt="" width={64} height={64} className="size-14 object-contain opacity-60 grayscale-[35%]" />
      {label && <span className="text-xs font-medium text-ink-3">{label}</span>}
    </div>
  );
}

/** Foto üzərində oxunaqlı qalan nişanlar (rəngləri hər iki rejimdə sabitdir). */
const PHOTO_DATE = "inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14213d] shadow-sm";
const PHOTO_BADGE = "inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded-full bg-[#1052c9] px-2.5 py-1 text-xs font-semibold text-white shadow-sm";
const PHOTO_BADGE_DARK = "inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full bg-[#061e46]/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm";

/* ─────────────────────────── Xəbər kartları ─────────────────────────── */

export function NewsCard({ item, variant = "default" }: { item: PublicNews; variant?: "default" | "compact" | "lead" }) {
  const href = `/news/${item.slug}`;

  if (variant === "compact") {
    return (
      <article className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
          {item.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover_image} alt="" loading="lazy" decoding="async" className="card-zoom size-full object-cover" />
          ) : (
            <ImagePlaceholder />
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs">
            {item.category_name && <span className="font-semibold text-primary">{item.category_name}</span>}
            <time dateTime={item.published_at} className="text-ink-3">{formatDate(item.published_at)}</time>
          </p>
          <h3 className="t-card line-clamp-3 text-[15px] sm:text-base">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-primary">{item.title}</Link>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === "lead") {
    return (
      <article className="card card-link group relative flex h-full flex-col overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
          {item.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover_image} alt={item.cover_alt || ""} loading="eager" className="card-zoom size-full object-cover" />
          ) : (
            <ImagePlaceholder />
          )}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className={PHOTO_DATE}><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={item.published_at}>{formatDate(item.published_at)}</time></span>
            {item.category_name && <span className={PHOTO_BADGE}>{item.category_name}</span>}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-7">
          <h3 className="font-display text-[1.35rem] font-bold leading-tight tracking-tight md:text-[1.65rem]">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-primary">{item.title}</Link>
          </h3>
          {item.summary && <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-2 md:text-base">{item.summary}</p>}
          <ReadMore />
        </div>
      </article>
    );
  }

  // Standart kart. 360–639px enində (telefon) üfüqi düzülür; daha dar ekranda və planşetdən yuxarı şaquli.
  return (
    <article className="card card-link group relative grid h-full grid-rows-[auto_1fr] overflow-hidden min-[360px]:max-sm:grid-cols-[38%_minmax(0,1fr)] min-[360px]:max-sm:grid-rows-1">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2 min-[360px]:max-sm:m-2.5 min-[360px]:max-sm:mr-0 min-[360px]:max-sm:aspect-auto min-[360px]:max-sm:min-h-32 min-[360px]:max-sm:rounded-xl">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt={item.cover_alt || ""} loading="lazy" decoding="async" className="card-zoom absolute inset-0 size-full object-cover" />
        ) : (
          <ImagePlaceholder className="absolute inset-0" />
        )}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 min-[360px]:max-sm:hidden">
          <span className={PHOTO_DATE}><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={item.published_at}>{formatDate(item.published_at)}</time></span>
          {item.category_name && <span className={PHOTO_BADGE}>{item.category_name}</span>}
        </div>
      </div>
      <div className="flex min-w-0 flex-col p-5 min-[360px]:max-sm:p-3.5">
        <p className="mb-2 hidden flex-wrap items-center gap-x-2.5 gap-y-1 text-xs min-[360px]:max-sm:flex">
          <span className="inline-flex items-center gap-1 text-ink-3"><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={item.published_at}>{formatDate(item.published_at)}</time></span>
          {item.category_name && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{item.category_name}</span>}
        </p>
        <h3 className="t-card line-clamp-3 min-[360px]:max-sm:text-[15px]">
          <Link href={href} className="after:absolute after:inset-0 group-hover:text-primary">{item.title}</Link>
        </h3>
        {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2 min-[360px]:max-sm:line-clamp-2 min-[360px]:max-sm:text-[13px]">{item.summary}</p>}
        <ReadMore />
      </div>
    </article>
  );
}

function ReadMore() {
  // Bütün kart tək keçiddir (başlıqdakı link kartı örtür); bu yalnız vizual işarədir.
  return (
    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 group-hover:decoration-primary min-[360px]:max-sm:pt-2.5" aria-hidden="true">
      Daha ətraflı oxu <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

/* ─────────────────────────── Tədbir kartları ─────────────────────────── */

export function DateBadge({ value, tone = "navy", size = "md" }: { value: string; tone?: "navy" | "muted"; size?: "md" | "sm" }) {
  const [y, m, d] = value.slice(0, 10).split("-");
  const wd = WEEKDAYS_AZ[isoWeekday(value.slice(0, 10)) - 1];
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl text-center",
        size === "md" ? "w-[4.25rem] py-2.5" : "w-14 py-2",
        tone === "navy" ? "bg-band text-band-ink" : "border border-line bg-surface-2 text-ink"
      )}
      aria-hidden="true"
    >
      {tone === "navy" && <span className="absolute inset-x-0 top-0 h-[3px] bg-gold" />}
      <span className={cn("font-display font-extrabold leading-none tabular-nums", size === "md" ? "text-[1.75rem]" : "text-xl")}>{Number(d)}</span>
      <span className={cn("mt-1 text-[11px] font-semibold uppercase tracking-wider", tone === "navy" ? "text-band-muted" : "text-ink-3")}>{MONTHS_AZ[Number(m) - 1]?.slice(0, 3)}</span>
      {size === "md" && <span className={cn("mt-0.5 text-[10px]", tone === "navy" ? "text-band-muted" : "text-ink-3")}>{wd?.split(" ")[0]}</span>}
      <span className="sr-only">{y}</span>
    </div>
  );
}

export function EventCard({ ev, tone = "upcoming" }: { ev: PublicEvent; tone?: "upcoming" | "past" }) {
  const past = tone === "past";
  return (
    <article className={cn("group relative flex items-start gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5", past ? "transition-colors hover:border-primary/40" : "card card-link")}>
      <DateBadge value={ev.start_datetime} tone={past ? "muted" : "navy"} size={past ? "sm" : "md"} />
      <div className="min-w-0 flex-1">
        {ev.status === "ongoing" && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-success">Davam edir</p>}
        {ev.status === "cancelled" && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Ləğv edilib</p>}
        <h3 className={cn("t-card line-clamp-3", past && "text-[15px]")}>
          <Link href={`/events/${ev.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">{ev.title}</Link>
        </h3>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden="true" /><time dateTime={ev.start_datetime}>{formatDateLong(ev.start_datetime)}, {formatTime(ev.start_datetime)}</time></span>
          {ev.location && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{ev.location}</span></span>}
        </p>
      </div>
      {!past && ev.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.cover_image} alt="" loading="lazy" className="hidden size-24 shrink-0 rounded-xl object-cover sm:block" />
      )}
    </article>
  );
}

/** Köhnə ad (geriyə uyğunluq): sadə tədbir sətri. */
export function EventRow({ ev }: { ev: PublicEvent }) {
  return <EventCard ev={ev} />;
}

/* ─────────────────────────── Qalereya kartı ─────────────────────────── */

export interface GalleryCardData {
  id: number;
  title_az: string;
  slug: string;
  cover_image: string | null;
  event_date: string | null;
  category_az: string | null;
  image_count: number;
  video_count: number;
}

export function GalleryCard({ g, priority = false }: { g: GalleryCardData; priority?: boolean }) {
  const photos = Number(g.image_count) || 0;
  const videos = Number(g.video_count) || 0;
  return (
    <article className="card card-link group relative flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {g.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.cover_image} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className="card-zoom size-full object-cover" />
        ) : (
          <ImagePlaceholder label="Örtük şəkli yoxdur" />
        )}
        {g.category_az && (
          <span className={cn(PHOTO_BADGE_DARK, "absolute left-3 top-3")}><Camera className="size-3.5 shrink-0" aria-hidden="true" />{g.category_az}</span>
        )}
        {videos > 0 && (
          <span className={cn(PHOTO_BADGE_DARK, "absolute bottom-3 left-3")}><PlayCircle className="size-3.5 shrink-0" aria-hidden="true" />{videos} video</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="t-card line-clamp-2">
          <Link href={`/gallery/${g.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">{g.title_az}</Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
            {g.event_date && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" /><time dateTime={g.event_date}>{formatDate(g.event_date)}</time></span>}
            <span className="inline-flex items-center gap-1.5"><Images className="size-3.5" aria-hidden="true" />{photos} foto</span>
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary transition-colors group-hover:bg-navy group-hover:text-navy-ink" aria-hidden="true">
            Alboma bax <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────── Portret ─────────────────────────── */

export function Portrait({ name, url, className, rounded = "full", alt, textClass = "text-base" }: { name: string; url: string | null; className?: string; rounded?: "full" | "xl"; alt?: string; textClass?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden border border-line bg-primary-soft", rounded === "full" ? "rounded-full" : "rounded-2xl", className ?? "size-14")}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt ?? name} className="size-full object-cover" loading="lazy" />
      ) : (
        <span className={cn("flex size-full items-center justify-center font-display font-bold text-primary", textClass)} aria-hidden="true">{initials(name)}</span>
      )}
    </div>
  );
}

/* ─────────────────────────── Filtr çipləri ─────────────────────────── */

/** Filtr çipləri sırası: telefonda bir sətirdə üfüqi sürüşür (kənardan kənara), planşetdən etibarən sətirlərə bölünür. */
export function ChipRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start", className)}>
      {children}
    </nav>
  );
}

export function ChipLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className="chip" aria-current={active ? "page" : undefined} scroll={false}>
      {children}
    </Link>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify + "<" escape: skript daxilində HTML injection-a qarşı
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
