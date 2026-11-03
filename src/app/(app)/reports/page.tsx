import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { schoolSummary } from "@/server/stats";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/Feedback";
import { SubjectBars } from "@/components/charts/TrendChart";

export const metadata: Metadata = { title: "Hesabatlar" };

export default async function ReportsPage() {
  await requirePagePermission("reports.view", "/reports");
  const s = await schoolSummary();
  const maxWeek = Math.max(1, ...s.weekly.map((w) => w.total ? w.absent / w.total : 0));
  return (
    <div className="space-y-6">
      <PageHeader title="Məktəb hesabatları" description={s.year ? `${s.year.name} tədris ili · yalnız aqreqat göstəricilər` : "Aktiv tədris ili yoxdur"} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Şagird" value={s.counts.students} />
        <StatCard label="Müəllim" value={s.counts.teachers} tone="accent" />
        <StatCard label="Sinif" value={s.counts.classes} />
        <StatCard label="Aktiv hesab" value={s.counts.users} tone="accent" />
        <StatCard label="Orta qiymət" value={s.grades.avg?.toFixed(2).replace(".", ",") ?? "—"} tone="gold" hint={`${s.grades.count} qiymət`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Fənlər üzrə orta qiymət</h2>
          {s.bySubject.length ? <SubjectBars rows={s.bySubject.map((r) => ({ subject_name: r.subject_name, avg: r.avg, count: r.n }))} /> : <p className="text-sm text-ink-3">Məlumat yoxdur.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">Həftəlik buraxılış faizi</h2>
          <p className="mb-4 text-xs text-ink-3">Son 12 həftə · qeyd edilmiş dərslərdən buraxılanların payı</p>
          {s.weekly.length ? (
            <ul className="space-y-2">
              {s.weekly.map((w) => {
                const pct = w.total ? (w.absent / w.total) * 100 : 0;
                return (
                  <li key={w.wk} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                    <span className="tabular-nums text-ink-3">{formatDate(w.wk)}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true"><span className="block h-full rounded-full bg-danger" style={{ width: `${(pct / (maxWeek * 100)) * 100}%` }} /></span>
                    <span className="text-right tabular-nums">{pct.toFixed(1).replace(".", ",")}%</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-ink-3">Davamiyyət qeydi yoxdur.</p>}
        </Card>
      </div>
      <Card className="overflow-hidden">
        <h2 className="border-b border-line p-4 text-lg font-semibold">Siniflər üzrə ümumi göstəricilər</h2>
        {s.byClass.length ? (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th scope="col">Sinif</th><th scope="col" className="text-right">Orta qiymət</th><th scope="col" className="text-right">Qiymət sayı</th><th scope="col" className="text-right">Buraxılış (30 gün)</th><th scope="col"><span className="sr-only">Keçid</span></th></tr></thead>
              <tbody>
                {s.byClass.map((c) => (
                  <tr key={c.class_id}>
                    <td className="font-medium">{c.class_name}</td>
                    <td className="text-right tabular-nums">{c.avg?.toFixed(2).replace(".", ",") ?? "—"}</td>
                    <td className="text-right tabular-nums">{c.grades}</td>
                    <td className="text-right tabular-nums">{c.absences}</td>
                    <td className="text-right"><Link href={`/schedule?class=${c.class_id}`} className="text-sm text-primary hover:underline">Cədvəl</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Sinif yoxdur" />}
      </Card>
    </div>
  );
}
