import type { Metadata } from "next";
import { Award, ExternalLink } from "lucide-react";
import { getSettings } from "@/server/settings";
import { achievements } from "@/server/content";
import { Breadcrumbs, SectionHeading } from "@/components/site/parts";

export const metadata: Metadata = {
  title: "Nailiyyətlər",
  description: "Buraxılış nəticələri, olimpiada və müsabiqə qalibləri, məktəbin fəxri nailiyyətləri.",
  alternates: { canonical: "/achievements" },
};
export const dynamic = "force-dynamic";

/** Rəsmi portalda saxlanılan ətraflı siyahılar (şagird adları orada dərc olunur; burada təkrarlanmır). */
const OFFICIAL_LISTS = [
  ["Nailiyyətlərimiz", "https://bakimektebleri.edu.az/205/az/results/"],
  ["Qızıl və gümüş nişan alanlar", "https://bakimektebleri.edu.az/205/az/medal_owners/"],
  ["Fərqlənən məzunlar", "https://bakimektebleri.edu.az/205/az/advanced_graduates/"],
  ["Olimpiada qalibləri", "https://bakimektebleri.edu.az/205/az/olimpic_winners/"],
  ["Beynəlxalq müsabiqələr", "https://bakimektebleri.edu.az/205/az/international_competition/"],
  ["“Kiçik Akademiya”", "https://bakimektebleri.edu.az/205/az/academy/"],
] as const;

export default async function AchievementsPage() {
  const [s, wins] = await Promise.all([getSettings(), achievements(100)]);
  const awards = [
    { id: "qrant", title: "“Təhsildə inkişaf və innovasiyalar üzrə Qrant müsabiqəsi”nin qalibi", year: null as string | null, desc: null as string | null, image: null as string | null },
    { id: "sayt", title: "Məktəbin rəsmi saytı “Ən yaxşı məktəb saytı” müsabiqəsinin qalibi", year: "2021-2022-ci tədris ili", desc: null, image: null },
    ...wins.map((w) => ({ id: String(w.id), title: w.title_az, year: w.year_label, desc: w.description_az, image: w.image_url })),
  ];
  return (
    <>
      {/* Başlıq + buraxılış nəticələri bir tünd blokda */}
      <section className="bg-band text-band-ink" aria-labelledby="page-title">
        <div className="container-page pb-14 pt-7 md:pb-20 md:pt-10">
          <Breadcrumbs tone="dark" items={[{ href: "/", label: "Ana səhifə" }, { href: "/about", label: "Haqqımızda" }, { label: "Nailiyyətlər" }]} />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
            <div>
              <h1 id="page-title" className="t-page">Nailiyyətlər</h1>
              <div className="rule-gold mt-4" aria-hidden="true" />
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-band-muted">
                Şagird və müəllimlərimizin uğurları, buraxılış imtahanlarının nəticələri və məktəbin qazandığı müsabiqələr.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-band-muted">{s.result_year}-ci tədris ilinin buraxılış nəticələri</p>
              <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
                {[
                  [s.result_graduates, "XI sinfi bitirən məzun"],
                  [s.result_admitted, "ali təhsil müəssisəsinə qəbul olub"],
                  [s.result_600, "məzun 600-dən yuxarı bal toplayıb"],
                ].map(([v, l]) => (
                  <div key={l} className="flex flex-col-reverse">
                    <dd className="font-display text-[2.4rem] font-extrabold leading-none tracking-tight text-gold tabular-nums md:text-6xl">{v}</dd>
                    <dt className="mb-3 text-[13px] leading-snug text-band-muted">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="sheet">
        <section className="container-page pb-4 pt-10 md:pt-14" aria-labelledby="awards-h">
          <SectionHeading id="awards-h" eyebrow="Fəxrimiz" title="Məktəbin nailiyyətləri" />
          <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
            {awards.map((w) => (
              <li key={w.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 md:p-6">
                {w.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink" aria-hidden="true"><Award className="size-5" /></span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{w.title}</p>
                  {w.year && <p className="mt-1 text-sm text-ink-3">{w.year}</p>}
                  {w.desc && <p className="mt-2 text-sm text-ink-2">{w.desc}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="container-page section pb-4" aria-labelledby="lists-h">
          <SectionHeading
            id="lists-h"
            eyebrow="Rəsmi mənbə"
            title="Ətraflı siyahılar"
            description="Medal sahibləri, olimpiada qalibləri və fərqlənən məzunların adlı siyahıları Bakı məktəbləri portalındakı rəsmi səhifəmizdə dərc olunur."
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_LISTS.map(([label, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 font-semibold transition-colors hover:border-primary/40 hover:text-primary">
                  {label}
                  <ExternalLink className="size-4 shrink-0 text-ink-3 group-hover:text-primary" aria-hidden="true" />
                  <span className="sr-only">(yeni pəncərədə açılır)</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-3">Mənbə: bakimektebleri.edu.az/205</p>
        </section>
      </div>
    </>
  );
}
