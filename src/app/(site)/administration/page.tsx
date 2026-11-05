import type { Metadata } from "next";
import { Briefcase, Clock, GraduationCap, Users } from "lucide-react";
import { leadership } from "@/server/content";
import { PageHero, Portrait, SectionHeading } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { renderMarkdown } from "@/lib/markdown";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Rəhbərlik", description: "Məktəb direktoru və direktor müavinləri.", alternates: { canonical: "/administration" } };

export default async function AdministrationPage() {
  const people = await leadership();
  const director = people.find((p) => p.is_director);
  const others = people.filter((p) => !p.is_director);
  return (
    <>
      <PageHero title="Rəhbərlik" subtitle="Məktəbin direktoru, direktor müavinləri və rəhbər heyət." crumbs={[{ label: "Rəhbərlik" }]} compact imagePosition="50% 30%" />
      <div className="sheet">
        <div className="container-page space-y-16 pb-4 pt-8 md:pt-12">
          {!people.length && <EmptyState title="Rəhbərlik haqqında məlumat əlavə edilməyib" icon={<Users />} />}
          {director && (
            <article className="grid overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]" aria-labelledby={`p-${director.id}`}>
              <div className="relative bg-band">
                {director.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={director.photo_url} alt={director.full_name} className="aspect-[4/5] size-full object-cover md:aspect-auto" />
                ) : (
                  <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 p-8 text-center text-band-ink">
                    <span className="flex size-28 items-center justify-center rounded-full border-2 border-gold/70 font-display text-4xl font-extrabold" aria-hidden="true">{initials(director.full_name)}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 p-6 sm:p-8 lg:p-10">
                <p className="eyebrow">{director.position_az}</p>
                <h2 id={`p-${director.id}`} className="mt-2 font-display text-[clamp(1.6rem,1.3rem+1.2vw,2.25rem)] font-extrabold tracking-tight">{director.full_name}</h2>
                <Facts p={director} />
                {director.message_az && (
                  <section className="mt-8">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-3">Rəsmi müraciət</h3>
                    <div className="prose-az border-l-4 border-gold pl-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(director.message_az) }} />
                  </section>
                )}
                {director.bio_az && (
                  <section className="mt-8">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-3">Bioqrafiya</h3>
                    <div className="prose-az" dangerouslySetInnerHTML={{ __html: renderMarkdown(director.bio_az) }} />
                  </section>
                )}
                {!director.message_az && !director.bio_az && !director.education_az && !director.experience_az && !director.reception_hours_az && (
                  <p className="mt-6 text-ink-3">Ətraflı məlumat tezliklə əlavə ediləcək.</p>
                )}
              </div>
            </article>
          )}
          {others.length > 0 && (
            <section aria-labelledby="deputies-h">
              <SectionHeading id="deputies-h" eyebrow="Rəhbər heyət" title="Direktor müavinləri və rəhbər heyət" />
              <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                {others.map((p) => (
                  <article key={p.id} className="card flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
                    <Portrait name={p.full_name} url={p.photo_url} rounded="xl" className="size-24 sm:size-28" textClass="text-2xl" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">{p.position_az}</p>
                      <h3 className="mt-1 font-display text-lg font-bold">{p.full_name}</h3>
                      <Facts p={p} compact />
                      {p.bio_az && <div className="prose-az mt-3 text-[15px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.bio_az) }} />}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Facts({ p, compact }: { p: { education_az: string | null; experience_az: string | null; reception_hours_az: string | null }; compact?: boolean }) {
  const rows = [
    [GraduationCap, "Təhsil və ixtisas", p.education_az],
    [Briefcase, "İş təcrübəsi", p.experience_az],
    [Clock, "Qəbul saatları", p.reception_hours_az],
  ] as const;
  const list = rows.filter((r) => r[2]);
  if (!list.length) return null;
  return (
    <dl className={compact ? "mt-3 space-y-2 text-sm" : "mt-6 grid gap-4 border-y border-line py-5 sm:grid-cols-3"}>
      {list.map(([Icon, label, value]) => (
        <div key={label} className="flex gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="text-sm font-medium text-ink">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
