import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { publicTeachers, teacherSubjects } from "@/server/content";
import { ChipLink, ChipRow, PageIntro, Portrait } from "@/components/site/parts";
import { EmptyState } from "@/components/ui/Feedback";

export const metadata: Metadata = { title: "Müəllimlər", description: "Məktəbin pedaqoji heyəti: fənlər, ixtisas və təcrübə.", alternates: { canonical: "/teachers" } };

export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ fenn?: string }> }) {
  const { fenn } = await searchParams;
  const [subjects, teachers] = await Promise.all([teacherSubjects(), publicTeachers({ subject: fenn && fenn.length < 101 ? fenn : undefined })]);
  return (
    <>
      <PageIntro eyebrow="Pedaqoji heyət" title="Müəllimlər" crumbs={[{ href: "/about", label: "Haqqımızda" }, { label: "Müəllimlər" }]}>
        <p className="flex items-start gap-2.5 text-[15px]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          Şəxsi əlaqə məlumatları ictimai saytda göstərilmir. Müəllimlə əlaqə üçün elektron jurnaldan və ya məktəb rəhbərliyindən istifadə edin.
        </p>
      </PageIntro>
      <div className="container-page py-10 md:py-12">
        {subjects.length > 0 && (
          <ChipRow label="Fənnə görə filtr" className="mb-8">
            <ChipLink href="/teachers" active={!fenn}>Hamısı</ChipLink>
            {subjects.map((s) => (
              <ChipLink key={s} href={`/teachers?fenn=${encodeURIComponent(s)}`} active={fenn === s}>{s}</ChipLink>
            ))}
          </ChipRow>
        )}
        {teachers.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teachers.map((t) => (
              <li key={t.id}>
                <Link href={`/teachers/${t.id}`} className="card card-link group flex h-full items-center gap-4 p-4 sm:p-5">
                  <Portrait name={`${t.first_name} ${t.last_name}`} url={t.avatar_url} alt="" className="size-16" textClass="text-lg" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug group-hover:text-primary">{t.first_name} {t.last_name}</p>
                    {t.subject && <p className="mt-0.5 text-sm font-medium text-primary">{t.subject}</p>}
                    {t.position_az && <p className="text-xs text-ink-3">{t.position_az}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Müəllim profili tapılmadı" icon={<GraduationCap />} />
        )}
      </div>
    </>
  );
}
