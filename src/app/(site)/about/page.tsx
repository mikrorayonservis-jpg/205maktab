import type { Metadata } from "next";
import Image from "next/image";
import { getPage, getSettings } from "@/server/settings";
import { achievements } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { renderMarkdown } from "@/lib/markdown";

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

  return (
    <>
      <PageIntro eyebrow={`${s.founded_year}-cu ildən`} title="Məktəb haqqında" crumbs={[{ label: "Məktəb haqqında" }]}>
        {s.school_name}
      </PageIntro>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Bölmələr" className="hidden lg:block">
          <ul className="sticky top-28 space-y-1 border-l border-line text-sm">
            {available.map((x) => (
              <li key={x.slug}><a href={`#${x.slug}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-ink-2 hover:border-primary hover:text-primary">{x.label}</a></li>
            ))}
            {wins.length > 0 && <li><a href="#achievements" className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-ink-2 hover:border-primary hover:text-primary">Nailiyyətlər</a></li>}
            <li><a href="#photos" className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-ink-2 hover:border-primary hover:text-primary">Fotoşəkillər</a></li>
          </ul>
        </nav>
        <div className="min-w-0 space-y-12">
          {available.length === 0 && <p className="text-ink-3">Bölmələrin məzmunu administrator panelindən əlavə edilir.</p>}
          {available.map((x) => (
            <section key={x.slug} id={x.slug} aria-labelledby={`${x.slug}-h`} className="max-w-3xl">
              <div className="rule-gold mb-3" aria-hidden="true" />
              <h2 id={`${x.slug}-h`} className="mb-4 text-2xl font-semibold">{x.page!.title_az}</h2>
              <div className="prose-az" dangerouslySetInnerHTML={{ __html: renderMarkdown(x.page!.content_md) }} />
            </section>
          ))}
          {wins.length > 0 && (
            <section id="achievements" aria-labelledby="ach-h">
              <div className="rule-gold mb-3" aria-hidden="true" />
              <h2 id="ach-h" className="mb-4 text-2xl font-semibold">Nailiyyətlər</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {wins.map((w) => (
                  <li key={w.id} className="rounded-lg border border-line bg-surface p-5">
                    {w.year_label && <p className="text-xs font-semibold text-gold">{w.year_label}</p>}
                    <p className="mt-1 font-semibold">{w.title_az}</p>
                    {w.description_az && <p className="mt-1 text-sm text-ink-2">{w.description_az}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section id="photos" aria-labelledby="photos-h">
            <div className="rule-gold mb-3" aria-hidden="true" />
            <h2 id="photos-h" className="mb-4 text-2xl font-semibold">Məktəbin binası</h2>
            <figure className="overflow-hidden rounded-lg border border-line">
              <Image src="/assets/images/mekteb-bina-1438.webp" alt="205 nömrəli tam orta məktəbin yeni binasının fasadı" width={1438} height={1094} className="aspect-[4/3] w-full object-cover" sizes="(min-width: 1024px) 900px, 100vw" />
              <figcaption className="bg-surface px-4 py-2 text-sm text-ink-3">22 sentyabr 2021-ci ildə istifadəyə verilmiş yeni məktəb binası</figcaption>
            </figure>
          </section>
        </div>
      </div>
    </>
  );
}
