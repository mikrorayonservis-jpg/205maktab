import type { Metadata } from "next";
import Link from "next/link";
import { publicTeachers, teacherSubjects } from "@/server/content";
import { PageIntro } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";
import { initials, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Müəllimlər", description: "Məktəbin pedaqoji heyəti: fənlər, ixtisas və təcrübə.", alternates: { canonical: "/teachers" } };

export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ fenn?: string }> }) {
  const { fenn } = await searchParams;
  const [subjects, teachers] = await Promise.all([teacherSubjects(), publicTeachers({ subject: fenn && fenn.length < 101 ? fenn : undefined })]);
  return (
    <>
      <PageIntro eyebrow="Pedaqoji heyət" title="Müəllimlər" crumbs={[{ label: "Müəllimlər" }]}>
        Şəxsi əlaqə məlumatları ictimai saytda göstərilmir. Müəllimlə əlaqə üçün elektron jurnaldan və ya məktəb rəhbərliyindən istifadə edin.
      </PageIntro>
      <div className="container-page py-10">
        {subjects.length > 0 && (
          <nav aria-label="Fənnə görə filtr" className="mb-8 flex flex-wrap gap-2">
            <Link href="/teachers" className={cn("rounded-full border px-3 py-1.5 text-sm", !fenn ? "border-primary bg-primary text-primary-ink" : "border-line hover:bg-surface-2")}>Hamısı</Link>
            {subjects.map((s) => (
              <Link key={s} href={`/teachers?fenn=${encodeURIComponent(s)}`} className={cn("rounded-full border px-3 py-1.5 text-sm", fenn === s ? "border-primary bg-primary text-primary-ink" : "border-line hover:bg-surface-2")}>{s}</Link>
            ))}
          </nav>
        )}
        {teachers.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teachers.map((t) => (
              <li key={t.id}>
                <Link href={`/teachers/${t.id}`} className="group flex h-full gap-4 rounded-lg border border-line bg-surface p-4 hover:border-primary/40">
                  <div className="size-16 shrink-0 overflow-hidden rounded-full bg-surface-2">
                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-lg text-primary">{initials(`${t.first_name} ${t.last_name}`)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug group-hover:text-primary">{t.first_name} {t.last_name}</p>
                    <p className="text-sm text-primary">{t.subject}</p>
                    {t.position_az && <p className="text-xs text-ink-3">{t.position_az}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Müəllim profili tapılmadı" />
        )}
      </div>
    </>
  );
}
