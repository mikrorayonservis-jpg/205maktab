import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { canViewStudent, ownStudentIds } from "@/server/access";
import { GRADE_TYPES, listGrades, studentGradeSummary } from "@/server/grades";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/Feedback";
import { SubjectBars, TrendChart } from "@/components/charts/TrendChart";

export const metadata: Metadata = { title: "Qiymətlər" };

function tone(v: number) {
  return v >= 5 ? "success" : v === 4 ? "primary" : v === 3 ? "warning" : "danger";
}

export default async function GradesPage({ searchParams }: { searchParams: Promise<{ student?: string; subject?: string }> }) {
  const u = await requirePageUser("/grades");
  const sp = await searchParams;
  const mine = await ownStudentIds(u);
  if (!mine.length) redirect("/journal");

  const requested = Number(sp.student) || mine[0];
  if (!mine.includes(requested) || !(await canViewStudent(u, requested))) notFound();
  const kids = await db.query<{ id: number; first_name: string; last_name: string; class_name: string | null }>(
    "SELECT s.id, s.first_name, s.last_name, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id IN (?)",
    [mine]
  );
  const student = kids.find((k) => k.id === requested);
  const summary = await studentGradeSummary(requested).catch(() => null);
  const subjectId = Number(sp.subject) || undefined;
  const grades = await listGrades(u, { studentId: requested, subjectId, limit: 500 });

  return (
    <div className="space-y-6">
      <PageHeader title="Qiymətlər" description={student ? `${student.first_name} ${student.last_name}${student.class_name ? ` · ${student.class_name}` : ""}` : undefined} />
      {kids.length > 1 && (
        <nav aria-label="Uşaq seçimi" className="flex flex-wrap gap-2">
          {kids.map((k) => (
            <Link key={k.id} href={`/grades?student=${k.id}`} aria-current={k.id === requested ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5 text-sm", k.id === requested ? "border-primary bg-primary text-primary-ink" : "border-line hover:bg-surface-2")}>
              {k.first_name}
            </Link>
          ))}
        </nav>
      )}
      {!summary ? (
        <EmptyState title="Aktiv tədris ili təyin edilməyib" />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Fənlər üzrə orta qiymət</h2>
                <span className="text-sm text-ink-3">Ümumi: <strong className="text-ink">{summary.overall.avg?.toFixed(2).replace(".", ",") ?? "—"}</strong></span>
              </div>
              {summary.bySubject.length ? <SubjectBars rows={summary.bySubject} /> : <p className="text-sm text-ink-3">Qiymət yoxdur.</p>}
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold">İnkişaf qrafiki (aylıq orta)</h2>
              <TrendChart points={summary.byMonth} title="Aylıq orta qiymət dinamikası" />
            </Card>
          </div>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
              <h2 className="mr-auto text-lg font-semibold">Qiymət tarixçəsi</h2>
              <Link href={`/grades?student=${requested}`} className={cn("rounded-full border px-3 py-1 text-xs", !subjectId ? "border-primary bg-primary-soft text-primary" : "border-line")}>Bütün fənlər</Link>
              {summary.bySubject.map((s) => (
                <Link key={s.subject_id} href={`/grades?student=${requested}&subject=${s.subject_id}`} className={cn("rounded-full border px-3 py-1 text-xs", subjectId === s.subject_id ? "border-primary bg-primary-soft text-primary" : "border-line")}>{s.subject_name}</Link>
              ))}
            </div>
            {grades.length ? (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th scope="col">Tarix</th><th scope="col">Fənn</th><th scope="col">Qiymət</th><th scope="col">Növ</th><th scope="col">Müəllim</th><th scope="col">Qeyd</th></tr></thead>
                  <tbody>
                    {grades.map((g) => (
                      <tr key={g.id}>
                        <td className="whitespace-nowrap tabular-nums">{formatDate(g.date)}</td>
                        <td>{g.subject_name}</td>
                        <td><Badge tone={tone(g.grade_value)} className="w-8 justify-center text-sm">{g.grade_value}</Badge></td>
                        <td className="text-ink-2">{GRADE_TYPES[g.grade_type]}</td>
                        <td className="text-ink-2">{g.teacher_name}</td>
                        <td className="text-ink-3">{g.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm text-ink-3">Qiymət yoxdur.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
