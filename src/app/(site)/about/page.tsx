import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { getPage, getSettings } from "@/server/settings";
import { achievements } from "@/server/content";
import { Breadcrumbs } from "@/components/site/parts";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Məktəb haqqında", description: "Məktəbin tarixi, missiyası, inkişaf strategiyası, infrastrukturu, nailiyyətləri və ənənələri.", alternates: { canonical: "/about" } };

const SECTIONS = [
  ["about", "Ümumi məlumat"],
  ["history", "Tarix"],
  ["mission", "Missiya və dəyərlər"],
  ["strategy", "İnkişaf strategiyası"],
  ["directions", "Təhsil istiqamətləri"],
  ["infrastructure", "İnfrastruktur"],
  ["traditions", "Ənənələr"],
] as const;

export default async function AboutPage() {
  const s = await getSettings();
  const pages = await Promise.all(SECTIONS.map(([slug]) => getPage(slug)));
  const wins = await achievements(50);
  const available = SECTIONS.map(([slug, label], i) => ({ slug, label, page: pages[i] })).filter((x) => x.page?.content_md);
  const facts = [
    [s.founded_year, "Yaranma ili"],
    [s.stat_students, "Şagird"],
    [s.stat_teachers, "Müəllim"],
    [s.stat_classrooms, "Sinif otağı"],
  ].filter(([v]) => v);

  return (
    <>
      {/* Redaksiya üslublu giriş: mətn + məktəbin real binası */}
      <section className="border-b border-line bg-surface" aria-labelledby="page-title">
        <div className="container-page grid items-center gap-10 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-16">
          <div>
            <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, { label: "Məktəb haqqında" }]} />
            <p className="eyebrow mb-4">{s.founded_year}-cu ildən</p>
            <h1 id="page-title" className="t-page">Məktəb haqqında</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{s.school_name}</p>
            {facts.length > 0 && (
              <dl className="mt-8 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4 sm:gap-x-4">
                {facts.map(([v, l]) => (
                  <div key={l} className="flex flex-col-reverse">
                    <dd className="font-display text-2xl font-extrabold tracking-tight text-band tabular-nums dark:text-ink">{v}</dd>
                    <dt className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">{l}</dt>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-xs text-ink-3">{s.stat_year}-ci tədris ili üzrə rəsmi məlumat.</p>
          </div>
          <figure>
            <div className="relative">
            <div className="absolute -bottom-3 -right-3 hidden h-2/3 w-2/3 rounded-3xl bg-band sm:block" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2">
              <Image
                src="/assets/images/mekteb-bina-1438.webp"
                alt="205 nömrəli tam orta məktəbin yeni binasının fasadı"
                width={1438}
                height={1094}
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            </div>
            <figcaption className="mt-5 text-sm text-ink-3 sm:mt-6">22 sentyabr 2021-ci ildə istifadəyə verilmiş yeni məktəb binası</figcaption>
          </figure>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 md:py-16 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Bölmələr" className="lg:block">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-line lg:pb-0">
            {available.map((x) => (
              <li key={x.slug} className="shrink-0">
                <a href={`#${x.slug}`} className="chip lg:-ml-px lg:min-h-0 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:bg-transparent lg:px-4 lg:py-2 lg:text-sm lg:font-medium lg:text-ink-2 lg:shadow-none lg:hover:border-primary lg:hover:text-primary">{x.label}</a>
              </li>
            ))}
            {wins.length > 0 && (
              <li className="shrink-0">
                <a href="#achievements" className="chip lg:-ml-px lg:min-h-0 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:bg-transparent lg:px-4 lg:py-2 lg:text-sm lg:font-medium lg:text-ink-2 lg:shadow-none lg:hover:border-primary lg:hover:text-primary">Nailiyyətlər</a>
              </li>
            )}
          </ul>
        </nav>
        <div className="min-w-0 space-y-14 md:space-y-16">
          {available.length === 0 && <p className="text-ink-3">Bölmələrin məzmunu administrator panelindən əlavə edilir.</p>}
          {available.map((x, i) => (
            <section key={x.slug} id={x.slug} aria-labelledby={`${x.slug}-h`} className={cn("max-w-3xl", i > 0 && "border-t border-line pt-12 md:pt-14")}>
              <p className="mb-2 font-display text-sm font-bold tabular-nums text-gold-ink">{String(i + 1).padStart(2, "0")}</p>
              <h2 id={`${x.slug}-h`} className="t-section mb-5">{x.page!.title_az}</h2>
              <div className={cn("prose-az", i === 0 && "md:text-[1.15rem]")} dangerouslySetInnerHTML={{ __html: renderMarkdown(x.page!.content_md) }} />
            </section>
          ))}
          {wins.length > 0 && (
            <section id="achievements" aria-labelledby="ach-h" className="border-t border-line pt-12 md:pt-14">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <h2 id="ach-h" className="t-section">Nailiyyətlər</h2>
                <Link href="/achievements" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary hover:underline">Nailiyyətlər səhifəsi <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {wins.map((w) => (
                  <li key={w.id} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-5">
                    <Award className="mt-0.5 size-5 shrink-0 text-gold-ink" aria-hidden="true" />
                    <div>
                      <p className="font-semibold leading-snug">{w.title_az}</p>
                      {w.year_label && <p className="mt-1 text-sm text-ink-3">{w.year_label}</p>}
                      {w.description_az && <p className="mt-2 text-sm text-ink-2">{w.description_az}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
