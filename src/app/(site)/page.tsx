import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Award, CalendarDays, Clock, Images, LogIn, Mail, MapPin, Megaphone, Phone, Quote } from "lucide-react";
import { getSettings } from "@/server/settings";
import { publishedNews } from "@/server/news";
import { achievements, leadership, publicGalleries, publicTeachers, upcomingEvents } from "@/server/content";
import { EventCard, ImagePlaceholder, JsonLd, NewsCard, Portrait, SectionHeading } from "@/components/site/parts";
import { formatDate, formatDateLong, todayBaku } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const thisYear = Number(todayBaku().slice(0, 4));
  const [s, news, yearNews, notices, events, leaders, teachers, galleries, wins] = await Promise.all([
    getSettings(),
    publishedNews({ pageSize: 5 }),
    publishedNews({ year: thisYear, pageSize: 8 }),
    publishedNews({ category: "resmi-elanlar", pageSize: 4 }),
    upcomingEvents(4),
    leadership(),
    publicTeachers({ limit: 4 }),
    publicGalleries({ pageSize: 5 }),
    achievements(6),
  ]);
  const [lead, ...rest] = news.rows;
  const shownIds = new Set(news.rows.map((n) => n.id));
  const yearOnly = yearNews.rows.filter((n) => !shownIds.has(n.id)).slice(0, 6);
  const director = leaders.find((l) => l.is_director);
  const team = leaders.filter((l) => !l.is_director).slice(0, 3);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const tel = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : null;

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

      {/* 1. Təqdimat: məktəbin real binası, tünd göy örtük, əsas keçidlər */}
      <section className="relative isolate overflow-hidden bg-band text-band-ink" aria-labelledby="hero-title">
        <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[62%]">
          <Image
            src="/assets/images/mekteb-bina-1438.webp"
            alt="Rövşən İmanov adına 205 nömrəli tam orta məktəbin binasının fasadı"
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="object-cover object-[50%_60%]"
          />
        </div>
        <div className="hero-veil absolute inset-0 -z-10" aria-hidden="true" />
        <div className="container-page pb-28 pt-12 md:pb-32 md:pt-16 lg:pb-40 lg:pt-24">
          <div className="max-w-2xl">
            <p className="eyebrow mb-5 text-gold">Bakı şəhəri · {s.founded_year}-cu ildən</p>
            <h1 id="hero-title" className="t-display">
              Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbi
            </h1>
            <p className="mt-6 max-w-[36rem] text-[1.0625rem] leading-relaxed text-band-muted md:text-lg">{s.hero_text}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/about" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#092b63] transition-colors hover:bg-[#eaf1ff]">
                Məktəb haqqında <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/news" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/35 px-5 text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10">
                Xəbərlər
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center gap-2 px-2 text-[15px] font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline">
                <LogIn className="size-4" aria-hidden="true" /> Elektron kabinet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Rəsmi göstəricilər (hero-nun üstünə çıxan kart) */}
      {stats.length > 0 && (
        <section className="container-page relative z-10 -mt-16 md:-mt-20" aria-labelledby="stats-h">
          <h2 id="stats-h" className="sr-only">Məktəb göstəriciləri</h2>
          <div className="card px-5 py-6 md:px-8 md:py-7">
            <dl className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-line">
              {stats.map(([v, l], i) => (
                <div key={l} className={cn("flex flex-col-reverse px-1 md:px-6", i === 0 && "md:pl-0")}>
                  <dd className="font-display text-[2rem] font-extrabold leading-none tracking-tight text-band tabular-nums dark:text-ink md:text-[2.6rem]">{v}</dd>
                  <dt className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{l}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-xs text-ink-3">{s.stat_year}-ci tədris ili üzrə rəsmi məlumat.</p>
          </div>
        </section>
      )}

      {/* 3. Son xəbərlər: aparıcı material + siyahı */}
      {lead && (
        <section className="container-page section" aria-labelledby="news-h">
          <SectionHeading id="news-h" eyebrow="Məktəb həyatı" title="Son xəbərlər" href="/news" linkLabel="Bütün xəbərlər" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            <NewsCard item={lead} variant="lead" />
            {rest.length > 0 && (
              <div className="card flex flex-col px-5 py-2 md:px-6">
                <div className="divide-y divide-line">
                  {rest.slice(0, 4).map((n) => <NewsCard key={n.id} item={n} variant="compact" />)}
                </div>
                <Link href="/news" className="mt-auto inline-flex min-h-12 items-center gap-1.5 border-t border-line pt-1 text-sm font-semibold text-primary hover:text-primary-hover">
                  Xəbər arxivinə keç <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Tədbirlər və rəsmi elanlar */}
      <section className={cn("container-page", lead ? "pb-[clamp(3rem,2.2rem+3vw,5rem)]" : "section")} aria-label="Tədbirlər və elanlar">
        <div className={cn("grid gap-10 lg:gap-12", events.length > 0 && "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]")}>
          {events.length > 0 && (
            <div>
              <SectionHeading eyebrow="Təqvim" title="Qarşıdan gələn tədbirlər" href="/events" linkLabel="Təqvim" />
              <div className="space-y-3">{events.map((e) => <EventCard key={e.id} ev={e} />)}</div>
            </div>
          )}
          <div>
            <SectionHeading eyebrow="Rəsmi" title="Elanlar" href="/news?category=resmi-elanlar" linkLabel="Bütün elanlar" />
            {notices.rows.length ? (
              <ul className={cn("grid gap-3", !events.length && "md:grid-cols-2")}>
                {notices.rows.map((n) => (
                  <li key={n.id} className="group relative flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary/40 sm:p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink" aria-hidden="true"><Megaphone className="size-[18px]" /></span>
                    <div className="min-w-0">
                      <Link href={`/news/${n.slug}`} className="t-card line-clamp-2 text-[15px] after:absolute after:inset-0 group-hover:text-primary">{n.title}</Link>
                      <p className="mt-1 text-[13px] text-ink-3"><time dateTime={n.published_at}>{formatDateLong(n.published_at)}</time></p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3" aria-hidden="true"><Megaphone className="size-[18px]" /></span>
                <p className="text-sm text-ink-3">Hazırda aktual rəsmi elan yoxdur.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Cari ilin fəaliyyətləri: xronoloji siyahı */}
      {yearOnly.length > 0 && (
        <section className="border-y border-line bg-surface" aria-labelledby="year-h">
          <div className="container-page section">
            <SectionHeading id="year-h" eyebrow="Fəaliyyət" title={`${thisYear}-ci ildə məktəbimizdə`} href="/news" linkLabel="Arxiv" />
            <ol className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {yearOnly.map((n) => (
                <li key={n.id} className="group relative border-t-2 border-line py-5 transition-colors hover:border-primary">
                  <time dateTime={n.published_at} className="text-xs font-bold uppercase tracking-[0.1em] text-primary">{formatDateLong(n.published_at)}</time>
                  <h3 className="t-card mt-2 text-base">
                    <Link href={`/news/${n.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">{n.title}</Link>
                  </h3>
                  {n.category_name && <p className="mt-1.5 text-[13px] text-ink-3">{n.category_name}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 6. Direktorun müraciəti və rəhbərlik */}
      {director && (
        <section className="container-page section" aria-labelledby="admin-h">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <p className="eyebrow mb-3">İdarəetmə</p>
              <h2 id="admin-h" className="t-section">Məktəbin rəhbərliyi</h2>
              <p className="mt-4 max-w-md text-ink-2">Məktəbin idarə olunması, qəbul saatları və rəhbər heyət haqqında məlumat.</p>
              {team.length > 0 && (
                <ul className="mt-8 divide-y divide-line border-y border-line">
                  {team.map((m) => (
                    <li key={m.id} className="flex items-center gap-4 py-4">
                      <Portrait name={m.full_name} url={m.photo_url} className="size-12" />
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{m.full_name}</p>
                        <p className="text-sm text-ink-3">{m.position_az}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/administration" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary hover:text-primary-hover">
                Rəhbərlik səhifəsi <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <article className="relative overflow-hidden rounded-3xl bg-band p-6 text-band-ink sm:p-8 md:p-10">
              <Quote className="absolute -right-3 -top-3 size-32 text-white/[0.06]" aria-hidden="true" />
              <div className="relative flex items-center gap-4">
                <Portrait name={director.full_name} url={director.photo_url} className="size-16 border-white/20 bg-white/10 sm:size-20" textClass="text-xl text-white" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold">{director.position_az}</p>
                  <h3 className="mt-1 font-display text-xl font-bold sm:text-2xl">{director.full_name}</h3>
                </div>
              </div>
              {director.message_az ? (
                <blockquote className="relative mt-7 border-l-4 border-gold pl-5 text-[1.0625rem] leading-relaxed text-white/90">
                  <p className="line-clamp-[8]">{director.message_az}</p>
                </blockquote>
              ) : (
                <p className="relative mt-7 text-white/75">Direktorun müraciəti rəhbərlik səhifəsində dərc olunur.</p>
              )}
              {director.reception_hours_az && (
                <p className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] text-white/85">
                  <Clock className="size-3.5" aria-hidden="true" /> Qəbul günləri: {director.reception_hours_az}
                </p>
              )}
            </article>
          </div>
        </section>
      )}

      {/* 7. Nailiyyətlər: tünd zolaq, buraxılış nəticələri */}
      <section className="bg-band text-band-ink" aria-labelledby="wins-h">
        <div className="container-page section">
          <SectionHeading id="wins-h" tone="dark" eyebrow="Fəxrimiz" title="Təhsildə nailiyyətlər" href="/achievements" linkLabel="Bütün nailiyyətlər" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-14">
            <div>
              <p className="text-sm font-medium text-band-muted">{s.result_year}-ci tədris ilinin buraxılış nəticələri</p>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {[
                  [s.result_graduates, "XI sinif məzunu"],
                  [s.result_admitted, "ali məktəbə qəbul"],
                  [s.result_600, "600+ bal"],
                ].map(([v, l]) => (
                  <div key={l} className="flex flex-col-reverse">
                    <dd className="font-display text-[2.25rem] font-extrabold leading-none tracking-tight text-gold tabular-nums md:text-5xl">{v}</dd>
                    <dt className="mb-3 text-[13px] leading-snug text-band-muted">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {(wins.length
                ? wins.slice(0, 4).map((w) => ({ id: String(w.id), title: w.title_az, year: w.year_label }))
                : [
                    { id: "qrant", title: "“Təhsildə inkişaf və innovasiyalar üzrə Qrant müsabiqəsi”nin qalibi", year: null },
                    { id: "sayt", title: "“Ən yaxşı məktəb saytı” müsabiqəsinin qalibi", year: "2021-2022-ci tədris ili" },
                  ]
              ).map((w) => (
                <li key={w.id} className="flex gap-3.5 rounded-2xl border border-white/12 bg-white/[0.05] p-4 sm:p-5">
                  <Award className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <div>
                    <p className="text-[15px] font-semibold leading-snug text-white">{w.title}</p>
                    {w.year && <p className="mt-1.5 text-[13px] text-band-muted">{w.year}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 8. Fotoqalereya: mozaika */}
      {galleries.rows.length > 0 && (
        <section className="container-page section" aria-labelledby="gallery-h">
          <SectionHeading id="gallery-h" eyebrow="Media" title="Fotoqalereya" href="/gallery" linkLabel="Bütün albomlar" />
          <ul className="grid auto-rows-[10.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:gap-4 lg:auto-rows-[13.5rem] lg:grid-cols-4">
            {galleries.rows.map((g, i) => (
              <li key={g.id} className={mosaicSpan(i, galleries.rows.length)}>
                <Link href={`/gallery/${g.slug}`} className="group relative block size-full overflow-hidden rounded-2xl bg-surface-2">
                  {g.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_image} alt="" loading="lazy" decoding="async" className="card-zoom size-full object-cover group-hover:scale-[1.035]" />
                  ) : (
                    <ImagePlaceholder />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#061e46]/85 via-[#061e46]/15 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4">
                    <span className={cn("block font-display font-bold leading-snug", i === 0 ? "text-lg md:text-2xl" : "line-clamp-2 text-sm md:text-[15px]")}>{g.title_az}</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-white/80">
                      {g.event_date && <span>{formatDate(g.event_date)}</span>}
                      <span className="inline-flex items-center gap-1"><Images className="size-3" aria-hidden="true" />{g.image_count} foto</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 9. Tarix */}
      <section className="border-y border-line bg-surface" aria-labelledby="history-h">
        <div className="container-page section grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="eyebrow mb-3">Tariximiz</p>
            <h2 id="history-h" className="t-section">{s.founded_year}-cu ildən bəri təhsil ocağı</h2>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
              Məktəb Bakı şəhərində {s.founded_year}-cu ildən fəaliyyət göstərir və Azərbaycanın Milli Qəhrəmanı Rövşən İmanovun adını daşıyır.
              Dövlət proqramı çərçivəsində köhnə bina yenidən tikilmiş, iki korpuslu, dörd mərtəbəli, {s.stat_capacity} şagird yerlik yeni bina
              22 sentyabr 2021-ci ildə istifadəyə verilmişdir.
            </p>
            <Link href="/about" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-5 text-[15px] font-semibold text-navy-ink transition-colors hover:bg-navy-hover">
              Məktəbin tarixi və infrastrukturu <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ol className="relative space-y-8 border-l-2 border-line pl-8 lg:mt-2">
            {[
              [s.founded_year, "Məktəb fəaliyyətə başlayıb."],
              ["2021", `Yeni bina istifadəyə verilib: 2 korpus, 4 mərtəbə, ${s.stat_capacity} şagird yeri.`],
              [s.stat_year, `${s.stat_students} şagird, ${s.stat_teachers} müəllim, ${s.stat_classrooms} sinif otağı.`],
            ].map(([y, t]) => (
              <li key={y} className="relative">
                <span className="absolute -left-[2.45rem] top-1 size-4 rounded-full border-[3px] border-surface bg-gold ring-2 ring-gold/40" aria-hidden="true" />
                <p className="font-display text-2xl font-extrabold tracking-tight text-band dark:text-ink">{y}</p>
                <p className="mt-1 text-ink-2">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 10. Müəllimlər */}
      {teachers.length > 0 && (
        <section className="container-page section" aria-labelledby="teachers-h">
          <SectionHeading id="teachers-h" eyebrow="Pedaqoji heyət" title="Müəllimlərimiz" href="/teachers" linkLabel="Bütün müəllimlər" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((t) => (
              <li key={t.id}>
                <Link href={`/teachers/${t.id}`} className="card card-link group flex h-full items-center gap-4 p-4">
                  <Portrait name={`${t.first_name} ${t.last_name}`} url={t.avatar_url} alt="" />
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

      {/* 11. Əlaqə */}
      <section className={cn("container-page", teachers.length ? "" : "pt-[clamp(3rem,2.2rem+3vw,5rem)]")} aria-labelledby="contact-h">
        <div className="card grid gap-8 overflow-hidden p-6 md:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:items-center lg:gap-12 lg:p-10">
          <div>
            <p className="eyebrow mb-3">Əlaqə</p>
            <h2 id="contact-h" className="t-section">Bizə müraciət edin</h2>
            <Link href="/contact" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary hover:text-primary-hover">
              Əlaqə səhifəsi və xəritə <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            <ContactItem icon={<MapPin />} label="Ünvan">{s.address}</ContactItem>
            {tel && <ContactItem icon={<Phone />} label="Telefon"><a href={tel} className="hover:text-primary">{s.phone}</a></ContactItem>}
            {s.email && <ContactItem icon={<Mail />} label="E-poçt"><a href={`mailto:${s.email}`} className="break-all hover:text-primary">{s.email}</a></ContactItem>}
            {s.working_hours && <ContactItem icon={<CalendarDays />} label="İş rejimi">{s.working_hours}</ContactItem>}
          </ul>
        </div>
      </section>
    </>
  );
}

/** Mozaikada boşluq qalmasın deyə albom sayına görə ölçülər (lg-də 4 sütun, telefonda 2 sütun). */
function mosaicSpan(i: number, n: number) {
  if (n <= 2) return cn("col-span-2 row-span-2", n === 1 && "lg:col-span-4");
  if (i === 0) return "col-span-2 row-span-2";
  if (n === 3) return "lg:row-span-2";
  if (n === 4 && i === 3) return "col-span-2";
  return "";
}

function ContactItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary [&_svg]:size-5" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</p>
        <p className="mt-0.5 font-medium text-ink">{children}</p>
      </div>
    </li>
  );
}
