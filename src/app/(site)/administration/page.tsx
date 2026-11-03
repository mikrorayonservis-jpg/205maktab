import type { Metadata } from "next";
import { GraduationCap, Briefcase, Clock } from "lucide-react";
import { leadership } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
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
      <PageIntro eyebrow="Məktəb" title="Rəhbərlik" crumbs={[{ label: "Rəhbərlik" }]} />
      <div className="container-page space-y-12 py-12">
        {!people.length && <EmptyState title="Rəhbərlik haqqında məlumat əlavə edilməyib" />}
        {director && (
          <article className="grid gap-8 rounded-lg border border-line bg-surface p-6 md:grid-cols-[220px_1fr] md:p-8" aria-labelledby={`p-${director.id}`}>
            <div className="mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-md bg-surface-2">
              {director.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={director.photo_url} alt={director.full_name} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center font-display text-5xl text-primary">{initials(director.full_name)}</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{director.position_az}</p>
              <h2 id={`p-${director.id}`} className="mt-1 text-3xl font-semibold">{director.full_name}</h2>
              <Facts p={director} />
              {director.message_az && (
                <section className="mt-6">
                  <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-3">Rəsmi müraciət</h3>
                  <div className="prose-az" dangerouslySetInnerHTML={{ __html: renderMarkdown(director.message_az) }} />
                </section>
              )}
              {director.bio_az && (
                <section className="mt-6">
                  <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-3">Bioqrafiya</h3>
                  <div className="prose-az" dangerouslySetInnerHTML={{ __html: renderMarkdown(director.bio_az) }} />
                </section>
              )}
            </div>
          </article>
        )}
        {others.length > 0 && (
          <section aria-labelledby="deputies-h">
            <h2 id="deputies-h" className="mb-5 text-2xl font-semibold">Direktor müavinləri və rəhbər heyət</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {others.map((p) => (
                <article key={p.id} className="flex gap-5 rounded-lg border border-line bg-surface p-5">
                  <div className="size-24 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.full_name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center font-display text-2xl text-primary">{initials(p.full_name)}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{p.full_name}</h3>
                    <p className="text-sm text-accent">{p.position_az}</p>
                    <Facts p={p} compact />
                    {p.bio_az && <div className="prose-az mt-3 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.bio_az) }} />}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
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
    <dl className={compact ? "mt-3 space-y-1.5 text-sm" : "mt-4 grid gap-3 sm:grid-cols-3"}>
      {list.map(([Icon, label, value]) => (
        <div key={label} className="flex gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
          <div>
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="text-sm text-ink">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
