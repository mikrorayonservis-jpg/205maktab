import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { publicTeacher } from "@/server/content";
import { Breadcrumbs, Portrait } from "@/components/site/parts";

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
  const name = `${t.first_name} ${t.last_name}`;
  const facts = [
    ["Tədris etdiyi fənn", t.subject],
    ["Vəzifə", t.position_az],
    ["Təhsil", t.education_az],
    ["İxtisas", t.qualification],
    ["Pedaqoji staj", t.experience_years ? `${t.experience_years} il` : null],
  ].filter((f) => f[1]);
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page pb-10 pt-8 md:pb-12 md:pt-12">
          <Breadcrumbs items={[{ href: "/", label: "Ana səhifə" }, { href: "/teachers", label: "Müəllimlər" }, { label: name }]} />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Portrait name={name} url={t.avatar_url} rounded="xl" className="size-28 md:size-36" textClass="text-4xl" />
            <div className="min-w-0">
              {t.subject && <p className="eyebrow mb-2">{t.subject}</p>}
              <h1 className="font-display text-[clamp(1.75rem,1.3rem+1.8vw,2.6rem)] font-extrabold leading-tight tracking-tight">{name}</h1>
              {t.position_az && <p className="mt-1 text-lg text-ink-2">{t.position_az}</p>}
            </div>
          </div>
        </div>
      </section>
      <div className="container-page grid gap-10 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
        {facts.length > 0 && (
          <dl className="card h-fit divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm text-ink-3">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="min-w-0">
          {t.bio ? (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">Qısa bioqrafiya</h2>
              <p className="whitespace-pre-line text-[1.0625rem] leading-relaxed text-ink-2">{t.bio}</p>
            </section>
          ) : (
            <p className="text-ink-3">Bioqrafiya əlavə edilməyib.</p>
          )}
          <Link href="/teachers" className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Bütün müəllimlər
          </Link>
        </div>
      </div>
    </>
  );
}
