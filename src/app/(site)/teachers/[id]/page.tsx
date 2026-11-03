import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicTeacher } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { initials } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return publicTeacher(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load(params);
  if (!t) return { title: "Tapılmadı" };
  return { title: `${t.first_name} ${t.last_name}`, description: `${t.subject ?? "Müəllim"} — müəllim profili`, alternates: { canonical: `/teachers/${t.id}` } };
}

export default async function TeacherPage({ params }: Props) {
  const t = await load(params);
  if (!t) notFound();
  const facts = [
    ["Tədris etdiyi fənn", t.subject],
    ["Vəzifə", t.position_az],
    ["Təhsil", t.education_az],
    ["İxtisas", t.qualification],
    ["Pedaqoji staj", t.experience_years ? `${t.experience_years} il` : null],
  ].filter((f) => f[1]);
  return (
    <>
      <PageIntro eyebrow={t.subject ?? "Müəllim"} title={`${t.first_name} ${t.last_name}`} crumbs={[{ href: "/teachers", label: "Müəllimlər" }, { label: `${t.first_name} ${t.last_name}` }]} />
      <div className="container-page grid gap-10 py-12 md:grid-cols-[240px_1fr]">
        <div className="aspect-square w-full max-w-[240px] overflow-hidden rounded-lg bg-surface-2">
          {t.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.avatar_url} alt={`${t.first_name} ${t.last_name}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-display text-5xl text-primary">{initials(`${t.first_name} ${t.last_name}`)}</div>
          )}
        </div>
        <div className="max-w-2xl">
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-surface p-4">
                <dt className="text-xs uppercase tracking-wide text-ink-3">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {t.bio && (
            <section className="mt-8">
              <h2 className="mb-2 text-xl font-semibold">Qısa bioqrafiya</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-2">{t.bio}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
