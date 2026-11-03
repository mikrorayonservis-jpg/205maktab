import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, formatDateLong, formatTime, MONTHS_AZ } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicNews } from "@/server/news";
import type { PublicEvent } from "@/server/content";

export function SectionHeading({ eyebrow, title, href, linkLabel, className }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl md:text-[1.875rem]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel ?? "Hamısı"} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Naviqasiya zənciri" className="mb-4 text-sm text-ink-3">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? <Link href={it.href} className="hover:text-primary">{it.label}</Link> : <span aria-current="page" className="text-ink-2">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow?: string; title: string; children?: React.ReactNode; crumbs?: { href?: string; label: string }[] }) {
  return (
    <div className="border-b border-line bg-surface-2">
      <div className="container-page py-9 md:py-12">
        {crumbs && <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, ...crumbs]} />}
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="max-w-3xl text-[1.9rem] leading-tight md:text-[2.5rem]">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-[1.0625rem] text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

export function NewsCard({ item, variant = "default" }: { item: PublicNews; variant?: "default" | "compact" | "lead" }) {
  if (variant === "compact") {
    return (
      <article className="group flex gap-4 border-b border-line py-4 last:border-0">
        <div className="min-w-0 flex-1">
          {item.category_name && <p className="mb-1 text-xs font-semibold text-primary">{item.category_name}</p>}
          <h3 className="font-display text-[15px] font-bold leading-snug">
            <Link href={`/news/${item.slug}`} className="hover:text-primary">{item.title}</Link>
          </h3>
          <p className="mt-1 text-xs text-ink-3"><time dateTime={item.published_at}>{formatDateLong(item.published_at)}</time></p>
        </div>
        {item.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt="" loading="lazy" className="size-20 shrink-0 rounded object-cover" />
        )}
      </article>
    );
  }
  const lead = variant === "lead";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-primary/40">
      <Link href={`/news/${item.slug}`} className="block overflow-hidden bg-surface-2" tabIndex={-1} aria-hidden="true">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_image} alt={item.cover_alt || ""} loading={lead ? "eager" : "lazy"} className={cn("w-full object-cover", lead ? "aspect-[16/9]" : "aspect-[3/2]")} />
        ) : (
          <div className={cn("flex w-full items-center justify-center bg-surface-2", lead ? "aspect-[16/9]" : "aspect-[3/2]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo/logo-128.webp" alt="" className="size-16 object-contain opacity-40 grayscale" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs">
          {item.category_name && <span className="font-semibold text-primary">{item.category_name}</span>}
          <span className="text-ink-3"><time dateTime={item.published_at}>{formatDate(item.published_at)}</time></span>
        </div>
        <h3 className={cn("font-display font-bold leading-snug", lead ? "text-[1.4rem]" : "text-[1.0625rem]")}>
          <Link href={`/news/${item.slug}`} className="hover:text-primary">{item.title}</Link>
        </h3>
        {item.summary && <p className={cn("mt-2 text-sm text-ink-2", lead ? "line-clamp-4" : "line-clamp-3")}>{item.summary}</p>}
      </div>
    </article>
  );
}

export function DateBadge({ value }: { value: string }) {
  const [y, m, d] = value.slice(0, 10).split("-");
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded border border-line border-t-2 border-t-gold bg-surface py-1.5 text-center" aria-hidden="true">
      <span className="font-display text-xl font-bold leading-none text-primary">{Number(d)}</span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-3">{MONTHS_AZ[Number(m) - 1]?.slice(0, 3)}</span>
      <span className="sr-only">{y}</span>
    </div>
  );
}

export function EventRow({ ev }: { ev: PublicEvent }) {
  return (
    <article className="flex gap-4 rounded-md border border-line bg-surface p-4 transition-colors hover:border-primary/40">
      <DateBadge value={ev.start_datetime} />
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold leading-snug">
          <Link href={`/events/${ev.slug}`} className="hover:text-primary">{ev.title}</Link>
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" />{formatDate(ev.start_datetime)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{formatTime(ev.start_datetime)}</span>
          {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{ev.location}</span>}
        </p>
      </div>
    </article>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify + "<" escape: skript daxilində HTML injection-a qarşı
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
