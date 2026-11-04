import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { activeSchoolYear, ownStudentIds } from "@/server/access";
import { lessonsFor } from "@/server/schedule";
import { EmptyState, PageHeader } from "@/components/ui/Feedback";
import { WeekGrid } from "@/components/app/WeekGrid";

export const metadata: Metadata = { title: "Dərs cədvəli" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ class?: string; teacher?: string; subject?: string }> }) {
  const u = await requirePageUser("/schedule");
  const sp = await searchParams;
  const year = await activeSchoolYear();
  if (!year) return <><PageHeader title="Dərs cədvəli" /><EmptyState title="Aktiv tədris ili təyin edilməyib" /></>;
  const staff = Boolean(u.teacherId) || can(u, "schedule.view_all");

  if (!staff) {
    const ids = await ownStudentIds(u);
    if (!ids.length) notFound();
    const classes = await db.query<{ id: number; name: string }>("SELECT DISTINCT c.id, c.name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id IN (?) ORDER BY c.name", [ids]);
    const chosen = classes.find((c) => c.id === Number(sp.class)) ?? classes[0];
    if (!chosen) return <><PageHeader title="Dərs cədvəli" /><EmptyState title="Şagird sinfə təyin edilməyib" /></>;
    return (
      <div className="space-y-5">
        <PageHeader title="Dərs cədvəli" description={`${chosen.name} sinfi · ${year.name}`} />
        {classes.length > 1 && (
          <form className="flex gap-2"><select name="class" defaultValue={chosen.id} className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm" aria-label="Sinif">{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="h-10 rounded-md border border-line-strong px-3 text-sm">Göstər</button></form>
        )}
        <WeekGrid lessons={await lessonsFor({ classId: chosen.id })} mode="class" />
      </div>
    );
  }

  const [classes, teachers, subjects] = await Promise.all([
    db.query<{ id: number; name: string }>("SELECT id, name FROM classes WHERE school_year_id = ? ORDER BY grade_level, name", [year.id]),
    db.query<{ id: number; name: string }>("SELECT id, CONCAT(last_name, ' ', first_name) AS name FROM teachers WHERE deleted_at IS NULL AND is_active = 1 ORDER BY last_name"),
    db.query<{ id: number; name: string }>("SELECT id, name_az AS name FROM subjects ORDER BY name_az"),
  ]);
  const classId = Number(sp.class) || undefined;
  const subjectId = Number(sp.subject) || undefined;
  const teacherId = Number(sp.teacher) || (!classId && !subjectId ? u.teacherId ?? undefined : undefined);
  const lessons = classId || teacherId || subjectId ? await lessonsFor({ classId, teacherId, subjectId }) : [];
  const title = classId ? `${classes.find((c) => c.id === classId)?.name ?? ""} sinfi` : teacherId ? teachers.find((t) => t.id === teacherId)?.name : subjectId ? subjects.find((s) => s.id === subjectId)?.name : "Seçim edin";
  const sel = "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm sm:w-auto sm:min-w-40";
  return (
    <div className="space-y-5">
      <PageHeader title="Dərs cədvəli" description={`${title ?? ""} · ${year.name}`} />
      <form className="grid grid-cols-2 items-end gap-3 rounded-lg border border-line bg-surface p-4 sm:flex sm:flex-wrap" aria-label="Cədvəl filtri">
        <label className="min-w-0 text-sm"><span className="mb-1 block font-medium">Sinif</span><select name="class" defaultValue={classId ?? ""} className={sel}><option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="min-w-0 text-sm"><span className="mb-1 block font-medium">Müəllim</span><select name="teacher" defaultValue={sp.teacher ?? ""} className={sel}><option value="">—</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="min-w-0 text-sm"><span className="mb-1 block font-medium">Fənn</span><select name="subject" defaultValue={subjectId ?? ""} className={sel}><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">Göstər</button>
      </form>
      <WeekGrid lessons={lessons} mode={classId ? "class" : "teacher"} />
    </div>
  );
}
