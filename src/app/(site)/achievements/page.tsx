import type { Metadata } from "next";
import { Award, ExternalLink } from "lucide-react";
import { getSettings } from "@/server/settings";
import { achievements } from "@/server/content";
import { PageIntro } from "@/components/site/parts";

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
  return (
    <>
      <PageIntro eyebrow="Fəxrimiz" title="Nailiyyətlər" crumbs={[{ href: "/about", label: "Haqqımızda" }, { label: "Nailiyyətlər" }]}>
        Şagird və müəllimlərimizin uğurları, buraxılış imtahanlarının nəticələri və məktəbin qazandığı müsabiqələr.
      </PageIntro>
      <div className="container-page space-y-14 py-12">
        <section aria-labelledby="results-h">
          <h2 id="results-h" className="mb-5 text-2xl">{s.result_year}-ci tədris ilinin buraxılış nəticələri</h2>
          <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {[
              [s.result_graduates, "XI sinfi bitirən məzun"],
              [s.result_admitted, "ali təhsil müəssisəsinə qəbul olub"],
              [s.result_600, "məzun 600-dən yuxarı bal toplayıb"],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col-reverse bg-surface p-6">
                <dd className="font-display text-4xl font-extrabold text-primary">{v}</dd>
                <dt className="mb-2 text-sm text-ink-3">{l}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="awards-h">
          <h2 id="awards-h" className="mb-5 text-2xl">Məktəbin nailiyyətləri</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="flex gap-4 rounded-md border border-line bg-surface p-5">
              <Award className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden="true" />
              <p className="font-semibold">“Təhsildə inkişaf və innovasiyalar üzrə Qrant müsabiqəsi”nin qalibi</p>
            </li>
            <li className="flex gap-4 rounded-md border border-line bg-surface p-5">
              <Award className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden="true" />
              <div>
                <p className="font-semibold">Məktəbin rəsmi saytı “Ən yaxşı məktəb saytı” müsabiqəsinin qalibi</p>
                <p className="mt-1 text-sm text-ink-3">2021-2022-ci tədris ili</p>
              </div>
            </li>
            {wins.map((w) => (
              <li key={w.id} className="flex gap-4 rounded-md border border-line bg-surface p-5">
                {w.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.image_url} alt="" loading="lazy" className="size-16 shrink-0 rounded object-cover" />
                ) : (
                  <Award className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden="true" />
                )}
                <div>
                  <p className="font-semibold">{w.title_az}</p>
                  {w.year_label && <p className="mt-1 text-sm text-ink-3">{w.year_label}</p>}
                  {w.description_az && <p className="mt-2 text-sm text-ink-2">{w.description_az}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="lists-h">
          <h2 id="lists-h" className="mb-2 text-2xl">Ətraflı siyahılar</h2>
          <p className="mb-5 max-w-2xl text-sm text-ink-3">Medal sahibləri, olimpiada qalibləri və fərqlənən məzunların adlı siyahıları Bakı məktəbləri portalındakı rəsmi səhifəmizdə dərc olunur.</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_LISTS.map(([label, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold hover:border-primary/40 hover:text-primary">
                  {label} <ExternalLink className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Mənbə: bakimektebleri.edu.az/205</p>
        </section>
      </div>
    </>
  );
}
