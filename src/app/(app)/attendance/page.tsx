import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { addDays, formatDate, todayBaku } from "@/lib/format";
import { cn } from "@/lib/utils";
import { canViewStudent, ownStudentIds } from "@/server/access";
import { ATTENDANCE_STATUS, studentAttendance } from "@/server/attendance";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui/Feedback";
import { AttendanceClient } from "./AttendanceClient";

export const metadata: Metadata = { title: "Davamiyyət" };

const TONE = { present: "success", late: "warning", excused: "primary", unexcused: "danger" } as const;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const u = await requirePageUser("/attendance");
  const sp = await searchParams;
  const mine = await ownStudentIds(u);
  const staff = Boolean(u.teacherId) || can(u, "attendance.view_all") || can(u, "attendance.manage_all");
  if (!mine.length && !staff) notFound();

  if (mine.length && !staff) {
    const sid = Number(sp.student) || mine[0];
    if (!mine.includes(sid) || !(await canViewStudent(u, sid))) notFound();
    const kids = await db.query<{ id: number; first_name: string }>("SELECT id, first_name FROM students WHERE id IN (?)", [mine]);
    const to = todayBaku();
    const data = await studentAttendance(sid, addDays(to, -120), to);
    const absences = data.records.filter((r) => r.status !== "present");
    return (
      <div className="space-y-6">
        <PageHeader title="Davamiyyət" description="Son 120 gün" />
        {kids.length > 1 && (
          <nav aria-label="Uşaq seçimi" className="flex flex-wrap gap-2">
            {kids.map((k) => <Link key={k.id} href={`/attendance?student=${k.id}`} aria-current={k.id === sid ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5 text-sm", k.id === sid ? "border-primary bg-primary text-primary-ink" : "border-line")}>{k.first_name}</Link>)}
          </nav>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="İştirak" value={data.summary.present} tone="accent" />
          <StatCard label="Gecikmə" value={data.summary.late} tone="gold" />
          <StatCard label="Üzrlü buraxılış" value={data.summary.excused} />
          <StatCard label="Üzrsüz buraxılış" value={data.summary.unexcused} tone="danger" />
        </div>
        <Card className="overflow-hidden">
          <h2 className="border-b border-line p-4 text-lg font-semibold">Buraxılış və gecikmələr</h2>
          {absences.length ? (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th scope="col">Tarix</th><th scope="col">Dərs</th><th scope="col">Status</th><th scope="col">Qeyd</th></tr></thead>
                <tbody>
                  {absences.map((r, i) => (
                    <tr key={i}>
                      <td className="tabular-nums">{formatDate(r.date)}</td>
                      <td>{r.period ? `${r.period}-ci dərs${r.subject_name ? ` · ${r.subject_name}` : ""}` : "Gündəlik"}</td>
                      <td><Badge tone={TONE[r.status]}>{ATTENDANCE_STATUS[r.status]}</Badge></td>
                      <td className="text-ink-3">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-sm text-ink-3">Bu dövrdə buraxılış və ya gecikmə qeydə alınmayıb.</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Davamiyyət" description="Gündəlik davamiyyəti sinif rəhbəri, dərs üzrə davamiyyəti həmin dərsin müəllimi qeyd edir." />
      <AttendanceClient canBrowseAll={can(u, "attendance.view_all") || can(u, "attendance.manage_all")} />
    </div>
  );
}
