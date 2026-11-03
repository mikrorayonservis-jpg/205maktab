import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, FileText, GraduationCap, Images, Quote } from "lucide-react";
import { getSettings } from "@/server/settings";
import { publishedNews } from "@/server/news";
import { achievements, leadership, publicDocuments, publicGalleries, publicTeachers, upcomingEvents } from "@/server/content";
import { NewsCard, EventRow, SectionHeading, JsonLd } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { LinkButton } from "@/components/ui/Button";
import { renderMarkdown, plainText } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [s, news, notices, events, leaders, teachers, galleries, docs, wins] = await Promise.all([
    getSettings(),
    publishedNews({ pageSize: 4 }),
    publishedNews({ category: "resmi-elanlar", pageSize: 4 }),
    upcomingEvents(4),
    leadership(),
    publicTeachers({ limit: 4 }),
    publicGalleries({ pageSize: 4 }),
    publicDocuments(),
    achievements(6),
  ]);
  const [lead, ...rest] = news.rows;
  const director = leaders.find((l) => l.is_director);
  const site = process.env.SITE_URL || "http://localhost:3000";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["EducationalOrganization", "HighSchool"],
          name: s.school_name,
          alternateName: s.school_short_name,
          url: site,
          logo: `${site}/images/logo-160.png`,
          foundingDate: s.founded_year,
          address: { "@type": "PostalAddress", addressLocality: "Bakı", addressCountry: "AZ", streetAddress: s.address },
          ...(s.phone ? { telephone: s.phone } : {}),
          ...(s.email ? { email: s.email } : {}),
        }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#13213a] text-white" aria-labelledby="hero-title">
        <Image src="/images/mekteb-bina.webp" alt="205 nömrəli tam orta məktəbin binası" fill priority sizes="100vw" className="hero-photo -z-10 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(19_33_58/0.25)_0%,rgb(19_33_58/0.55)_45%,rgb(15_26_46/0.9)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(15_26_46/0.7)_0%,rgb(15_26_46/0.15)_70%)]" aria-hidden="true" />
        <div className="container-page flex min-h-[26rem] flex-col justify-end pb-24 pt-20 md:min-h-[32rem] md:pb-28">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#e6cd92]">
              <span className="h-px w-10 bg-[#e6cd92]" aria-hidden="true" /> {s.school_short_name} · Rəsmi sayt
            </p>
            <h1 id="hero-title" className="text-[2.15rem] font-medium leading-[1.12] text-white md:text-6xl">{s.hero_title}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">{s.hero_text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#142036] transition-colors hover:bg-[#f3ead6]">
                Məktəb haqqında <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/45 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10">
                <BookOpen className="size-4" aria-hidden="true" /> Şagird və valideyn kabineti
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Göstəricilər — hero üzərinə çıxan kart */}
      <section aria-label="Məktəb göstəriciləri" className="container-page relative z-10 -mt-14 md:-mt-16">
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift md:grid-cols-4">
          {[
            [s.founded_year, "Yaranma ili"],
            [s.stat_students, "Şagird"],
            [s.stat_teachers, "Müəllim"],
            [s.stat_classrooms, "Sinif otağı"],
          ].map(([v, l], i) => (
            <div key={l} className={`flex flex-col-reverse items-center px-3 py-6 text-center md:py-7 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
              <dd className="font-display text-4xl font-medium tabular-nums text-primary md:text-[2.75rem]">{v}</dd>
              <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Xəbərlər + elanlar */}
      <section className="container-page pb-14 pt-16" aria-labelledby="news-h">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionHeading eyebrow="Məktəb həyatı" title="Əsas xəbərlər" href="/news" linkLabel="Bütün xəbərlər" />
            <span id="news-h" className="sr-only">Əsas xəbərlər</span>
            {lead ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2"><NewsCard item={lead} variant="lead" /></div>
                {rest.slice(0, 2).map((n) => <NewsCard key={n.id} item={n} />)}
              </div>
            ) : (
              <EmptyState title="Hələ dərc edilmiş xəbər yoxdur">Redaksiya tərəfindən təsdiqlənən xəbərlər burada görünəcək.</EmptyState>
            )}
          </div>
          <aside aria-labelledby="notices-h" className="space-y-10">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 id="notices-h" className="text-xl font-semibold">Son elanlar</h2>
                <Link href="/news?category=resmi-elanlar" className="text-sm text-primary hover:underline">Hamısı</Link>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 shadow-[var(--shadow)]">
                {notices.rows.length ? notices.rows.map((n) => <NewsCard key={n.id} item={n} variant="compact" />) : <p className="py-6 text-sm text-ink-3">Aktual elan yoxdur.</p>}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Qarşıdan gələn tədbirlər</h2>
                <Link href="/events" className="text-sm text-primary hover:underline">Təqvim</Link>
              </div>
              <div className="space-y-3">
                {events.length ? events.map((e) => <EventRow key={e.id} ev={e} />) : <p className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-3">Planlaşdırılmış tədbir yoxdur.</p>}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Direktorun müraciəti */}
      {director?.message_az && (
        <section className="border-y border-line bg-surface" aria-labelledby="director-h">
          <div className="container-page grid items-center gap-8 py-14 md:grid-cols-[auto_1fr]">
            <div className="mx-auto size-40 overflow-hidden rounded-full border-4 border-gold-soft bg-surface-2 md:size-48">
              {director.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={director.photo_url} alt={director.full_name} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center font-display text-4xl text-primary">{initials(director.full_name)}</div>
              )}
            </div>
            <div>
              <p className="eyebrow mb-2">Direktorun müraciəti</p>
              <h2 id="director-h" className="sr-only">Direktorun müraciəti</h2>
              <Quote className="mb-2 size-8 text-gold" aria-hidden="true" />
              <div className="prose-az max-w-3xl font-display text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(plainText(director.message_az, 700)) }} />
              <p className="mt-4 text-sm font-semibold">{director.full_name}</p>
              <p className="text-sm text-ink-3">{director.position_az}</p>
              <Link href="/administration" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Rəhbərlik <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      )}

      {/* Haqqında */}
      <section className="container-page py-16" aria-labelledby="about-h">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div className="relative">
            <div className="absolute -left-3 -top-3 hidden h-full w-full rounded-2xl border border-gold/40 md:block" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-lift">
              <Image src="/images/mekteb-bina.webp" alt="Məktəbin 2021-ci ildə istifadəyə verilmiş yeni binası" width={1200} height={800} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Məktəb haqqında</p>
            <h2 id="about-h" className="text-3xl md:text-[2.5rem]">Milli Qəhrəman Rövşən İmanovun adını daşıyan təhsil ocağı</h2>
            <div className="rule-gold my-5" aria-hidden="true" />
            <p className="text-ink-2">
              Məktəb {s.founded_year}-cu ildən fəaliyyət göstərir. 2021-ci ildə istifadəyə verilmiş, iki korpuslu yeni binada fənn laboratoriyaları,
              informatika, STEAM və rəqəmsal bacarıqlar kabinetləri, akt və idman zalları təhsilin keyfiyyətinə xidmət edir.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href="/about" variant="secondary">Ətraflı oxu <ArrowRight className="size-4" aria-hidden="true" /></LinkButton>
              <Link href="/administration" className="inline-flex h-10 items-center px-2 text-sm font-medium text-primary hover:underline">Rəhbərlik</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nailiyyətlər */}
      {wins.length > 0 && (
        <section className="border-y border-line bg-surface" aria-labelledby="wins-h">
          <div className="container-page py-14">
            <p className="eyebrow mb-1.5">Fəxrimiz</p>
            <h2 id="wins-h" className="mb-8 text-2xl md:text-[1.75rem]">Nailiyyətlər</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wins.map((w) => (
                <li key={w.id} className="flex gap-4 rounded-xl border border-line bg-bg/60 p-5">
                  <span className="mt-1 h-10 w-1 shrink-0 rounded bg-gold" aria-hidden="true" />
                  <div>
                    <p className="font-medium leading-snug">{w.title_az}</p>
                    {w.year_label && <p className="mt-1 text-xs text-ink-3">{w.year_label}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Müəllimlər */}
      {teachers.length > 0 && (
        <section aria-labelledby="teachers-h">
          <div className="container-page py-14">
            <SectionHeading eyebrow="Pedaqoji heyət" title="Müəllimlərimiz" href="/teachers" linkLabel="Bütün müəllimlər" />
            <span id="teachers-h" className="sr-only">Müəllimlərimiz</span>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {teachers.map((t) => (
                <li key={t.id}>
                  <Link href={`/teachers/${t.id}`} className="group block rounded-xl border border-line bg-surface p-5 transition-shadow hover:border-primary/30 hover:shadow-lift">
                    <div className="mb-4 size-16 overflow-hidden rounded-full bg-surface-2">
                      {t.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex size-full items-center justify-center font-display text-lg text-primary">{initials(`${t.first_name} ${t.last_name}`)}</span>
                      )}
                    </div>
                    <p className="font-semibold group-hover:text-primary">{t.first_name} {t.last_name}</p>
                    <p className="text-sm text-ink-3">{t.subject || t.position_az}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Qalereya + sənədlər */}
      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionHeading eyebrow="Media" title="Foto və video qalereya" href="/gallery" />
            {galleries.rows.length ? (
              <ul className="grid grid-cols-2 gap-4">
                {galleries.rows.map((g) => (
                  <li key={g.id}>
                    <Link href={`/gallery/${g.slug}`} className="group block overflow-hidden rounded-lg border border-line bg-surface">
                      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                        {g.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.cover_image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-ink-3"><Images className="size-8" aria-hidden="true" /></div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{g.title_az}</p>
                        {g.event_date && <p className="text-xs text-ink-3">{formatDate(g.event_date)}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Albomlar hazırlanır" icon={<Images className="size-8" />} />
            )}
          </div>
          <div>
            <SectionHeading eyebrow="Rəsmi" title="Sənədlər" href="/documents" />
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {docs.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <a href={d.file_url} target="_blank" rel="noopener" className="flex items-start gap-3 p-4 hover:bg-surface-2">
                    <FileText className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-medium">{d.title_az}</span>
                      <span className="text-xs text-ink-3">PDF · {formatDate(d.published_on || d.created_at)}</span>
                    </span>
                  </a>
                </li>
              ))}
              {!docs.length && <li className="p-4 text-sm text-ink-3">Sənədlər tezliklə yerləşdiriləcək.</li>}
            </ul>
            <div className="mt-6 rounded-lg border border-line bg-primary-soft p-5">
              <GraduationCap className="mb-2 size-6 text-primary" aria-hidden="true" />
              <p className="font-semibold">Valideyn və şagirdlər üçün</p>
              <p className="mt-1 text-sm text-ink-2">Qiymətlər, davamiyyət, dərs cədvəli və ev tapşırıqları elektron jurnalda. Hesab üçün sinif rəhbərindən dəvət kodu alın.</p>
              <Link href="/register" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Qeydiyyat <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
