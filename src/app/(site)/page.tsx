import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Award, CalendarDays, Images, LogIn, Mail, MapPin, Megaphone, Phone } from "lucide-react";
import { getSettings } from "@/server/settings";
import { publishedNews } from "@/server/news";
import { achievements, leadership, publicGalleries, publicTeachers, upcomingEvents } from "@/server/content";
import { NewsCard, EventRow, SectionHeading, JsonLd } from "@/components/site/parts";
import { formatDate, formatDateLong, todayBaku } from "@/lib/format";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const thisYear = Number(todayBaku().slice(0, 4));
  const [s, news, yearNews, notices, events, leaders, teachers, galleries, wins] = await Promise.all([
    getSettings(),
    publishedNews({ pageSize: 4 }),
    publishedNews({ year: thisYear, pageSize: 8 }),
    publishedNews({ category: "resmi-elanlar", pageSize: 4 }),
    upcomingEvents(4),
    leadership(),
    publicTeachers({ limit: 4 }),
    publicGalleries({ pageSize: 4 }),
    achievements(6),
  ]);
  const [lead, ...rest] = news.rows;
  const shownIds = new Set(news.rows.map((n) => n.id));
  const yearOnly = yearNews.rows.filter((n) => !shownIds.has(n.id)).slice(0, 6);
  const director = leaders.find((l) => l.is_director);
  const team = leaders.filter((l) => !l.is_director).slice(0, 3);
  const site = process.env.SITE_URL || "http://localhost:3000";

  const stats = [
    [s.founded_year, "Yaranma ili"],
    [s.stat_students, "Şagird"],
    [s.stat_teachers, "Müəllim"],
    [s.stat_classrooms, "Sinif otağı"],
  ].filter(([v]) => v);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["EducationalOrganization", "HighSchool"],
          name: s.school_name,
          alternateName: s.school_short_name,
          url: site,
          logo: `${site}/assets/logo/logo-512.webp`,
          image: `${site}/assets/images/og-default.jpg`,
          foundingDate: s.founded_year,
          address: { "@type": "PostalAddress", addressLocality: "Bakı", addressCountry: "AZ", streetAddress: s.address },
          ...(s.phone ? { telephone: s.phone } : {}),
          ...(s.email ? { email: s.email } : {}),
        }}
      />

      {/* 1. Məktəbin təqdimatı */}
      <section className="border-b border-line bg-surface-warm" aria-labelledby="hero-title">
        <div className="container-page grid items-center gap-10 py-10 md:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:py-16">
          <div>
            <p className="eyebrow mb-4">Bakı şəhəri · {s.founded_year}-cu ildən</p>
            <h1 id="hero-title" className="text-[2rem] leading-[1.15] md:text-[2.75rem]">
              Rövşən İmanov adına <span className="text-primary">205 nömrəli</span> tam orta ümumtəhsil məktəbi
            </h1>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">{s.hero_text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-ink hover:bg-primary-hover">
                Məktəb haqqında <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/news" className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
                Xəbərlər
              </Link>
              <Link href="/login" className="inline-flex h-11 items-center gap-2 px-2 text-sm font-semibold text-primary hover:underline">
                <LogIn className="size-4" aria-hidden="true" /> Elektron kabinet
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-md border border-line bg-surface-2">
              <Image
                src="/assets/images/mekteb-bina-1438.webp"
                alt="Rövşən İmanov adına 205 nömrəli tam orta məktəbin binasının fasadı"
                width={1438}
                height={1094}
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[4/3] w-full object-cover object-[50%_40%]"
              />
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-lift sm:left-6">
              <Image src="/assets/logo/logo-128.webp" alt="" width={48} height={48} className="size-12 object-contain" />
              <div className="leading-tight">
                <p className="text-xs text-ink-3">Milli Qəhrəman</p>
                <p className="font-display text-sm font-bold">Rövşən İmanovun adını daşıyır</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Göstəricilər (rəsmi məlumat) */}
      {stats.length > 0 && (
        <section aria-labelledby="stats-h" className="container-page pt-14">
          <h2 id="stats-h" className="sr-only">Məktəb göstəriciləri</h2>
          <dl className="grid grid-cols-2 divide-line border-y border-line md:grid-cols-4 md:divide-x">
            {stats.map(([v, l], i) => (
              <div key={l} className={`flex flex-col-reverse px-4 py-6 md:px-6 ${i % 2 ? "border-l border-line md:border-l-0" : ""} ${i > 1 ? "border-t border-line md:border-t-0" : ""}`}>
                <dd className="font-display text-[2.25rem] font-extrabold tabular-nums leading-none text-ink md:text-[2.75rem]">{v}</dd>
                <dt className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">{l}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ink-3">{s.stat_year}-ci tədris ili üzrə rəsmi məlumat.</p>
        </section>
      )}

      {/* 3. Son xəbərlər */}
      {lead && (
        <section className="container-page pt-16" aria-labelledby="news-h">
          <SectionHeading eyebrow="Məktəb həyatı" title="Son xəbərlər" href="/news" linkLabel="Bütün xəbərlər" />
          <span id="news-h" className="sr-only">Son xəbərlər</span>
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <NewsCard item={lead} variant="lead" />
            <div className="grid content-start gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {rest.slice(0, 3).map((n) => <NewsCard key={n.id} item={n} variant="compact" />)}
            </div>
          </div>
        </section>
      )}

      {/* 4. Qarşıdan gələn tədbirlər */}
      {events.length > 0 && (
        <section className="container-page pt-16" aria-labelledby="events-h">
          <SectionHeading eyebrow="Təqvim" title="Qarşıdan gələn tədbirlər" href="/events" linkLabel="Tədbirlər təqvimi" />
          <span id="events-h" className="sr-only">Qarşıdan gələn tədbirlər</span>
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((e) => <EventRow key={e.id} ev={e} />)}
          </div>
        </section>
      )}

      {/* 5. Cari ilin fəaliyyətləri */}
      {yearOnly.length > 0 && (
        <section className="mt-16 border-y border-line bg-surface-2" aria-labelledby="year-h">
          <div className="container-page py-14">
            <SectionHeading eyebrow="Fəaliyyət" title={`${thisYear}-ci ildə məktəbimizdə`} href="/news" linkLabel="Arxiv" />
            <span id="year-h" className="sr-only">{thisYear}-ci ilin fəaliyyətləri</span>
            <ol className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {yearOnly.map((n) => (
                <li key={n.id} className="border-t border-line py-4">
                  <time dateTime={n.published_at} className="text-xs font-semibold uppercase tracking-wide text-primary">{formatDateLong(n.published_at)}</time>
                  <h3 className="mt-1 font-display text-[15px] font-bold leading-snug">
                    <Link href={`/news/${n.slug}`} className="hover:text-primary">{n.title}</Link>
                  </h3>
                  {n.category_name && <p className="mt-1 text-xs text-ink-3">{n.category_name}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 6. Foto qalereya */}
      {galleries.rows.length > 0 && (
        <section className="container-page pt-16" aria-labelledby="gallery-h">
          <SectionHeading eyebrow="Media" title="Fotoqalereya" href="/gallery" linkLabel="Bütün albomlar" />
          <span id="gallery-h" className="sr-only">Fotoqalereya</span>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {galleries.rows.map((g) => (
              <li key={g.id}>
                <Link href={`/gallery/${g.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-md border border-line bg-surface-2">
                    {g.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cover_image} alt="" loading="lazy" className="size-full object-cover transition-opacity group-hover:opacity-90" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-ink-3"><Images className="size-8" aria-hidden="true" /></div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{g.title_az}</p>
                  <p className="text-xs text-ink-3">
                    {g.event_date ? formatDate(g.event_date) : null}
                    {g.event_date && g.image_count ? " · " : null}
                    {g.image_count ? `${g.image_count} foto` : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Nailiyyətlər */}
      <section className="container-page pt-16" aria-labelledby="wins-h">
        <SectionHeading eyebrow="Fəxrimiz" title="Təhsildə nailiyyətlər" href="/achievements" linkLabel="Bütün nailiyyətlər" />
        <span id="wins-h" className="sr-only">Nailiyyətlər</span>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-md border border-line bg-surface p-6">
            <p className="text-sm font-semibold text-ink-3">{s.result_year}-ci tədris ilinin buraxılış nəticələri</p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              {[
                [s.result_graduates, "XI sinif məzunu"],
                [s.result_admitted, "ali məktəbə qəbul"],
                [s.result_600, "600+ bal"],
              ].map(([v, l]) => (
                <div key={l} className="flex flex-col-reverse">
                  <dd className="font-display text-3xl font-extrabold text-primary">{v}</dd>
                  <dt className="mb-1 text-xs text-ink-3">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {wins.length ? (
              wins.slice(0, 4).map((w) => (
                <li key={w.id} className="flex gap-3 rounded-md border border-line bg-surface p-4">
                  <Award className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold leading-snug">{w.title_az}</p>
                    {w.year_label && <p className="mt-1 text-xs text-ink-3">{w.year_label}</p>}
                  </div>
                </li>
              ))
            ) : (
              <>
                <li className="flex gap-3 rounded-md border border-line bg-surface p-4">
                  <Award className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-snug">“Təhsildə inkişaf və innovasiyalar üzrə Qrant müsabiqəsi”nin qalibi</p>
                </li>
                <li className="flex gap-3 rounded-md border border-line bg-surface p-4">
                  <Award className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold leading-snug">“Ən yaxşı məktəb saytı” müsabiqəsinin qalibi</p>
                    <p className="mt-1 text-xs text-ink-3">2021-2022-ci tədris ili</p>
                  </div>
                </li>
              </>
            )}
          </ul>
        </div>
      </section>

      {/* 8. Tarix */}
      <section className="mt-16 border-y border-line bg-surface-warm" aria-labelledby="history-h">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Tariximiz</p>
            <h2 id="history-h" className="text-2xl md:text-[1.875rem]">{s.founded_year}-cu ildən bəri təhsil ocağı</h2>
            <p className="mt-4 text-ink-2">
              Məktəb Bakı şəhərində {s.founded_year}-cu ildən fəaliyyət göstərir və Azərbaycanın Milli Qəhrəmanı Rövşən İmanovun adını daşıyır.
              Dövlət proqramı çərçivəsində köhnə bina yenidən tikilmiş, iki korpuslu, dörd mərtəbəli, {s.stat_capacity} şagird yerlik yeni bina
              22 sentyabr 2021-ci ildə istifadəyə verilmişdir.
            </p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Məktəbin tarixi və infrastrukturu <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ol className="relative space-y-6 border-l-2 border-gold/60 pl-6">
            {[
              [s.founded_year, "Məktəb fəaliyyətə başlayıb."],
              ["2021", `Yeni bina istifadəyə verilib: 2 korpus, 4 mərtəbə, ${s.stat_capacity} şagird yeri.`],
              [s.stat_year, `${s.stat_students} şagird, ${s.stat_teachers} müəllim, ${s.stat_classrooms} sinif otağı.`],
            ].map(([y, t]) => (
              <li key={y} className="relative">
                <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-gold bg-surface" aria-hidden="true" />
                <p className="font-display text-lg font-bold text-primary">{y}</p>
                <p className="text-sm text-ink-2">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 9. Rəhbərlik */}
      {director && (
        <section className="container-page pt-16" aria-labelledby="admin-h">
          <SectionHeading eyebrow="İdarəetmə" title="Məktəbin rəhbərliyi" href="/administration" linkLabel="Bütün rəhbərlik" />
          <span id="admin-h" className="sr-only">Rəhbərlik</span>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <article className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6 sm:flex-row">
              <Portrait name={director.full_name} url={director.photo_url} size="lg" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{director.position_az}</p>
                <h3 className="mt-1 text-xl">{director.full_name}</h3>
                {director.message_az && <p className="mt-3 line-clamp-4 text-sm text-ink-2">{director.message_az}</p>}
                {director.reception_hours_az && <p className="mt-3 text-xs text-ink-3">Qəbul günləri: {director.reception_hours_az}</p>}
              </div>
            </article>
            {team.length > 0 && (
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {team.map((m) => (
                  <li key={m.id} className="flex items-center gap-4 p-4">
                    <Portrait name={m.full_name} url={m.photo_url} />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{m.full_name}</p>
                      <p className="text-sm text-ink-3">{m.position_az}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 10. Müəllimlər */}
      {teachers.length > 0 && (
        <section className="container-page pt-16" aria-labelledby="teachers-h">
          <SectionHeading eyebrow="Pedaqoji heyət" title="Müəllimlərimiz" href="/teachers" linkLabel="Bütün müəllimlər" />
          <span id="teachers-h" className="sr-only">Müəllimlərimiz</span>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((t) => (
              <li key={t.id}>
                <Link href={`/teachers/${t.id}`} className="group flex items-center gap-4 rounded-md border border-line bg-surface p-4 hover:border-primary/40">
                  <Portrait name={`${t.first_name} ${t.last_name}`} url={t.avatar_url} />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug group-hover:text-primary">{t.first_name} {t.last_name}</p>
                    <p className="truncate text-sm text-ink-3">{t.subject || t.position_az}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 11. Elanlar + 12. Əlaqə */}
      <section className="container-page pt-16" aria-label="Elanlar və əlaqə">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading eyebrow="Rəsmi" title="Elanlar" href="/news?category=resmi-elanlar" linkLabel="Bütün elanlar" />
            {notices.rows.length ? (
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {notices.rows.map((n) => (
                  <li key={n.id} className="flex gap-4 p-4">
                    <Megaphone className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                    <div className="min-w-0">
                      <Link href={`/news/${n.slug}`} className="font-semibold leading-snug hover:text-primary">{n.title}</Link>
                      <p className="mt-0.5 text-xs text-ink-3"><time dateTime={n.published_at}>{formatDateLong(n.published_at)}</time></p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-line bg-surface p-5 text-sm text-ink-3">Hazırda aktual rəsmi elan yoxdur.</p>
            )}
          </div>
          <div>
            <SectionHeading eyebrow="Əlaqə" title="Bizə müraciət edin" href="/contact" linkLabel="Əlaqə səhifəsi" />
            <ul className="space-y-4 rounded-md border border-line bg-surface p-5 text-sm">
              <li className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><span>{s.address}</span></li>
              {s.phone && <li className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary">{s.phone}</a></li>}
              {s.email && <li className="flex gap-3"><Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><a href={`mailto:${s.email}`} className="break-all hover:text-primary">{s.email}</a></li>}
              <li className="flex gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><span>{s.working_hours}</span></li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Portrait({ name, url, size = "md" }: { name: string; url: string | null; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-28" : "size-14";
  return (
    <div className={`${cls} shrink-0 overflow-hidden rounded-full border border-line bg-primary-soft`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        <span className={`flex size-full items-center justify-center font-display font-bold text-primary ${size === "lg" ? "text-3xl" : "text-base"}`} aria-hidden="true">{initials(name)}</span>
      )}
    </div>
  );
}
